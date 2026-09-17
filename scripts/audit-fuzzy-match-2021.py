#!/usr/bin/env python3
import json
import re
import ssl
import urllib.request
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
report = json.loads((ROOT / "scratch" / "audio-audit-report.json").read_text(encoding="utf-8"))
ctx = ssl.create_default_context()
UA = {"User-Agent": "ELGCC-Teachings-Audit/1.0"}

print("BROKEN count", report["brokenCount"])
for b in report["broken"]:
    print(f"{b['year']} | {b['series']} | {b['title']}")
    print("  expected:", b["relpath"])

meta = json.load(
    urllib.request.urlopen(
        urllib.request.Request("https://archive.org/metadata/elgcc-teachings-2021", headers=UA),
        context=ctx,
        timeout=90,
    )
)
files = [
    f["name"]
    for f in meta.get("files", [])
    if str(f.get("name", "")).lower().endswith((".mp3", ".m4a"))
]
print("\narchive audio files", len(files))


def tokens(s: str):
    return set(re.findall(r"[a-z0-9]+", s.lower()))


print("\n=== FUZZY MATCHES ===")
for b in report["broken"]:
    exp = b["relpath"]
    et = tokens(PurePosixPath(exp).stem)
    best = []
    for f in files:
        ft = tokens(PurePosixPath(f).stem)
        score = len(et & ft) / max(len(et), 1)
        if score >= 0.45:
            best.append((score, f))
    best = sorted(best, reverse=True)[:6]
    print("\nBROKEN:", b["title"])
    print("  expect:", exp)
    if best:
        for score, name in best:
            print(f"  candidate {score:.2f}: {name}")
    else:
        print("  NO close filename match in archive item")

# Show all JOS BRETHREN RETREAT files
print("\n=== ALL JOS BRETHREN RETREAT FILES ON ARCHIVE ===")
for name in sorted(f for f in files if "JOS" in f.upper()):
    print(name)
