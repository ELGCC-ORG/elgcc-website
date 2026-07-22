# ELGCC Live Stream Assistant

Staff-friendly desktop tool for putting important meetings live on the website — without editing code.

## How to use

1. Double-click `Live Stream Assistant.bat`.
2. Paste the **YouTube live/watch link** (the video ID is detected automatically).
3. Enter the meeting title (and Facebook link if you have one).
4. Click **Go Live & Publish**.
5. After the meeting, click **End Live & Publish**.

The assistant updates `content/live.json`, commits, and pushes. Vercel then deploys the site.

## Buttons

| Button | What it does |
|---|---|
| **Go Live & Publish** | Turns live on, saves, commits, and pushes |
| **End Live & Publish** | Turns live off, saves, commits, and pushes |
| **Save only** | Saves on this computer without publishing |
| **Open /live** | Opens the live page in your browser |

## Optional password

On the church publishing computer:

```powershell
setx LIVE_STREAM_PASSWORD "choose-a-private-password"
```

Close and reopen the assistant after setting it.

## Notes

- Prefer YouTube for the embedded player.
- Facebook is offered as a watch button (more reliable on phones).
- You need Git push access on the computer that runs this tool.
