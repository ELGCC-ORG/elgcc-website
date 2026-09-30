# ELGCC Teaching Upload Assistant

This is the staff-friendly workflow for adding teachings to the website.

## How Staff Use It

1. Double-click `Teaching Upload Assistant.bat`.
2. In **Batch details**, enter the year and speaker. Choose an existing series from the list, or type a new one. Enter the uploader password if the field appears.
3. Click **Choose files** or **Choose folder**. The assistant accepts MP3 and M4A files.
4. In **Review teachings**, check the titles and statuses. Double-click a row or select it and click **Edit selected** to make a correction. Search the list if you have many files. Rows marked **Already on website** or **Duplicate in batch** must be corrected or removed before upload.
5. Click **Upload teachings** and confirm. Keep the assistant open until the progress bar says **Complete**.
6. If automatic publishing is enabled on this computer, select **Publish to website after upload** before step 5. Otherwise, tell the website owner that the teaching data is ready to publish.

Changing the batch year, series, or speaker updates files that have not been individually changed. **Apply batch details to all** resets individual year, series, and speaker changes. **Clear list** starts a new batch after you finish.

The assistant uploads the files to Archive.org using the Archive.org setup already on this computer, then adds the new teachings to `content/teachings/sermons.json`.

## Publishing

By default, the assistant stops after updating and validating the website data. It will show `Ready for owner publish`. The **Check website data** button can also run validation before uploading.

To allow the assistant to commit and push automatically later, set this environment variable on the church-owned publishing computer:

```powershell
setx TEACHING_UPLOADER_ALLOW_PUSH 1
```

The GitHub and Vercel ownership should be moved to a church-owned account or organization before enabling staff publishing.

## Optional Local Password

To require a password before uploading, set:

```powershell
setx TEACHING_UPLOADER_PASSWORD "choose-a-private-password"
```

Close and reopen the assistant after changing environment variables.

## What Gets Uploaded

The assistant accepts `.mp3` and `.m4a` files. It creates clean Archive.org filenames from the teaching titles so future links do not include local computer paths.

Default Archive.org metadata:

- `mediatype: audio`
- `collection: opensource_audio`
- `creator: Eternal Life Global Community Church`
- `description: Sermon recordings from ELGCC for the year {year}. Speaker: {speaker}`
