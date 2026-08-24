#!/usr/bin/env python3
"""Fix broken teaching URLs and mark missing audio as unavailable."""

from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
SERMONS = ROOT / "content" / "teachings" / "sermons.json"

# Exact IDs whose Archive.org files exist under a slightly different name.
URL_FIXES = {
    "2021-9-exceeding-greatness-of-his-power-exceeding-greatness-of-his-power-track-1": (
        "9. EXCEEDING GREATNESS OF HIS POWER/EXCEEDING GREATNESS OF HIS POWER 1.mp3"
    ),
    "2021-9-exceeding-greatness-of-his-power-exceeding-greatness-of-his-power-track-2": (
        "9. EXCEEDING GREATNESS OF HIS POWER/EXCEEDING GREATNESS OF HIS POWER 2.mp3"
    ),
    "2021-9-exceeding-greatness-of-his-power-exceeding-greatness-of-his-power-track-3": (
        "9. EXCEEDING GREATNESS OF HIS POWER/EXCEEDING GREATNESS OF HIS POWER 3.mp3"
    ),
    "2021-9-exceeding-greatness-of-his-power-exceeding-greatness-of-his-power-track-4": (
        "9. EXCEEDING GREATNESS OF HIS POWER/EXCEEDING GREATNESS OF HIS POWER 4.mp3"
    ),
}

# Files confirmed missing on Archive.org (404). Keep catalog rows but hide from public site.
UNAVAILABLE_IDS = {
    "2021-7-following-the-leading-of-the-spirit-series-3-following-the-leading-of-the-spirit-series-3-track-15",
    "2021-8-appreciation-and-honour-appreciation-and-honour-track-3",
    "2021-8-appreciation-and-honour-appreciation-and-honour-track-4",
    "2021-8-appreciation-and-honour-appreciation-and-honour-track-5",
    "2021-9-exceeding-greatness-of-his-power-exceeding-greatness-of-his-power-track-5",
    "2021-9-exceeding-greatness-of-his-power-exceeding-greatness-of-his-power-track-6",
    "2021-church-retreat-2021-church-retreat-2021-laboring-in-prayers",
    "2021-church-retreat-2021-church-retreat-2021-maintaining-the-bond-of-unity",
    "2021-church-retreat-2021-church-retreat-2021-our-giving-1",
    "2021-church-retreat-2021-church-retreat-2021-our-giving-2",
    "2021-church-retreat-2021-church-retreat-2021-the-church-and-her-mission-1",
    "2021-church-retreat-2021-church-retreat-2021-the-church-and-her-mission-2",
    "2021-church-retreat-2021-church-retreat-2021-the-church-and-her-mission-3",
    "2021-church-retreat-2021-church-retreat-2021-the-church-and-her-mission-4-q-and-a",
    "2021-jos-brethren-retreat-christian-conduct-and-service",
    "2021-jos-brethren-retreat-christian-living-ep-1",
    "2021-jos-brethren-retreat-christian-living-ep-2",
    "2021-jos-brethren-retreat-christian-living-ep-3",
    "2021-jos-brethren-retreat-christian-living-ep-4",
    "2021-jos-brethren-retreat-evangelism-1",
    "2021-jos-brethren-retreat-evangelism-2",
}


def encode_archive_path(relpath: str) -> str:
    return "/".join(quote(part, safe="()'._-~") for part in relpath.split("/"))


def main() -> None:
    sermons = json.loads(SERMONS.read_text(encoding="utf-8"))
    fixed = 0
    marked = 0
    seen_fix = set()
    seen_unavailable = set()

    for sermon in sermons:
        sermon_id = sermon.get("id")
        if sermon_id in URL_FIXES:
            relpath = URL_FIXES[sermon_id]
            item = sermon.get("archiveItem") or "elgcc-teachings-2021"
            sermon["audioUrl"] = f"https://archive.org/download/{item}/{encode_archive_path(relpath)}"
            sermon.pop("unavailable", None)
            sermon.pop("unavailableReason", None)
            fixed += 1
            seen_fix.add(sermon_id)
            continue

        if sermon_id in UNAVAILABLE_IDS:
            sermon["unavailable"] = True
            sermon["unavailableReason"] = "Audio file missing on Archive.org (404)"
            marked += 1
            seen_unavailable.add(sermon_id)

    missing_fixes = set(URL_FIXES) - seen_fix
    missing_marks = UNAVAILABLE_IDS - seen_unavailable
    if missing_fixes or missing_marks:
        raise SystemExit(f"IDs not found. fixes={missing_fixes} marks={missing_marks}")

    SERMONS.write_text(json.dumps(sermons, indent=2) + "\n", encoding="utf-8")
    print(f"Fixed URLs: {fixed}")
    print(f"Marked unavailable: {marked}")
    print(f"Wrote {SERMONS}")


if __name__ == "__main__":
    main()
