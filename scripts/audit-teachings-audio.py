#!/usr/bin/env python3
"""Audit sermon audio URLs against Archive.org."""

from __future__ import annotations

import concurrent.futures
import json
import ssl
import sys
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
SERMONS = ROOT / "content" / "teachings" / "sermons.json"
OUT = ROOT / "scratch" / "audio-audit-report.json"
UA = "ELGCC-Teachings-Audit/1.0"
CTX = ssl.create_default_context()


def request(method: str, url: str, timeout: int = 40):
    req = urllib.request.Request(url, method=method, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=CTX) as resp:
            return {
                "ok": True,
                "status": resp.status,
                "content_type": resp.headers.get("Content-Type"),
                "content_length": resp.headers.get("Content-Length"),
                "final_url": resp.geturl(),
            }
    except urllib.error.HTTPError as exc:
        return {
            "ok": False,
            "status": exc.code,
            "content_type": exc.headers.get("Content-Type") if exc.headers else None,
            "content_length": None,
            "final_url": url,
            "error": str(exc.reason),
        }
    except Exception as exc:  # noqa: BLE001
        return {
            "ok": False,
            "status": None,
            "content_type": None,
            "content_length": None,
            "final_url": url,
            "error": str(exc),
        }


def archive_item_from_url(audio_url: str) -> str:
    try:
        parts = [p for p in urlparse(audio_url).path.split("/") if p]
        idx = parts.index("download")
        return parts[idx + 1]
    except Exception:
        return ""


def archive_relpath(audio_url: str) -> str:
    try:
        parts = [p for p in urlparse(audio_url).path.split("/") if p]
        idx = parts.index("download")
        return unquote("/".join(parts[idx + 2 :]))
    except Exception:
        return ""


def fetch_item_files(item: str) -> set[str]:
    meta = request("GET", f"https://archive.org/metadata/{item}", timeout=90)
    if not meta.get("ok"):
        return set()
    raw = urllib.request.urlopen(
        urllib.request.Request(
            f"https://archive.org/metadata/{item}",
            headers={"User-Agent": UA},
        ),
        timeout=90,
        context=CTX,
    )
    data = json.load(raw)
    names = set()
    for f in data.get("files") or []:
        name = f.get("name") or ""
        if name.lower().endswith((".mp3", ".m4a")):
            names.add(name)
            names.add(name.replace("\\", "/"))
    return names


def probe_one(sermon: dict) -> dict:
    url = sermon.get("audioUrl", "")
    head = request("HEAD", url)
    # Some CDNs dislike HEAD; fall back to ranged GET
    if not head.get("ok") and head.get("status") in {400, 403, 405, None}:
        req = urllib.request.Request(
            url,
            method="GET",
            headers={"User-Agent": UA, "Range": "bytes=0-1"},
        )
        try:
            with urllib.request.urlopen(req, timeout=40, context=CTX) as resp:
                head = {
                    "ok": resp.status in {200, 206},
                    "status": resp.status,
                    "content_type": resp.headers.get("Content-Type"),
                    "content_length": resp.headers.get("Content-Length") or resp.headers.get("Content-Range"),
                    "final_url": resp.geturl(),
                }
        except urllib.error.HTTPError as exc:
            head = {
                "ok": False,
                "status": exc.code,
                "content_type": exc.headers.get("Content-Type") if exc.headers else None,
                "content_length": None,
                "final_url": url,
                "error": str(exc.reason),
            }
        except Exception as exc:  # noqa: BLE001
            head = {
                "ok": False,
                "status": None,
                "content_type": None,
                "content_length": None,
                "final_url": url,
                "error": str(exc),
            }

    return {
        "id": sermon.get("id"),
        "title": sermon.get("title"),
        "series": sermon.get("series"),
        "year": sermon.get("year"),
        "audioUrl": url,
        "archiveItem": archive_item_from_url(url) or sermon.get("archiveItem"),
        "relpath": archive_relpath(url),
        **head,
    }


def main():
    sermons = json.loads(SERMONS.read_text(encoding="utf-8"))
    year_filter = None
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        year_filter = int(sys.argv[1])
        sermons = [s for s in sermons if int(s.get("year", 0)) == year_filter]

    print(f"Auditing {len(sermons)} sermons" + (f" for year {year_filter}" if year_filter else ""))

    # Unique archive items
    items = sorted({archive_item_from_url(s.get("audioUrl", "")) or s.get("archiveItem", "") for s in sermons})
    items = [i for i in items if i]
    print(f"Fetching metadata for {len(items)} archive items...")
    item_files: dict[str, set[str]] = {}
    for item in items:
        files = fetch_item_files(item)
        item_files[item] = files
        print(f"  {item}: {len(files)} audio files")

    missing_in_metadata = []
    for s in sermons:
        item = archive_item_from_url(s.get("audioUrl", "")) or s.get("archiveItem", "")
        rel = archive_relpath(s.get("audioUrl", ""))
        files = item_files.get(item, set())
        if files and rel and rel not in files:
            # also try basename match
            base = Path(rel).name
            bases = {Path(f).name for f in files}
            if base not in bases:
                missing_in_metadata.append(
                    {
                        "id": s.get("id"),
                        "title": s.get("title"),
                        "year": s.get("year"),
                        "series": s.get("series"),
                        "audioUrl": s.get("audioUrl"),
                        "archiveItem": item,
                        "expectedPath": rel,
                    }
                )

    print(f"Missing from archive metadata: {len(missing_in_metadata)}")

    # Probe URLs — prioritize missing + known evangelism, then all in scope
    prioritize_ids = {
        "2021-jos-brethren-retreat-evangelism-1",
        "2021-jos-brethren-retreat-evangelism-2",
    }
    missing_ids = {m["id"] for m in missing_in_metadata}
    to_probe = [s for s in sermons if s.get("id") in prioritize_ids or s.get("id") in missing_ids]
    # Also probe all if filtered year or if total small; else also probe a sample of "ok metadata" for false negatives
    if year_filter or len(sermons) <= 400:
        to_probe = sermons
    else:
        # full catalog: probe all missing + every sermon (still do full probe with workers)
        to_probe = sermons

    print(f"Probing {len(to_probe)} audio URLs...")
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
        futures = {pool.submit(probe_one, s): s for s in to_probe}
        done = 0
        for fut in concurrent.futures.as_completed(futures):
            results.append(fut.result())
            done += 1
            if done % 50 == 0 or done == len(to_probe):
                print(f"  probed {done}/{len(to_probe)}")

    broken = [r for r in results if not r.get("ok")]
    ok = [r for r in results if r.get("ok")]

    by_status = Counter(str(r.get("status")) for r in broken)
    by_year = Counter(str(r.get("year")) for r in broken)
    by_item = Counter(str(r.get("archiveItem")) for r in broken)

    report = {
        "totalAudited": len(results),
        "okCount": len(ok),
        "brokenCount": len(broken),
        "missingInMetadataCount": len(missing_in_metadata),
        "brokenByStatus": dict(by_status),
        "brokenByYear": dict(by_year),
        "brokenByArchiveItem": dict(by_item),
        "missingInMetadata": missing_in_metadata,
        "broken": broken,
        "evangelism": [r for r in results if "evangelism" in str(r.get("id", "")).lower()],
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print("\n=== SUMMARY ===")
    print(f"OK: {len(ok)}")
    print(f"BROKEN: {len(broken)}")
    print(f"Missing in metadata: {len(missing_in_metadata)}")
    print("Broken by status:", dict(by_status))
    print("Broken by year:", dict(sorted(by_year.items())))
    print("Broken by archive item:", dict(by_item))
    print("\nEvangelism results:")
    for r in report["evangelism"]:
        print(f"  {r['id']}: ok={r.get('ok')} status={r.get('status')} err={r.get('error')}")
    print(f"\nReport written to {OUT}")


if __name__ == "__main__":
    main()
