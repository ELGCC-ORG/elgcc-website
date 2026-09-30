import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from tkinter import BOTH, END, LEFT, RIGHT, VERTICAL, W, X, DoubleVar, StringVar, Tk, Toplevel, filedialog, messagebox
from tkinter import ttk
from urllib.parse import quote, unquote, urlparse


ROOT = Path(__file__).resolve().parent
SERMONS_FILE = ROOT / "content" / "teachings" / "sermons.json"
VALIDATE_SCRIPT = ROOT / "scripts" / "validate-teachings.js"
DEFAULT_SPEAKER = "Stephen Tijesuni Oyagbile"
ARCHIVE_CREATOR = "Eternal Life Global Community Church"
ARCHIVE_COLLECTION = "opensource_audio"
ALLOWED_EXTENSIONS = {".mp3", ".m4a"}
BRAND_GREEN = "#6B7F4C"
BRAND_GOLD = "#D1A129"
BACKGROUND = "#F3F5F0"
TEXT = "#232722"
MUTED = "#697268"


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


def is_duplicate(existing, draft, allow_unavailable_revive=False):
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
            if allow_unavailable_revive and sermon.get("unavailable") and same_teaching:
                continue
            return True
    return False


def find_unavailable_match(existing, draft):
    draft_title = normalize_text(draft["title"]).lower()
    draft_series = normalize_text(draft["series"]).lower()
    for sermon in existing:
        if not sermon.get("unavailable"):
            continue
        same_teaching = (
            int(sermon.get("year", 0)) == int(draft["year"])
            and normalize_text(sermon.get("series")).lower() == draft_series
            and normalize_text(sermon.get("title")).lower() == draft_title
        )
        if same_teaching:
            return sermon
    return None


def valid_year(value):
    try:
        year = int(value)
    except (TypeError, ValueError):
        return None
    return year if 1900 <= year <= 2200 else None


@dataclass
class UploadEntry:
    path: Path
    title: str
    series: str
    year: int
    speaker: str
    status: str = "Ready"
    overrides: set = field(default_factory=set)


def review_uploads(entries, existing):
    statuses = []
    planned = []
    used_names = set()

    for entry in entries:
        if not entry.path.is_file():
            statuses.append("File missing")
            continue
        if entry.path.suffix.lower() not in ALLOWED_EXTENSIONS:
            statuses.append("Unsupported file")
            continue
        if valid_year(entry.year) is None:
            statuses.append("Check year")
            continue
        if not normalize_text(entry.title):
            statuses.append("Add title")
            continue
        if not normalize_text(entry.series):
            statuses.append("Add series")
            continue

        clean_name = safe_file_name(entry.title, entry.path.suffix)
        base, suffix = Path(clean_name).stem, Path(clean_name).suffix
        counter = 2
        while clean_name.lower() in used_names:
            clean_name = f"{base} {counter}{suffix}"
            counter += 1

        item = archive_item_for_year(entry.year)
        draft = {
            "title": normalize_text(entry.title),
            "series": normalize_text(entry.series),
            "year": entry.year,
            "audioUrl": f"https://archive.org/download/{item}/{quote(clean_name)}",
        }
        if is_duplicate(planned, draft):
            statuses.append("Duplicate in batch")
        elif is_duplicate(existing, draft, allow_unavailable_revive=True):
            statuses.append("Already on website")
        else:
            statuses.append("Restore existing" if find_unavailable_match(existing, draft) else "Ready")
            planned.append(draft)
            used_names.add(clean_name.lower())

    return statuses


class TeachingUploadAssistant:
    def __init__(self, root):
        self.root = root
        self.root.title("ELGCC Teaching Upload Assistant")
        self.root.geometry("1220x790")
        self.root.minsize(980, 650)
        self.entries = []
        self.series_var = StringVar(value="")
        self.year_var = StringVar(value=str(datetime.now().year))
        self.speaker_var = StringVar(value=DEFAULT_SPEAKER)
        self.password_var = StringVar(value="")
        self.allow_push_var = StringVar(value="0")
        self.search_var = StringVar(value="")
        self.summary_var = StringVar(value="No audio files selected")
        self.status_var = StringVar(value="Choose files or a folder to begin.")
        self.stage_var = StringVar(value="Ready")
        self.progress_var = DoubleVar(value=0)
        self.existing_sermons = load_sermons()
        self.series_options = available_series_from_sermons(self.existing_sermons)
        self.uploading = False
        self.mutable_widgets = []

        self.expected_password = os.environ.get("TEACHING_UPLOADER_PASSWORD", "")
        self.allow_push = os.environ.get("TEACHING_UPLOADER_ALLOW_PUSH", "") == "1"

        self.build_ui()
        self.root.protocol("WM_DELETE_WINDOW", self.close_window)
        for variable in (self.year_var, self.series_var, self.speaker_var):
            variable.trace_add("write", self.on_batch_change)
        self.search_var.trace_add("write", lambda *_args: self.refresh_table())
        self.refresh_review()

    def build_ui(self):
        self.root.configure(bg=BACKGROUND)
        style = ttk.Style(self.root)
        if "clam" in style.theme_names():
            style.theme_use("clam")
        style.configure("App.TFrame", background=BACKGROUND)
        style.configure("Panel.TFrame", background="#FFFFFF")
        style.configure("Brand.TFrame", background=BRAND_GREEN)
        style.configure("Gold.TFrame", background=BRAND_GOLD)
        style.configure("BrandTitle.TLabel", background=BRAND_GREEN, foreground="#FFFFFF", font=("Segoe UI", 19, "bold"))
        style.configure("BrandSub.TLabel", background=BRAND_GREEN, foreground="#EFF4E9", font=("Segoe UI", 10))
        style.configure("Step.TLabel", background="#FFFFFF", foreground=TEXT, font=("Segoe UI", 12, "bold"))
        style.configure("Field.TLabel", background="#FFFFFF", foreground=TEXT, font=("Segoe UI", 9, "bold"))
        style.configure("Hint.TLabel", background="#FFFFFF", foreground=MUTED, font=("Segoe UI", 9))
        style.configure("Summary.TLabel", background="#FFFFFF", foreground=BRAND_GREEN, font=("Segoe UI", 10, "bold"))
        style.configure("Status.TLabel", background="#FFFFFF", foreground=TEXT, font=("Segoe UI", 10))
        style.configure("Primary.TButton", background=BRAND_GREEN, foreground="#FFFFFF", font=("Segoe UI", 10, "bold"), padding=(16, 9), borderwidth=0)
        style.map("Primary.TButton", background=[("active", "#53663B"), ("disabled", "#AAB7A0")], foreground=[("disabled", "#F4F6F1")])
        style.configure("Secondary.TButton", background="#E8EDE1", foreground=TEXT, font=("Segoe UI", 9), padding=(11, 7), borderwidth=0)
        style.map("Secondary.TButton", background=[("active", "#D9E3D0")])
        style.configure("Plain.TButton", background="#FFFFFF", foreground=TEXT, font=("Segoe UI", 9), padding=(9, 7), borderwidth=0)
        style.map("Plain.TButton", background=[("active", "#F0F3EA")])
        style.configure("Panel.TCheckbutton", background="#FFFFFF", foreground=TEXT, font=("Segoe UI", 9))
        style.configure("Treeview", background="#FFFFFF", fieldbackground="#FFFFFF", foreground=TEXT, rowheight=31, font=("Segoe UI", 9), borderwidth=0)
        style.configure("Treeview.Heading", background="#E9EEE2", foreground=TEXT, font=("Segoe UI", 9, "bold"), padding=(8, 7), borderwidth=0)
        style.map("Treeview", background=[("selected", "#E2ECD7")], foreground=[("selected", TEXT)])
        style.configure("Upload.Horizontal.TProgressbar", troughcolor="#E6ECE0", background=BRAND_GOLD, borderwidth=0)

        shell = ttk.Frame(self.root, style="App.TFrame", padding=16)
        shell.pack(fill=BOTH, expand=True)

        header = ttk.Frame(shell, style="Brand.TFrame", padding=(20, 15))
        header.pack(fill=X)
        ttk.Label(header, text="Teaching Upload Assistant", style="BrandTitle.TLabel").pack(anchor=W)
        ttk.Label(header, text="ELGCC  |  Prepare, review and publish teachings", style="BrandSub.TLabel").pack(anchor=W, pady=(3, 0))
        ttk.Frame(shell, style="Gold.TFrame", height=3).pack(fill=X, pady=(0, 13))

        details = ttk.Frame(shell, style="Panel.TFrame", padding=16)
        details.pack(fill=X, pady=(0, 12))
        ttk.Label(details, text="1  Batch details", style="Step.TLabel").grid(row=0, column=0, columnspan=4, sticky=W, pady=(0, 11))
        ttk.Label(details, text="Year", style="Field.TLabel").grid(row=1, column=0, sticky=W)
        ttk.Label(details, text="Series", style="Field.TLabel").grid(row=1, column=1, sticky=W)
        ttk.Label(details, text="Speaker", style="Field.TLabel").grid(row=1, column=2, sticky=W)
        self.year_entry = ttk.Entry(details, textvariable=self.year_var, width=9)
        self.year_entry.grid(row=2, column=0, sticky="ew", padx=(0, 12), pady=(4, 0))
        self.series_combo = ttk.Combobox(details, textvariable=self.series_var, values=self.series_options)
        self.series_combo.grid(row=2, column=1, sticky="ew", padx=(0, 12), pady=(4, 0))
        self.series_combo.bind("<Button-1>", lambda _event: self.refresh_series_options(silent=True))
        self.speaker_entry = ttk.Entry(details, textvariable=self.speaker_var)
        self.speaker_entry.grid(row=2, column=2, sticky="ew", padx=(0, 12), pady=(4, 0))
        ttk.Label(details, text="Choose a website series or type a new one.", style="Hint.TLabel").grid(row=3, column=1, sticky=W, pady=(5, 0))
        self.mutable_widgets.extend((self.year_entry, self.series_combo, self.speaker_entry))

        if self.expected_password:
            ttk.Label(details, text="Uploader password", style="Field.TLabel").grid(row=1, column=3, sticky=W)
            self.password_entry = ttk.Entry(details, textvariable=self.password_var, show="*")
            self.password_entry.grid(row=2, column=3, sticky="ew", pady=(4, 0))
            self.mutable_widgets.append(self.password_entry)
        details.columnconfigure(0, minsize=90)
        details.columnconfigure(1, weight=3)
        details.columnconfigure(2, weight=2)
        details.columnconfigure(3, weight=1, minsize=170)

        files = ttk.Frame(shell, style="Panel.TFrame", padding=16)
        files.pack(fill=X, pady=(0, 12))
        ttk.Label(files, text="2  Choose audio", style="Step.TLabel").pack(anchor=W, pady=(0, 10))
        file_actions = ttk.Frame(files, style="Panel.TFrame")
        file_actions.pack(fill=X)
        choose_files_button = ttk.Button(file_actions, text="Choose files", command=self.choose_files, style="Secondary.TButton")
        choose_folder_button = ttk.Button(file_actions, text="Choose folder", command=self.choose_folder, style="Secondary.TButton")
        clear_button = ttk.Button(file_actions, text="Clear list", command=self.clear_entries, style="Plain.TButton")
        choose_files_button.pack(side=LEFT, padx=(0, 8))
        choose_folder_button.pack(side=LEFT, padx=(0, 8))
        clear_button.pack(side=LEFT, padx=(0, 8))
        ttk.Label(file_actions, text="MP3 and M4A", style="Hint.TLabel").pack(side=RIGHT)
        self.mutable_widgets.extend((choose_files_button, choose_folder_button, clear_button))

        review = ttk.Frame(shell, style="Panel.TFrame", padding=16)
        review.pack(fill=BOTH, expand=True, pady=(0, 12))
        review_header = ttk.Frame(review, style="Panel.TFrame")
        review_header.pack(fill=X, pady=(0, 10))
        ttk.Label(review_header, text="3  Review teachings", style="Step.TLabel").pack(side=LEFT)
        ttk.Label(review_header, textvariable=self.summary_var, style="Summary.TLabel").pack(side=RIGHT)

        review_actions = ttk.Frame(review, style="Panel.TFrame")
        review_actions.pack(fill=X, pady=(0, 10))
        ttk.Label(review_actions, text="Find", style="Field.TLabel").pack(side=LEFT, padx=(0, 7))
        self.search_entry = ttk.Entry(review_actions, textvariable=self.search_var, width=26)
        self.search_entry.pack(side=LEFT, padx=(0, 12))
        self.edit_button = ttk.Button(review_actions, text="Edit selected", command=self.edit_selected, style="Secondary.TButton")
        self.remove_button = ttk.Button(review_actions, text="Remove selected", command=self.remove_selected, style="Plain.TButton")
        apply_button = ttk.Button(review_actions, text="Apply batch details to all", command=self.apply_defaults, style="Plain.TButton")
        refresh_button = ttk.Button(review_actions, text="Refresh series", command=self.refresh_series_options, style="Plain.TButton")
        self.edit_button.pack(side=LEFT, padx=(0, 7))
        self.remove_button.pack(side=LEFT, padx=(0, 7))
        apply_button.pack(side=LEFT, padx=(0, 7))
        refresh_button.pack(side=RIGHT)
        self.mutable_widgets.extend((self.search_entry, self.edit_button, self.remove_button, apply_button, refresh_button))

        table_frame = ttk.Frame(review, style="Panel.TFrame")
        table_frame.pack(fill=BOTH, expand=True)
        columns = ("title", "file", "series", "year", "speaker", "status")
        self.table = ttk.Treeview(table_frame, columns=columns, show="headings", selectmode="extended", height=10)
        for column, width in [
            ("title", 245),
            ("file", 220),
            ("series", 185),
            ("year", 62),
            ("speaker", 175),
            ("status", 145),
        ]:
            self.table.heading(column, text=column.title(), anchor=W)
            self.table.column(column, width=width, anchor=W, minwidth=60, stretch=column in ("title", "file", "series"))
        self.table.tag_configure("issue", foreground="#A23F32", background="#FFF4F1")
        self.table.tag_configure("restore", foreground="#476238", background="#F1F6EA")
        self.table.tag_configure("done", foreground="#315B3F", background="#EEF6EF")
        self.table.bind("<<TreeviewSelect>>", lambda _event: self.update_action_state())
        self.table.bind("<Double-1>", lambda _event: self.edit_selected())
        scrollbar = ttk.Scrollbar(table_frame, orient=VERTICAL, command=self.table.yview)
        self.table.configure(yscrollcommand=scrollbar.set)
        self.table.pack(side=LEFT, fill=BOTH, expand=True)
        scrollbar.pack(side=RIGHT, fill="y")

        bottom = ttk.Frame(shell, style="Panel.TFrame", padding=(16, 12))
        bottom.pack(fill=X)
        progress_row = ttk.Frame(bottom, style="Panel.TFrame")
        progress_row.pack(fill=X, pady=(0, 9))
        ttk.Label(progress_row, textvariable=self.stage_var, style="Field.TLabel").pack(side=LEFT, padx=(0, 12))
        self.progress = ttk.Progressbar(progress_row, variable=self.progress_var, maximum=100, style="Upload.Horizontal.TProgressbar")
        self.progress.pack(side=LEFT, fill=X, expand=True)
        action_row = ttk.Frame(bottom, style="Panel.TFrame")
        action_row.pack(fill=X)
        ttk.Label(action_row, textvariable=self.status_var, style="Status.TLabel", wraplength=490).pack(side=LEFT, fill=X, expand=True)
        if self.allow_push:
            self.publish_check = ttk.Checkbutton(action_row, text="Publish to website after upload", variable=self.allow_push_var, onvalue="1", offvalue="0", style="Panel.TCheckbutton")
            self.publish_check.pack(side=RIGHT, padx=(12, 0))
            self.mutable_widgets.append(self.publish_check)
        self.validate_button = ttk.Button(action_row, text="Check website data", command=self.validate_data, style="Plain.TButton")
        self.validate_button.pack(side=RIGHT, padx=(8, 0))
        self.mutable_widgets.append(self.validate_button)
        self.upload_button = ttk.Button(action_row, text="Upload teachings", command=self.start_upload, style="Primary.TButton")
        self.upload_button.pack(side=RIGHT, padx=(8, 0))

    def refresh_series_options(self, silent=False):
        if self.uploading:
            return
        self.existing_sermons = load_sermons()
        self.series_options = available_series_from_sermons(self.existing_sermons)
        self.series_combo.configure(values=self.series_options)
        self.refresh_review()
        if not silent:
            self.status_var.set(f"Loaded {len(self.series_options)} series from the website data.")

    def on_batch_change(self, *_args):
        if self.uploading:
            return
        year = valid_year(self.year_var.get())
        series = normalize_text(self.series_var.get())
        speaker = normalize_text(self.speaker_var.get()) or DEFAULT_SPEAKER
        for entry in self.entries:
            if year is not None and "year" not in entry.overrides:
                entry.year = year
            if "series" not in entry.overrides:
                entry.series = series
            if "speaker" not in entry.overrides:
                entry.speaker = speaker
        self.refresh_review()

    def refresh_review(self):
        statuses = review_uploads(self.entries, self.existing_sermons)
        for entry, status in zip(self.entries, statuses):
            entry.status = status
        ready = sum(status in ("Ready", "Restore existing") for status in statuses)
        issues = len(statuses) - ready
        if not self.entries:
            self.summary_var.set("No audio files selected")
        elif issues:
            self.summary_var.set(f"{len(statuses)} files  |  {ready} ready  |  {issues} to fix")
        else:
            self.summary_var.set(f"{len(statuses)} files ready to upload")
        self.refresh_table()

    def update_action_state(self):
        selected = bool(self.table.selection())
        for widget in (self.edit_button, self.remove_button):
            widget.state(["!disabled"] if selected and not self.uploading else ["disabled"])
        can_upload = (
            bool(self.entries)
            and valid_year(self.year_var.get()) is not None
            and all(entry.status in ("Ready", "Restore existing") for entry in self.entries)
            and not self.uploading
        )
        self.upload_button.state(["!disabled"] if can_upload else ["disabled"])

    def set_uploading_ui(self, uploading):
        self.uploading = uploading
        for widget in self.mutable_widgets:
            widget.state(["disabled"] if uploading else ["!disabled"])
        self.update_action_state()

    def close_window(self):
        if self.uploading:
            messagebox.showwarning("Upload in progress", "Keep this window open until the upload finishes or reports an error.")
            return
        self.root.destroy()

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
        year = valid_year(self.year_var.get())
        if year is None:
            messagebox.showerror("Invalid year", "Enter a year between 1900 and 2200 before adding files.")
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

        self.refresh_review()
        if added:
            self.status_var.set(f"Added {added} audio file(s). Review their details below.")
        elif paths:
            self.status_var.set("No new MP3 or M4A files were added.")

    def apply_defaults(self):
        year = valid_year(self.year_var.get())
        if year is None:
            messagebox.showerror("Invalid year", "Enter a year between 1900 and 2200.")
            return

        series = normalize_text(self.series_var.get())
        speaker = normalize_text(self.speaker_var.get()) or DEFAULT_SPEAKER

        for entry in self.entries:
            entry.year = year
            entry.series = series
            entry.speaker = speaker
            entry.overrides.clear()

        self.refresh_review()
        self.status_var.set("Batch details applied to all files.")

    def edit_selected(self):
        if self.uploading:
            return
        selected = self.table.selection()
        if not selected:
            messagebox.showinfo("No selection", "Select one teaching to edit.")
            return
        if len(selected) > 1:
            messagebox.showinfo("Select one teaching", "Select one row to edit its details.")
            return
        index = int(selected[0])
        entry = self.entries[index]

        dialog = Toplevel(self.root)
        dialog.title("Edit teaching")
        dialog.geometry("550x310")
        dialog.resizable(False, False)
        dialog.configure(bg=BACKGROUND)
        dialog.transient(self.root)
        dialog.grab_set()

        title_var = StringVar(value=entry.title)
        series_var = StringVar(value=entry.series)
        year_var = StringVar(value=str(entry.year))
        speaker_var = StringVar(value=entry.speaker)

        form = ttk.Frame(dialog, style="Panel.TFrame", padding=20)
        form.pack(fill=BOTH, expand=True)
        form.columnconfigure(1, weight=1)

        for row, (label, var) in enumerate([
            ("Title", title_var),
            ("Series", series_var),
            ("Year", year_var),
            ("Speaker", speaker_var),
        ]):
            ttk.Label(form, text=label, style="Field.TLabel").grid(row=row, column=0, sticky=W, padx=(0, 12), pady=7)
            if label == "Series":
                ttk.Combobox(form, textvariable=var, values=self.series_options).grid(row=row, column=1, sticky="ew", pady=7)
            else:
                ttk.Entry(form, textvariable=var).grid(row=row, column=1, sticky="ew", pady=7)

        def save():
            year = valid_year(year_var.get())
            if year is None:
                messagebox.showerror("Invalid year", "Enter a year between 1900 and 2200.", parent=dialog)
                return
            title = normalize_text(title_var.get())
            series = normalize_text(series_var.get())
            if not title or not series:
                messagebox.showerror("Missing details", "Enter a title and series.", parent=dialog)
                return
            entry.year = year
            entry.title = title
            entry.series = series
            entry.speaker = normalize_text(speaker_var.get()) or DEFAULT_SPEAKER
            defaults = {
                "year": valid_year(self.year_var.get()),
                "series": normalize_text(self.series_var.get()),
                "speaker": normalize_text(self.speaker_var.get()) or DEFAULT_SPEAKER,
            }
            entry.overrides = {name for name in defaults if getattr(entry, name) != defaults[name]}
            self.refresh_review()
            self.status_var.set(f"Updated {entry.title}.")
            dialog.destroy()

        buttons = ttk.Frame(form, style="Panel.TFrame")
        buttons.grid(row=4, column=1, sticky="e", pady=(18, 0))
        ttk.Button(buttons, text="Cancel", command=dialog.destroy, style="Plain.TButton").pack(side=LEFT, padx=(0, 8))
        ttk.Button(buttons, text="Save changes", command=save, style="Primary.TButton").pack(side=LEFT)

    def remove_selected(self):
        if self.uploading:
            return
        selected = sorted((int(item) for item in self.table.selection()), reverse=True)
        for index in selected:
            del self.entries[index]
        self.refresh_review()
        self.status_var.set(f"Removed {len(selected)} file(s).")

    def clear_entries(self):
        if self.uploading or not self.entries:
            return
        if not messagebox.askyesno("Clear list", "Remove all files from this upload list?"):
            return
        self.entries = []
        self.progress_var.set(0)
        self.stage_var.set("Ready")
        self.refresh_review()
        self.status_var.set("List cleared. Choose files or a folder to begin.")

    def refresh_table(self):
        self.table.delete(*self.table.get_children())
        query = normalize_text(self.search_var.get()).lower()
        for index, entry in enumerate(self.entries):
            searchable = " ".join((entry.title, entry.path.name, entry.series, str(entry.year), entry.speaker, entry.status)).lower()
            if query and query not in searchable:
                continue
            tag = "issue" if entry.status not in ("Ready", "Restore existing", "Uploaded") and not entry.status.startswith("Uploading") and entry.status != "Preparing" else ""
            if entry.status == "Restore existing":
                tag = "restore"
            elif entry.status == "Uploaded":
                tag = "done"
            self.table.insert(
                "",
                END,
                iid=str(index),
                values=(entry.title, entry.path.name, entry.series, entry.year, entry.speaker, entry.status),
                tags=(tag,) if tag else (),
            )
        self.update_action_state()

    def validate_form(self):
        if self.expected_password and self.password_var.get() != self.expected_password:
            messagebox.showerror("Locked", "The uploader password is not correct.")
            return False
        if not self.entries:
            messagebox.showerror("No files", "Choose at least one .mp3 or .m4a file.")
            return False
        if valid_year(self.year_var.get()) is None:
            messagebox.showerror("Invalid year", "Enter a year between 1900 and 2200.")
            return False
        self.existing_sermons = load_sermons()
        self.refresh_review()
        for index, entry in enumerate(self.entries):
            if entry.status not in ("Ready", "Restore existing"):
                self.search_var.set("")
                self.table.selection_set(str(index))
                self.table.see(str(index))
                messagebox.showerror("Review needed", f"{entry.path.name}: {entry.status}. Fix or remove this row before uploading.")
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
        years = ", ".join(str(year) for year in sorted({entry.year for entry in self.entries}))
        publish = self.allow_push and self.allow_push_var.get() == "1"
        action = "and publish the website" if publish else "and prepare website data for owner publish"
        if not messagebox.askyesno("Start upload", f"Upload {len(self.entries)} teaching(s) to Archive.org for {years} {action}?"):
            return
        self.progress_var.set(0)
        self.stage_var.set("Preparing files")
        self.set_uploading_ui(True)
        threading.Thread(target=self.upload_entries, daemon=True).start()

    def set_status(self, text):
        self.root.after(0, lambda: self.status_var.set(text))

    def set_progress(self, stage, percent):
        def update():
            self.stage_var.set(stage)
            if percent is not None:
                self.progress_var.set(max(0, min(100, percent)))
        self.root.after(0, update)

    def set_entry_status(self, index, status):
        def update():
            self.entries[index].status = status
            self.refresh_table()
        self.root.after(0, update)

    def upload_entries(self):
        uploaded_count = 0
        data_valid = False
        try:
            existing = load_sermons()
            statuses = review_uploads(self.entries, existing)
            for entry, status in zip(self.entries, statuses):
                if status not in ("Ready", "Restore existing"):
                    raise RuntimeError(f"{entry.path.name}: {status}. No files were uploaded.")
            self.set_progress("Checking website data", 1)
            self.run_validation_or_raise()
            drafts = []
            used_names = set()
            total = len(self.entries)

            with tempfile.TemporaryDirectory(prefix="elgcc-teachings-") as temp_dir:
                stage = Path(temp_dir)

                for index, entry in enumerate(self.entries):
                    self.set_progress(f"Preparing file {index + 1} of {total}", 5 + 80 * index / total)
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

                    revive = find_unavailable_match(existing, draft)
                    if revive:
                        draft["id"] = revive["id"]
                        draft["_revive"] = True
                    elif is_duplicate(existing + drafts, draft, allow_unavailable_revive=True):
                        raise RuntimeError(f"Duplicate blocked: {entry.title}")

                    self.set_entry_status(index, "Uploading (0%)")
                    self.set_progress(f"Uploading file {index + 1} of {total}", 5 + 80 * index / total)
                    queue_derive = (index == len(self.entries) - 1)
                    self.run_archive_upload(index, stage, item, clean_name, draft["year"], draft["speaker"], total, queue_derive=queue_derive)
                    drafts.append(draft)
                    uploaded_count += 1
                    self.set_entry_status(index, "Uploaded")
                    self.set_progress(f"Uploaded {index + 1} of {total}", 5 + 80 * (index + 1) / total)

            wrote_data = False
            if drafts:
                self.set_progress("Updating website data", 88)
                self.set_status("Updating website teaching data...")
                merged = list(existing)
                by_id = {sermon.get("id"): sermon for sermon in merged}
                new_drafts = []
                for draft in drafts:
                    revive = draft.pop("_revive", False)
                    if revive and draft["id"] in by_id:
                        target = by_id[draft["id"]]
                        target["title"] = draft["title"]
                        target["audioUrl"] = draft["audioUrl"]
                        target["series"] = draft["series"]
                        target["year"] = draft["year"]
                        target["speaker"] = draft["speaker"]
                        target["archiveItem"] = draft["archiveItem"]
                        target["uploadedAt"] = draft["uploadedAt"]
                        target.pop("unavailable", None)
                        target.pop("unavailableReason", None)
                    else:
                        new_drafts.append(draft)
                write_sermons(merged + new_drafts)
                wrote_data = True

            self.set_progress("Checking website data", 94)
            self.set_status("Checking website teaching data...")
            try:
                self.run_validation_or_raise()
            except Exception:
                if wrote_data:
                    write_sermons(existing)
                raise
            data_valid = True

            if self.allow_push and self.allow_push_var.get() == "1":
                self.set_progress("Publishing website", 97)
                self.set_status("Publishing with git...")
                self.git_publish()
                final_message = "Upload complete. Website data was committed and pushed."
            else:
                final_message = "Upload complete. Website data is ready for owner publish."

            self.set_progress("Complete", 100)
            self.set_status(final_message)
            def finish():
                self.existing_sermons = load_sermons()
                self.series_options = available_series_from_sermons(self.existing_sermons)
                self.series_combo.configure(values=self.series_options)
                self.summary_var.set(f"{len(self.entries)} teaching(s) uploaded")
            self.root.after(0, finish)
            self.root.after(0, lambda: messagebox.showinfo("Done", final_message))
        except Exception as error:
            error_message = str(error)
            if data_valid:
                error_message += "\n\nAudio and website data are saved locally. Ask the website owner to publish; do not upload these files again."
            elif uploaded_count:
                error_message += f"\n\n{uploaded_count} file(s) reached Archive.org. Ask the website owner for help before retrying this batch."
            self.set_progress("Needs attention", None)
            self.set_status(f"Stopped: {error_message.splitlines()[0][:180]}")
            self.root.after(0, lambda: messagebox.showerror("Upload stopped", error_message))
        finally:
            self.root.after(0, lambda: self.set_uploading_ui(False))

    def run_archive_upload(self, index, cwd, item, file_name, year, speaker, total, queue_derive=True):
        import re
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
            "-R", "10",
            "-s", "60",
        ]
        if not queue_derive:
            command.append("--no-derive")
        
        process = subprocess.Popen(
            command,
            cwd=str(cwd),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )
        
        output_lines = []
        buffer = []
        while True:
            char = process.stdout.read(1)
            if not char:
                break
            if char in ('\r', '\n'):
                line = ''.join(buffer).strip()
                buffer = []
                if line:
                    output_lines.append(line)
                    # Look for percentage in output: e.g. " 12%|"
                    pct_match = re.search(r'(\b\d+)%', line)
                    if pct_match:
                        pct = min(100, int(pct_match.group(1)))
                        self.set_entry_status(index, f"Uploading ({pct}%)")
                        self.set_progress(f"Uploading file {index + 1} of {total}", 5 + 80 * (index + pct / 100) / total)
            else:
                buffer.append(char)
                
        process.wait()
        
        if process.returncode != 0:
            details = "\n".join(output_lines).strip() or "Archive.org upload failed."
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
