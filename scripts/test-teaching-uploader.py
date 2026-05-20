import sys
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import teaching_upload_assistant as uploader


def check(condition, message):
    if not condition:
        raise AssertionError(message)


def run():
    check(
        uploader.title_from_path(Path("Believers_Authority-Track 4.mp3")) == "Believers Authority - Track 4",
        "Filename title cleanup failed.",
    )

    clean_name = uploader.safe_file_name("Believers Authority: Track 4?", ".mp3")
    check(clean_name == "Believers Authority Track 4.mp3", "Clean Archive filename failed.")

    existing = [
        {
            "id": "2026-believers-authority-believers-authority-track-4",
            "title": "Believers Authority - Track 4",
            "audioUrl": "https://archive.org/download/elgcc-teachings-2026/Believers%20Authority-%20Track%204.mp3",
            "series": "Believers Authority",
            "year": 2026,
        }
    ]
    duplicate = {
        "title": "Believers Authority - Track 4",
        "audioUrl": "https://archive.org/download/elgcc-teachings-2026/Believers%20Authority%20Track%204.mp3",
        "series": "Believers Authority",
        "year": 2026,
    }
    check(uploader.is_duplicate(existing, duplicate), "Duplicate teaching detection failed.")

    unique_id = uploader.unique_sermon_id(existing, 2026, "Believers Authority", "Believers Authority Track 4")
    check(unique_id.endswith("-2"), "Unique ID suffixing failed.")

    series_options = uploader.available_series_from_sermons(
        [
            {"series": " General Teachings ", "year": 2018},
            {"series": "Open Doors", "year": 2025},
            {"series": "Open Doors", "year": 2026},
            {"series": "Believers Authority", "year": 2026},
            {"series": "", "year": 2026},
        ]
    )
    check(
        series_options == ["Believers Authority", "Open Doors", "General Teachings"],
        "Existing series dropdown options failed.",
    )

    print("Teaching uploader checks passed.")


if __name__ == "__main__":
    run()
