import sys
import tempfile
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

    check(uploader.valid_year("2026") == 2026, "Valid year was rejected.")
    check(uploader.valid_year("2026x") is None, "Invalid year was accepted.")
    check(uploader.valid_year("1800") is None, "Out-of-range year was accepted.")

    with tempfile.TemporaryDirectory() as folder:
        first = Path(folder) / "New_Teaching.mp3"
        second = Path(folder) / "Copy.m4a"
        first.write_bytes(b"sample")
        second.write_bytes(b"sample")
        entries = [
            uploader.UploadEntry(first, "New Teaching", "Open Doors", 2026, uploader.DEFAULT_SPEAKER),
            uploader.UploadEntry(second, "New Teaching", "Open Doors", 2026, uploader.DEFAULT_SPEAKER),
        ]
        check(
            uploader.review_uploads(entries, []) == ["Ready", "Duplicate in batch"],
            "Preflight did not catch a duplicate title in the batch.",
        )
        entries[1].title = "Another Teaching"
        check(
            uploader.review_uploads(entries, []) == ["Ready", "Ready"],
            "Distinct files were incorrectly blocked.",
        )
        first.unlink()
        check(uploader.review_uploads(entries, [])[0] == "File missing", "Missing file was not detected.")
        first.write_bytes(b"sample")
        entries[0].series = ""
        check(uploader.review_uploads(entries, [])[0] == "Add series", "Missing series was not detected.")

        entries[0].series = "Open Doors"
        current = {
            "id": "2026-open-doors-new-teaching",
            "title": "New Teaching",
            "series": "Open Doors",
            "year": 2026,
            "audioUrl": "https://archive.org/download/elgcc-teachings-2026/New%20Teaching.mp3",
        }
        check(uploader.review_uploads(entries[:1], [current]) == ["Already on website"], "Existing teaching was not detected.")
        current["unavailable"] = True
        check(uploader.review_uploads(entries[:1], [current]) == ["Restore existing"], "Unavailable teaching was not recognized for restoration.")

    print("Teaching uploader checks passed.")


if __name__ == "__main__":
    run()
