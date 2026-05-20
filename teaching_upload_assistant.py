import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from tkinter import BOTH, END, LEFT, RIGHT, VERTICAL, W, X, Button, Checkbutton, Entry, Frame, Label, StringVar, Tk, Toplevel, filedialog, messagebox
from tkinter import ttk
from urllib.parse import quote, unquote, urlparse


ROOT = Path(__file__).resolve().parent
SERMONS_FILE = ROOT / "content" / "teachings" / "sermons.json"
VALIDATE_SCRIPT = ROOT / "scripts" / "validate-teachings.js"
DEFAULT_SPEAKER = "Stephen Tijesuni Oyagbile"
ARCHIVE_CREATOR = "Eternal Life Global Community Church"
ARCHIVE_COLLECTION = "opensource_audio"
ALLOWED_EXTENSIONS = {".mp3", ".m4a"}


def normalize_text(value):
    return " ".join(str(value or "").strip().split())


def slugify(value):
    cleaned = normalize_text(value).lower().replace("&", " and ")
    chars = []
    last_dash = False
    for char in cleaned:
        if char.isalnum():
            chars.append(char)
            last_dash = False
        elif not last_dash:
            chars.append("-")
            last_dash = True
    return "".join(chars).strip("-")[:90] or "sermon"


def build_sermon_id(year, series, title):
    return f"{year}-{slugify(series)}-{slugify(title)}"


def unique_sermon_id(existing, year, series, title):
    base_id = build_sermon_id(year, series, title)
    existing_ids = {normalize_text(sermon.get("id")).lower() for sermon in existing}
    if base_id.lower() not in existing_ids:
        return base_id

    counter = 2
    while f"{base_id}-{counter}".lower() in existing_ids:
        counter += 1
    return f"{base_id}-{counter}"


def archive_item_for_year(year):
    return f"elgcc-teachings-{year}"


def archive_description(year, speaker):
    return f"Sermon recordings from ELGCC for the year {year}. Speaker: {speaker}"


def title_from_path(path):
    title = Path(path).stem.replace("_", " ").replace("-", " - ")
    return normalize_text(title)


def safe_file_name(title, suffix):
    allowed = []
    for char in normalize_text(title):
        if char.isalnum() or char in " .,'()&-":
            allowed.append(char)
        else:
            allowed.append(" ")
    name = normalize_text("".join(allowed)).strip(" .")
    return f"{name or 'sermon'}{suffix.lower()}"


def archive_file_name(audio_url):
    try:
        parsed = urlparse(audio_url)
        parts = [part for part in parsed.path.split("/") if part]
        download_index = parts.index("download")
        if len(parts) <= download_index + 2:
            return ""
        return unquote("/".join(parts[download_index + 2:])).lower()
    except Exception:
        return ""


def load_sermons():
    if not SERMONS_FILE.exists():
        return []
    return json.loads(SERMONS_FILE.read_text(encoding="utf-8"))


def available_series_from_sermons(sermons):
    series_by_key = {}
    for sermon in sermons:
        series = normalize_text(sermon.get("series"))
        if not series:
            continue

        try:
            year = int(sermon.get("year", 0))
        except (TypeError, ValueError):
            year = 0

        key = series.lower()
        current = series_by_key.get(key)
        if not current or year > current[1]:
            series_by_key[key] = (series, year)

    return [
        series
        for series, _year in sorted(
            series_by_key.values(),
            key=lambda item: (-item[1], item[0].lower()),
        )
    ]


def load_existing_series():
    return available_series_from_sermons(load_sermons())


def write_sermons(sermons):
    SERMONS_FILE.write_text(json.dumps(sermons, indent=2) + "\n", encoding="utf-8")


def is_duplicate(existing, draft):
    draft_title = normalize_text(draft["title"]).lower()
    draft_series = normalize_text(draft["series"]).lower()
    draft_audio_url = normalize_text(draft["audioUrl"]).lower()
    draft_archive_file = archive_file_name(draft["audioUrl"])

    for sermon in existing:
        same_audio = normalize_text(sermon.get("audioUrl")).lower() == draft_audio_url
        same_teaching = (
            int(sermon.get("year", 0)) == int(draft["year"])
            and normalize_text(sermon.get("series")).lower() == draft_series
            and normalize_text(sermon.get("title")).lower() == draft_title
        )
        same_archive_file = draft_archive_file and archive_file_name(sermon.get("audioUrl", "")) == draft_archive_file
        if same_audio or same_teaching or same_archive_file:
            return True
    return False


@dataclass
class UploadEntry:
    path: Path
    title: str
    series: str
    year: int
    speaker: str
    status: str = "Ready"


class TeachingUploadAssistant:
    def __init__(self, root):
        self.root = root
        self.root.title("ELGCC Teaching Upload Assistant")
        self.root.geometry("1120x720")
        self.entries = []
        self.series_var = StringVar(value="")
        self.year_var = StringVar(value=str(datetime.now().year))
        self.speaker_var = StringVar(value=DEFAULT_SPEAKER)
        self.password_var = StringVar(value="")
        self.allow_push_var = StringVar(value="0")
        self.status_var = StringVar(value="Choose audio files to begin.")
        self.series_options = load_existing_series()
        self.uploading = False

        self.expected_password = os.environ.get("TEACHING_UPLOADER_PASSWORD", "")
        self.allow_push = os.environ.get("TEACHING_UPLOADER_ALLOW_PUSH", "") == "1"

        self.build_ui()

    def build_ui(self):
        shell = Frame(self.root, padx=18, pady=18)
        shell.pack(fill=BOTH, expand=True)

        Label(shell, text="ELGCC Teaching Upload Assistant", font=("Segoe UI", 18, "bold")).pack(anchor=W)
        Label(
            shell,
            text="Select teachings, set the year/series/speaker once, review titles, then upload and update the website data.",
            fg="#444",
        ).pack(anchor=W, pady=(4, 14))

        top = Frame(shell)
        top.pack(fill=X, pady=(0, 12))

        Label(top, text="Year").grid(row=0, column=0, sticky=W)
        Entry(top, textvariable=self.year_var, width=10).grid(row=1, column=0, sticky=W, padx=(0, 12))

        Label(top, text="Series").grid(row=0, column=1, sticky=W)
        self.series_combo = ttk.Combobox(top, textvariable=self.series_var, values=self.series_options, width=40)
        self.series_combo.grid(row=1, column=1, sticky=W, padx=(0, 12))
        self.series_combo.bind("<Button-1>", lambda _event: self.refresh_series_options(silent=True))

        Label(top, text="Speaker").grid(row=0, column=2, sticky=W)
        Entry(top, textvariable=self.speaker_var, width=34).grid(row=1, column=2, sticky=W, padx=(0, 12))

        if self.expected_password:
            Label(top, text="Uploader password").grid(row=0, column=3, sticky=W)
            Entry(top, textvariable=self.password_var, show="*", width=22).grid(row=1, column=3, sticky=W)

        actions = Frame(shell)
        actions.pack(fill=X, pady=(0, 12))
        Button(actions, text="Choose Files", command=self.choose_files).pack(side=LEFT, padx=(0, 8))
        Button(actions, text="Choose Folder", command=self.choose_folder).pack(side=LEFT, padx=(0, 8))
        Button(actions, text="Apply Defaults to All", command=self.apply_defaults).pack(side=LEFT, padx=(0, 8))
        Button(actions, text="Edit Selected", command=self.edit_selected).pack(side=LEFT, padx=(0, 8))
        Button(actions, text="Remove Selected", command=self.remove_selected).pack(side=LEFT, padx=(0, 8))
        Button(actions, text="Clear", command=self.clear_entries).pack(side=LEFT, padx=(0, 8))
        Button(actions, text="Refresh Series", command=self.refresh_series_options).pack(side=LEFT, padx=(0, 8))

        if self.allow_push:
            Checkbutton(actions, text="Commit and push after validation", variable=self.allow_push_var, onvalue="1", offvalue="0").pack(side=RIGHT)

        table_frame = Frame(shell)
        table_frame.pack(fill=BOTH, expand=True)

        columns = ("file", "title", "series", "year", "speaker", "status")
        self.table = ttk.Treeview(table_frame, columns=columns, show="headings", selectmode="extended")
        for column, width in [
            ("file", 250),
            ("title", 270),
            ("series", 190),
            ("year", 70),
            ("speaker", 190),
            ("status", 120),
        ]:
            self.table.heading(column, text=column.title())
            self.table.column(column, width=width, anchor=W)
        scrollbar = ttk.Scrollbar(table_frame, orient=VERTICAL, command=self.table.yview)
        self.table.configure(yscrollcommand=scrollbar.set)
        self.table.pack(side=LEFT, fill=BOTH, expand=True)
        scrollbar.pack(side=RIGHT, fill="y")

        bottom = Frame(shell)
        bottom.pack(fill=X, pady=(12, 0))
        self.status_label = Label(bottom, textvariable=self.status_var, anchor=W, fg="#333")
        self.status_label.pack(side=LEFT, fill=X, expand=True)
        Button(bottom, text="Validate Data", command=self.validate_data).pack(side=RIGHT, padx=(8, 0))
        Button(bottom, text="Upload and Update Website", command=self.start_upload).pack(side=RIGHT)

    def refresh_series_options(self, silent=False):
        self.series_options = load_existing_series()
        if hasattr(self, "series_combo"):
            self.series_combo.configure(values=self.series_options)
        if not silent:
            self.status_var.set(f"Loaded {len(self.series_options)} website series.")

    def choose_files(self):
        paths = filedialog.askopenfilenames(
            title="Choose teaching audio files",
            filetypes=[("Audio files", "*.mp3 *.m4a"), ("All files", "*.*")],
        )
        self.add_paths([Path(path) for path in paths])

    def choose_folder(self):
        folder = filedialog.askdirectory(title="Choose a folder of teaching audio files")
        if not folder:
            return
        paths = sorted(path for path in Path(folder).iterdir() if path.suffix.lower() in ALLOWED_EXTENSIONS)
        self.add_paths(paths)

    def add_paths(self, paths):
        try:
            year = int(self.year_var.get())
        except ValueError:
            messagebox.showerror("Invalid year", "Enter a valid four-digit year before adding files.")
            return

        series = normalize_text(self.series_var.get())
        speaker = normalize_text(self.speaker_var.get()) or DEFAULT_SPEAKER
        added = 0
        current_paths = {entry.path.resolve() for entry in self.entries}

        for path in paths:
            if path.suffix.lower() not in ALLOWED_EXTENSIONS or path.resolve() in current_paths:
                continue
            self.entries.append(UploadEntry(path=path, title=title_from_path(path), series=series, year=year, speaker=speaker))
            current_paths.add(path.resolve())
            added += 1

        self.refresh_table()
        self.status_var.set(f"Added {added} audio file(s).")

    def apply_defaults(self):
        try:
            year = int(self.year_var.get())
        except ValueError:
            messagebox.showerror("Invalid year", "Enter a valid four-digit year.")
            return

        series = normalize_text(self.series_var.get())
        speaker = normalize_text(self.speaker_var.get()) or DEFAULT_SPEAKER

        for entry in self.entries:
            entry.year = year
            entry.series = series
            entry.speaker = speaker

        self.refresh_table()
        self.status_var.set("Batch defaults applied to all files.")

    def edit_selected(self):
        selected = self.table.selection()
        if not selected:
            messagebox.showinfo("No selection", "Select one teaching to edit.")
            return
        index = int(selected[0])
        entry = self.entries[index]

        dialog = Toplevel(self.root)
        dialog.title("Edit Teaching")
        dialog.geometry("520x260")
        dialog.transient(self.root)
        dialog.grab_set()

        title_var = StringVar(value=entry.title)
        series_var = StringVar(value=entry.series)
        year_var = StringVar(value=str(entry.year))
        speaker_var = StringVar(value=entry.speaker)

        form = Frame(dialog, padx=16, pady=16)
        form.pack(fill=BOTH, expand=True)

        for row, (label, var) in enumerate([
            ("Title", title_var),
            ("Series", series_var),
            ("Year", year_var),
            ("Speaker", speaker_var),
        ]):
            Label(form, text=label).grid(row=row, column=0, sticky=W, pady=6)
            if label == "Series":
                ttk.Combobox(form, textvariable=var, values=self.series_options, width=52).grid(row=row, column=1, sticky=W, pady=6)
            else:
                Entry(form, textvariable=var, width=54).grid(row=row, column=1, sticky=W, pady=6)

        def save():
            try:
                entry.year = int(year_var.get())
            except ValueError:
                messagebox.showerror("Invalid year", "Enter a valid four-digit year.")
                return
            entry.title = normalize_text(title_var.get())
            entry.series = normalize_text(series_var.get())
            entry.speaker = normalize_text(speaker_var.get()) or DEFAULT_SPEAKER
            self.refresh_table()
            dialog.destroy()

        Button(form, text="Save", command=save).grid(row=4, column=1, sticky=W, pady=(12, 0))

    def remove_selected(self):
        selected = sorted((int(item) for item in self.table.selection()), reverse=True)
        for index in selected:
            del self.entries[index]
        self.refresh_table()
        self.status_var.set(f"Removed {len(selected)} file(s).")

    def clear_entries(self):
        self.entries = []
        self.refresh_table()
        self.status_var.set("Cleared.")

    def refresh_table(self):
        self.table.delete(*self.table.get_children())
        for index, entry in enumerate(self.entries):
            self.table.insert(
                "",
                END,
                iid=str(index),
                values=(entry.path.name, entry.title, entry.series, entry.year, entry.speaker, entry.status),
            )

    def validate_form(self):
        if self.expected_password and self.password_var.get() != self.expected_password:
            messagebox.showerror("Locked", "The uploader password is not correct.")
            return False
        if not self.entries:
            messagebox.showerror("No files", "Choose at least one .mp3 or .m4a file.")
            return False
        for entry in self.entries:
            if not normalize_text(entry.title) or not normalize_text(entry.series):
                messagebox.showerror("Missing details", "Every teaching needs a title and series.")
                return False
            if entry.year < 1900 or entry.year > 2200:
                messagebox.showerror("Invalid year", "Every teaching needs a valid four-digit year.")
                return False
        return True

    def validate_data(self):
        try:
            result = subprocess.run(
                ["node", str(VALIDATE_SCRIPT)],
                cwd=str(ROOT),
                capture_output=True,
                text=True,
                check=False,
            )
        except FileNotFoundError:
            messagebox.showerror("Node missing", "Node.js is required to validate the website data.")
            return False

        output = (result.stdout + "\n" + result.stderr).strip()
        if result.returncode != 0:
            messagebox.showerror("Validation failed", output or "Teaching data failed validation.")
            return False
        messagebox.showinfo("Validation complete", output or "Teaching data is valid.")
        return True

    def start_upload(self):
        if self.uploading:
            return
        if not self.validate_form():
            return
        self.uploading = True
        threading.Thread(target=self.upload_entries, daemon=True).start()

    def set_status(self, text):
        self.root.after(0, lambda: self.status_var.set(text))

    def set_entry_status(self, index, status):
        def update():
            self.entries[index].status = status
            self.refresh_table()
        self.root.after(0, update)

    def upload_entries(self):
        try:
            existing = load_sermons()
            drafts = []
            used_names = set()

            with tempfile.TemporaryDirectory(prefix="elgcc-teachings-") as temp_dir:
                stage = Path(temp_dir)

                for index, entry in enumerate(self.entries):
                    self.set_entry_status(index, "Preparing")
                    clean_name = safe_file_name(entry.title, entry.path.suffix)
                    base = Path(clean_name).stem
                    suffix = Path(clean_name).suffix
                    counter = 2
                    while clean_name.lower() in used_names:
                        clean_name = f"{base} {counter}{suffix}"
                        counter += 1
                    used_names.add(clean_name.lower())

                    staged_path = stage / clean_name
                    shutil.copy2(entry.path, staged_path)
                    item = archive_item_for_year(entry.year)
                    audio_url = f"https://archive.org/download/{item}/{quote(clean_name)}"
                    draft = {
                        "id": unique_sermon_id(existing + drafts, entry.year, entry.series, entry.title),
                        "title": normalize_text(entry.title),
                        "audioUrl": audio_url,
                        "series": normalize_text(entry.series),
                        "year": int(entry.year),
                        "speaker": normalize_text(entry.speaker) or DEFAULT_SPEAKER,
                        "archiveItem": item,
                        "uploadedAt": datetime.now(timezone.utc).isoformat(),
                    }

                    if is_duplicate(existing + drafts, draft):
                        raise RuntimeError(f"Duplicate blocked: {entry.title}")

                    self.set_entry_status(index, "Uploading")
                    self.run_archive_upload(stage, item, clean_name, draft["year"], draft["speaker"])
                    drafts.append(draft)
                    self.set_entry_status(index, "Uploaded")

            wrote_data = False
            if drafts:
                self.set_status("Updating website teaching data...")
                write_sermons(existing + drafts)
                self.root.after(0, lambda: self.refresh_series_options(silent=True))
                wrote_data = True

            self.set_status("Checking website teaching data...")
            try:
                self.run_validation_or_raise()
            except Exception:
                if wrote_data:
                    write_sermons(existing)
                raise

            if self.allow_push and self.allow_push_var.get() == "1":
                self.set_status("Publishing with git...")
                self.git_publish()
                final_message = "Upload complete. Website data was committed and pushed."
            else:
                final_message = "Upload complete. Website data is ready for owner publish."

            self.set_status(final_message)
            self.root.after(0, lambda: messagebox.showinfo("Done", final_message))
        except Exception as error:
            error_message = str(error)
            self.set_status(f"Stopped: {error_message}")
            self.root.after(0, lambda: messagebox.showerror("Upload stopped", error_message))
        finally:
            self.uploading = False

    def run_archive_upload(self, cwd, item, file_name, year, speaker):
        command = [
            sys.executable,
            "-c",
            "from internetarchive.cli.ia import main; main()",
            "upload",
            item,
            file_name,
            "--metadata=mediatype:audio",
            f"--metadata=collection:{ARCHIVE_COLLECTION}",
            f"--metadata=creator:{ARCHIVE_CREATOR}",
            f"--metadata=description:{archive_description(year, speaker)}",
        ]
        result = subprocess.run(command, cwd=str(cwd), capture_output=True, text=True, check=False)
        if result.returncode != 0:
            details = (result.stderr or result.stdout or "Archive.org upload failed.").strip()
            raise RuntimeError(details)

    def run_validation_or_raise(self):
        result = subprocess.run(
            ["node", str(VALIDATE_SCRIPT)],
            cwd=str(ROOT),
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            raise RuntimeError((result.stderr or result.stdout or "Teaching data validation failed.").strip())

    def git_publish(self):
        for command in [
            ["git", "add", "content/teachings/sermons.json"],
            ["git", "commit", "-m", "Add teaching uploads"],
            ["git", "push"],
        ]:
            result = subprocess.run(command, cwd=str(ROOT), capture_output=True, text=True, check=False)
            if result.returncode != 0:
                raise RuntimeError((result.stderr or result.stdout or f"Command failed: {' '.join(command)}").strip())


if __name__ == "__main__":
    app_root = Tk()
    TeachingUploadAssistant(app_root)
    app_root.mainloop()
