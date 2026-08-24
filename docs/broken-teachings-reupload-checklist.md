# Broken Teachings Re-upload Checklist (2021)

These teachings are listed in the website database but their audio files are **missing on Archive.org**. They are currently **hidden** from the public teachings page (`unavailable: true`).

Use the **Teaching Upload Assistant** to re-upload them into Archive.org item `elgcc-teachings-2021`, then clear the `unavailable` flags (or ask the developer to re-enable them).

## How to re-upload

1. Double-click `Teaching Upload Assistant.bat`
2. Year: `2021`
3. Series: use the **exact series name** below
4. Speaker: `Stephen Tijesuni Oyagbile`
5. Select the matching audio file(s)
6. Upload and update website
7. After a successful upload, tell the developer so the teaching can be un-hidden

Suggested Archive.org folder / filename pattern (keep names close to these so links stay consistent):

---

## Jos Brethren Retreat (7 files)

**Series name:** `JOS BRETHREN RETREAT`

| # | Title to enter | Suggested filename on Archive.org |
|---|---|---|
| 1 | EVANGELISM 1 | `JOS BRETHREN RETREAT/JOS BRETHREN RETREAT - EVANGELISM 1.mp3` |
| 2 | EVANGELISM 2 | `JOS BRETHREN RETREAT/JOS BRETHREN RETREAT - EVANGELISM 2.mp3` |
| 3 | CHRISTIAN LIVING EP. 1 | `JOS BRETHREN RETREAT/JOS BRETHREN RETREAT - CHRISTIAN LIVING EP. 1.mp3` |
| 4 | CHRISTIAN LIVING EP. 2 | `JOS BRETHREN RETREAT/JOS BRETHREN RETREAT - CHRISTIAN LIVING EP. 2.mp3` |
| 5 | CHRISTIAN LIVING EP. 3 | `JOS BRETHREN RETREAT/JOS BRETHREN RETREAT - CHRISTIAN LIVING EP. 3.mp3` |
| 6 | CHRISTIAN LIVING EP. 4 | `JOS BRETHREN RETREAT/JOS BRETHREN RETREAT - CHRISTIAN LIVING EP. 4.mp3` |
| 7 | CHRISTIAN CONDUCT AND SERVICE | `JOS BRETHREN RETREAT/JOS BRETHREN RETREAT - CHRISTIAN CONDUCT AND SERVICE.mp3` |

Website IDs (for verification after upload):
- `2021-jos-brethren-retreat-evangelism-1`
- `2021-jos-brethren-retreat-evangelism-2`
- `2021-jos-brethren-retreat-christian-living-ep-1`
- `2021-jos-brethren-retreat-christian-living-ep-2`
- `2021-jos-brethren-retreat-christian-living-ep-3`
- `2021-jos-brethren-retreat-christian-living-ep-4`
- `2021-jos-brethren-retreat-christian-conduct-and-service`

---

## Church Retreat 2021 (8 files)

**Series name:** `CHURCH RETREAT 2021`

| # | Title to enter | Suggested filename on Archive.org |
|---|---|---|
| 1 | CHURCH RETREAT 2021 (LABORING IN PRAYERS) | `CHURCH RETREAT 2021/CHURCH RETREAT 2021 (LABORING IN PRAYERS).mp3` |
| 2 | CHURCH RETREAT 2021 (MAINTAINING THE BOND OF UNITY) | `CHURCH RETREAT 2021/CHURCH RETREAT 2021 (MAINTAINING THE BOND OF UNITY).mp3` |
| 3 | CHURCH RETREAT 2021 (OUR GIVING) 1 | `CHURCH RETREAT 2021/CHURCH RETREAT 2021 (OUR GIVING) 1.mp3` |
| 4 | CHURCH RETREAT 2021 (OUR GIVING) 2 | `CHURCH RETREAT 2021/CHURCH RETREAT 2021 (OUR GIVING) 2.mp3` |
| 5 | CHURCH RETREAT 2021 (THE CHURCH AND HER MISSION) 1 | `CHURCH RETREAT 2021/CHURCH RETREAT 2021 (THE CHURCH AND HER MISSION) 1.mp3` |
| 6 | CHURCH RETREAT 2021 (THE CHURCH AND HER MISSION) 2 | `CHURCH RETREAT 2021/CHURCH RETREAT 2021 (THE CHURCH AND HER MISSION) 2.mp3` |
| 7 | CHURCH RETREAT 2021 (THE CHURCH AND HER MISSION) 3 | `CHURCH RETREAT 2021/CHURCH RETREAT 2021 (THE CHURCH AND HER MISSION) 3.mp3` |
| 8 | CHURCH RETREAT 2021 (THE CHURCH AND HER MISSION) 4 - Q&A | `CHURCH RETREAT 2021/CHURCH RETREAT 2021 (THE CHURCH AND HER MISSION) 4 - Q&A.mp3` |

---

## Appreciation & Honour (3 files)

**Series name:** `8. APPRECIATION & HONOUR`

| # | Title to enter | Suggested filename on Archive.org |
|---|---|---|
| 1 | APPRECIATION & HONOUR TRACK 3 | `8. APPRECIATION & HONOUR/APPRECIATION & HONOUR TRACK 3.mp3` |
| 2 | APPRECIATION & HONOUR TRACK 4 | `8. APPRECIATION & HONOUR/APPRECIATION & HONOUR TRACK 4.mp3` |
| 3 | APPRECIATION & HONOUR TRACK 5 | `8. APPRECIATION & HONOUR/APPRECIATION & HONOUR TRACK 5.mp3` |

Note: Tracks 1 and 2 already exist and play correctly.

---

## Following the Leading of the Spirit — Series 3 (1 file)

**Series name:** `7. FOLLOWING THE LEADING OF THE SPIRIT (SERIES 3)`

| # | Title to enter | Suggested filename on Archive.org |
|---|---|---|
| 1 | FOLLOWING THE LEADING OF THE SPIRIT (SERIES 3) TRACK 15 | `7. FOLLOWING THE LEADING OF THE SPIRIT (SERIES 3)/FOLLOWING THE LEADING OF THE SPIRIT (SERIES 3) TRACK 15.mp3` |

Note: Tracks 1–14 already exist and play correctly.

---

## Exceeding Greatness of His Power (2 files)

**Series name:** `9. EXCEEDING GREATNESS OF HIS POWER`

| # | Title to enter | Suggested filename on Archive.org |
|---|---|---|
| 1 | EXCEEDING GREATNESS OF HIS POWER TRACK 5 | Prefer: `9. EXCEEDING GREATNESS OF HIS POWER/EXCEEDING GREATNESS OF HIS POWER 5.mp3` |
| 2 | EXCEEDING GREATNESS OF HIS POWER TRACK 6 | Prefer: `9. EXCEEDING GREATNESS OF HIS POWER/EXCEEDING GREATNESS OF HIS POWER 6.mp3` |

Note: Tracks 1–4 were fixed on the website (they already existed under names **without** the word `TRACK`).

---

## Already fixed (no re-upload needed)

These now point to the correct Archive.org filenames and should play:

- Exceeding Greatness of His Power Tracks **1–4**

## After re-upload

The Teaching Upload Assistant will **revive** matching hidden teachings automatically:
same year + series + title with `unavailable: true` gets its new audio URL and is shown again on the website.

Then optionally confirm with:

```bash
python scripts/audit-teachings-audio.py 2021
```
