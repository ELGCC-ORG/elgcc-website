#!/usr/bin/env python3
"""ELGCC Live Stream Assistant — go live / end live and publish without editing code."""

from __future__ import annotations

import json
import os
import re
import subprocess
import threading
import webbrowser
from datetime import datetime
from pathlib import Path
from tkinter import (
    BOTH,
    END,
    LEFT,
    RIGHT,
    BooleanVar,
    Entry,
    Frame,
    Label,
    StringVar,
    Text,
    Tk,
    messagebox,
    simpledialog,
)
from urllib.parse import parse_qs, urlparse


ROOT = Path(__file__).resolve().parent
LIVE_FILE = ROOT / "content" / "live.json"

# Brand palette
BG = "#121212"
PANEL = "#1C1C1C"
PANEL_2 = "#242424"
BORDER = "#2E2E2E"
TEXT = "#F3F3F0"
MUTED = "#9A9A90"
PRIMARY = "#6B7F4C"
PRIMARY_DARK = "#556339"
ACCENT = "#8B7355"
LIVE_RED = "#DC2626"
LIVE_SOFT = "#3F1212"
OK_GREEN = "#4ADE80"
FONT = ("Segoe UI", 11)
FONT_BOLD = ("Segoe UI Semibold", 11)
FONT_TITLE = ("Segoe UI Semibold", 22)
FONT_SMALL = ("Segoe UI", 9)


DEFAULTS = {
    "isLive": False,
    "title": "ELGCC Live Meeting",
    "description": (
        "Join us for this special meeting. Watch here on the website, "
        "or open YouTube / Facebook if you prefer."
    ),
    "youtubeVideoId": "",
    "facebookUrl": "https://www.facebook.com/EternalLifeGcc/",
    "nextMeetingLabel": (
        "Important meetings are streamed live on YouTube and Facebook. "
        "Check back here when we go live."
    ),
    "youtubeChannelUrl": "https://youtube.com/channel/UCp_6_uNVnOLPv3kAhmcFkww",
    "facebookPageUrl": "https://www.facebook.com/EternalLifeGcc/",
}


def load_config() -> dict:
    if not LIVE_FILE.exists():
        return dict(DEFAULTS)
    data = json.loads(LIVE_FILE.read_text(encoding="utf-8"))
    merged = dict(DEFAULTS)
    merged.update(data)
    return merged


def save_config(data: dict) -> None:
    LIVE_FILE.parent.mkdir(parents=True, exist_ok=True)
    LIVE_FILE.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def extract_youtube_id(value: str) -> str:
    raw = (value or "").strip()
    if not raw:
        return ""

    if re.fullmatch(r"[\w-]{11}", raw):
        return raw

    parsed = urlparse(raw)
    host = (parsed.netloc or "").lower().replace("www.", "")

    if host in {"youtu.be"}:
        candidate = parsed.path.strip("/").split("/")[0]
        return candidate if re.fullmatch(r"[\w-]{11}", candidate) else ""

    if "youtube.com" in host or "youtube-nocookie.com" in host:
        query = parse_qs(parsed.query)
        if "v" in query and query["v"]:
            candidate = query["v"][0]
            if re.fullmatch(r"[\w-]{11}", candidate):
                return candidate

        parts = [part for part in parsed.path.split("/") if part]
        for marker in ("embed", "live", "shorts", "v"):
            if marker in parts:
                idx = parts.index(marker)
                if idx + 1 < len(parts) and re.fullmatch(r"[\w-]{11}", parts[idx + 1]):
                    return parts[idx + 1]

    match = re.search(r"([\w-]{11})", raw)
    return match.group(1) if match else ""


def run_git(args: list[str]) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if result.returncode != 0:
        detail = (result.stderr or result.stdout or "Git command failed").strip()
        raise RuntimeError(detail)
    return (result.stdout or "").strip()


class LiveStreamAssistant:
    def __init__(self, root: Tk):
        self.root = root
        self.root.title("ELGCC Live Stream Assistant")
        self.root.geometry("820x760")
        self.root.minsize(760, 680)
        self.root.configure(bg=BG)

        self.config = load_config()
        self.expected_password = os.environ.get("LIVE_STREAM_PASSWORD", "")
        self.busy = False

        self.is_live = BooleanVar(value=bool(self.config.get("isLive")))
        self.title_var = StringVar(value=self.config.get("title", ""))
        self.youtube_var = StringVar(value=self.config.get("youtubeVideoId", ""))
        self.facebook_var = StringVar(value=self.config.get("facebookUrl", ""))
        self.next_var = StringVar(value=self.config.get("nextMeetingLabel", ""))
        self.detected_var = StringVar(value="")
        self.status_var = StringVar(value="Ready")

        self.youtube_var.trace_add("write", lambda *_: self.refresh_detected())

        self.build_ui()
        self.refresh_status_chip()
        self.refresh_detected()
        self.log("Loaded current live settings from the website config.")

    def build_ui(self):
        shell = Frame(self.root, bg=BG)
        shell.pack(fill=BOTH, expand=True, padx=28, pady=24)

        header = Frame(shell, bg=BG)
        header.pack(fill="x")

        Label(
            header,
            text="ELGCC",
            bg=BG,
            fg=PRIMARY,
            font=("Segoe UI Semibold", 12),
        ).pack(anchor="w")
        Label(
            header,
            text="Live Stream Assistant",
            bg=BG,
            fg=TEXT,
            font=FONT_TITLE,
        ).pack(anchor="w", pady=(2, 0))
        Label(
            header,
            text="Turn meetings live on the website — no code editing needed.",
            bg=BG,
            fg=MUTED,
            font=FONT,
        ).pack(anchor="w", pady=(6, 0))

        self.status_chip = Frame(shell, bg=PANEL, highlightbackground=BORDER, highlightthickness=1)
        self.status_chip.pack(fill="x", pady=(18, 16))
        self.status_inner = Frame(self.status_chip, bg=PANEL)
        self.status_inner.pack(fill="x", padx=18, pady=16)
        self.status_label = Label(
            self.status_inner,
            text="OFFLINE",
            bg=PANEL,
            fg=MUTED,
            font=("Segoe UI Semibold", 16),
        )
        self.status_label.pack(side=LEFT)
        self.status_hint = Label(
            self.status_inner,
            text="Visitors will see the offline message on /live",
            bg=PANEL,
            fg=MUTED,
            font=FONT_SMALL,
        )
        self.status_hint.pack(side=LEFT, padx=(14, 0))

        form = Frame(shell, bg=PANEL, highlightbackground=BORDER, highlightthickness=1)
        form.pack(fill=BOTH, expand=True)

        form_inner = Frame(form, bg=PANEL)
        form_inner.pack(fill=BOTH, expand=True, padx=20, pady=18)

        self.add_label(form_inner, "Meeting title")
        self.title_entry = self.add_entry(form_inner, self.title_var)

        self.add_label(form_inner, "YouTube link or video ID")
        self.youtube_entry = self.add_entry(form_inner, self.youtube_var)
        Label(
            form_inner,
            textvariable=self.detected_var,
            bg=PANEL,
            fg=PRIMARY,
            font=FONT_SMALL,
            anchor="w",
        ).pack(fill="x", pady=(4, 10))

        self.add_label(form_inner, "Facebook Live / page link (optional)")
        self.facebook_entry = self.add_entry(form_inner, self.facebook_var)

        self.add_label(form_inner, "Offline message (shown when not live)")
        self.next_entry = self.add_entry(form_inner, self.next_var)

        self.add_label(form_inner, "Description shown under the player")
        self.description_box = Text(
            form_inner,
            height=4,
            wrap="word",
            bg=PANEL_2,
            fg=TEXT,
            insertbackground=TEXT,
            relief="flat",
            font=FONT,
            highlightthickness=1,
            highlightbackground=BORDER,
            highlightcolor=PRIMARY,
            padx=10,
            pady=8,
        )
        self.description_box.pack(fill="x", pady=(0, 8))
        self.description_box.insert("1.0", self.config.get("description", ""))

        actions = Frame(shell, bg=BG)
        actions.pack(fill="x", pady=(16, 8))

        self.go_live_btn = self.make_button(
            actions,
            "Go Live & Publish",
            self.go_live,
            bg=LIVE_RED,
            fg="#FFFFFF",
            side=LEFT,
        )
        self.end_live_btn = self.make_button(
            actions,
            "End Live & Publish",
            self.end_live,
            bg=PRIMARY_DARK,
            fg="#FFFFFF",
            side=LEFT,
            padx=(10, 0),
        )
        self.save_btn = self.make_button(
            actions,
            "Save only",
            self.save_only,
            bg=PANEL_2,
            fg=TEXT,
            side=LEFT,
            padx=(10, 0),
        )
        self.preview_btn = self.make_button(
            actions,
            "Open /live",
            self.open_live_page,
            bg=PANEL_2,
            fg=TEXT,
            side=RIGHT,
        )

        log_wrap = Frame(shell, bg=PANEL, highlightbackground=BORDER, highlightthickness=1)
        log_wrap.pack(fill=BOTH, expand=True, pady=(4, 0))
        Label(
            log_wrap,
            text="Activity",
            bg=PANEL,
            fg=MUTED,
            font=FONT_SMALL,
            anchor="w",
        ).pack(fill="x", padx=14, pady=(10, 0))
        self.log_box = Text(
            log_wrap,
            height=8,
            wrap="word",
            bg=PANEL,
            fg=MUTED,
            relief="flat",
            font=("Consolas", 9),
            state="disabled",
            highlightthickness=0,
            padx=12,
            pady=8,
        )
        self.log_box.pack(fill=BOTH, expand=True, padx=4, pady=(0, 8))

        footer = Frame(shell, bg=BG)
        footer.pack(fill="x", pady=(10, 0))
        Label(
            footer,
            textvariable=self.status_var,
            bg=BG,
            fg=MUTED,
            font=FONT_SMALL,
            anchor="w",
        ).pack(side=LEFT)

    def add_label(self, parent, text: str):
        Label(parent, text=text, bg=PANEL, fg=MUTED, font=FONT_SMALL, anchor="w").pack(
            fill="x", pady=(0, 4)
        )

    def add_entry(self, parent, variable: StringVar) -> Entry:
        entry = Entry(
            parent,
            textvariable=variable,
            bg=PANEL_2,
            fg=TEXT,
            insertbackground=TEXT,
            relief="flat",
            font=FONT,
            highlightthickness=1,
            highlightbackground=BORDER,
            highlightcolor=PRIMARY,
        )
        entry.pack(fill="x", ipady=8, pady=(0, 4))
        return entry

    def make_button(self, parent, text, command, bg, fg, side=LEFT, padx=(0, 0)):
        btn = Label(
            parent,
            text=text,
            bg=bg,
            fg=fg,
            font=FONT_BOLD,
            padx=16,
            pady=10,
            cursor="hand2",
        )
        btn.pack(side=side, padx=padx)
        btn.bind("<Button-1>", lambda _e: command())
        return btn

    def refresh_status_chip(self):
        if self.is_live.get():
            self.status_chip.configure(bg=LIVE_SOFT, highlightbackground=LIVE_RED)
            self.status_inner.configure(bg=LIVE_SOFT)
            self.status_label.configure(text="●  LIVE NOW", bg=LIVE_SOFT, fg="#FCA5A5")
            self.status_hint.configure(
                text="Home banner + /live player will show after publish",
                bg=LIVE_SOFT,
                fg="#FECACA",
            )
        else:
            self.status_chip.configure(bg=PANEL, highlightbackground=BORDER)
            self.status_inner.configure(bg=PANEL)
            self.status_label.configure(text="○  OFFLINE", bg=PANEL, fg=MUTED)
            self.status_hint.configure(
                text="Visitors will see the offline message on /live",
                bg=PANEL,
                fg=MUTED,
            )

    def refresh_detected(self):
        video_id = extract_youtube_id(self.youtube_var.get())
        if video_id:
            self.detected_var.set(f"Detected video ID: {video_id}")
        elif self.youtube_var.get().strip():
            self.detected_var.set("Could not detect a YouTube video ID yet — paste the full watch link.")
        else:
            self.detected_var.set("Paste a YouTube live/watch link and the ID will be detected automatically.")

    def log(self, message: str):
        stamp = datetime.now().strftime("%H:%M:%S")
        self.log_box.configure(state="normal")
        self.log_box.insert(END, f"[{stamp}] {message}\n")
        self.log_box.see(END)
        self.log_box.configure(state="disabled")

    def set_status(self, message: str):
        self.status_var.set(message)

    def require_password(self) -> bool:
        if not self.expected_password:
            return True
        value = simpledialog.askstring(
            "Password required",
            "Enter Live Stream Assistant password:",
            show="*",
            parent=self.root,
        )
        if value != self.expected_password:
            messagebox.showerror("Access denied", "Incorrect password.")
            return False
        return True

    def collect_form(self, is_live: bool) -> dict:
        video_id = extract_youtube_id(self.youtube_var.get())
        title = self.title_var.get().strip() or "ELGCC Live Meeting"
        facebook = self.facebook_var.get().strip() or DEFAULTS["facebookUrl"]
        next_label = self.next_var.get().strip() or DEFAULTS["nextMeetingLabel"]
        description = self.description_box.get("1.0", END).strip() or DEFAULTS["description"]

        if is_live and not video_id:
            raise ValueError("Paste a YouTube live/watch link (or 11-character video ID) before going live.")

        data = dict(self.config)
        data.update(
            {
                "isLive": bool(is_live),
                "title": title,
                "description": description,
                "youtubeVideoId": video_id,
                "facebookUrl": facebook,
                "nextMeetingLabel": next_label,
                "youtubeChannelUrl": data.get("youtubeChannelUrl") or DEFAULTS["youtubeChannelUrl"],
                "facebookPageUrl": data.get("facebookPageUrl") or DEFAULTS["facebookPageUrl"],
            }
        )
        return data

    def write_and_refresh(self, data: dict):
        save_config(data)
        self.config = data
        self.is_live.set(bool(data["isLive"]))
        self.youtube_var.set(data.get("youtubeVideoId", ""))
        self.refresh_status_chip()
        self.refresh_detected()

    def publish(self, data: dict, commit_message: str):
        self.log("Saving live config...")
        self.write_and_refresh(data)
        self.log(f"Saved {LIVE_FILE.relative_to(ROOT)}")

        self.log("Staging changes...")
        run_git(["add", "content/live.json"])

        status = run_git(["status", "--porcelain", "--", "content/live.json"])
        if not status.strip():
            self.log("No git changes to publish (already up to date).")
            return False

        self.log("Creating commit...")
        run_git(["commit", "-m", commit_message])
        self.log("Pushing to GitHub (Vercel will deploy)...")
        run_git(["push"])
        self.log("Published successfully.")
        return True

    def run_async(self, work, success_message: str):
        if self.busy:
            return
        if not self.require_password():
            return

        self.busy = True
        self.set_status("Working...")

        def task():
            try:
                work()
                self.root.after(0, lambda: self.finish_ok(success_message))
            except Exception as exc:  # noqa: BLE001 - show any failure in UI
                self.root.after(0, lambda: self.finish_error(str(exc)))

        threading.Thread(target=task, daemon=True).start()

    def finish_ok(self, message: str):
        self.busy = False
        self.set_status(message)
        self.log(message)
        messagebox.showinfo("Live Stream Assistant", message)

    def finish_error(self, message: str):
        self.busy = False
        self.set_status("Something went wrong")
        self.log(f"Error: {message}")
        messagebox.showerror("Live Stream Assistant", message)

    def go_live(self):
        def work():
            data = self.collect_form(is_live=True)
            self.root.after(0, lambda: self.log(f"Going live: {data['title']} ({data['youtubeVideoId']})"))
            published = self.publish(data, f"Go live: {data['title']}")
            if not published:
                self.root.after(0, lambda: self.log("Already up to date on GitHub."))

        self.run_async(work, "You are LIVE. The website is publishing now.")

    def end_live(self):
        def work():
            data = self.collect_form(is_live=False)
            # Keep the last video ID so staff can reuse/replay if needed.
            self.root.after(0, lambda: self.log("Ending live stream on the website..."))
            published = self.publish(data, "End live stream")
            if not published:
                # Still treat local save as success if already offline with same data.
                pass

        self.run_async(work, "Live stream ended. The website is publishing now.")

    def save_only(self):
        def work():
            data = self.collect_form(is_live=self.is_live.get())
            self.write_and_refresh(data)
            self.root.after(0, lambda: self.log("Saved locally without publishing."))

        self.run_async(work, "Saved locally. Use Go Live / End Live to publish.")

    def open_live_page(self):
        webbrowser.open("https://eternallifegcc.com/live")


def main():
    root = Tk()
    try:
        root.iconbitmap(default=str(ROOT / "public" / "images" / "favicon.ico"))
    except Exception:
        pass
    LiveStreamAssistant(root)
    root.mainloop()


if __name__ == "__main__":
    main()
