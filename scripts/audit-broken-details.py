#!/usr/bin/env python3
import json
import ssl
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
report = json.loads((ROOT / "scratch" / "audio-audit-report.json").read_text(encoding="utf-8"))
ctx = ssl.create_default_context()
UA = {"User-Agent": "ELGCC-Teachings-Audit/1.0"}

print("=== ALL BROKEN ===")
for b in sorted(report["broken"], key=lambda x: (x.get("year") or 0, x.get("series") or "", x.get("title") or "")):
    print(f"{b.get('status')} | {b.get('year')} | {b.get('id')}")
    print(f"  {b.get('title')}")
    print(f"  {b.get('audioUrl')}")
    if b.get("error"):
        print(f"  err: {b.get('error')}")

# What Church Retreat files exist?
meta = json.load(
    urllib.request.urlopen(
        urllib.request.Request("https://archive.org/metadata/elgcc-teachings-2021", headers=UA),
        context=ctx,
        timeout=90,
    )
)
files = [f["name"] for f in meta.get("files", []) if str(f.get("name", "")).lower().endswith((".mp3", ".m4a"))]
print("\n=== CHURCH RETREAT 2021 FILES ON ARCHIVE ===")
for name in sorted(f for f in files if "CHURCH RETREAT" in f.upper()):
    print(name)

print("\n=== APPRECIATION FILES ===")
for name in sorted(f for f in files if "APPRECIATION" in f.upper()):
    print(name)

print("\n=== EXCEEDING GREATNESS FILES ===")
for name in sorted(f for f in files if "EXCEEDING" in f.upper()):
    print(name)

print("\n=== FOLLOWING THE LEADING FILES (tracks present) ===")
for name in sorted(f for f in files if "FOLLOWING THE LEADING" in f.upper()):
    print(name)
