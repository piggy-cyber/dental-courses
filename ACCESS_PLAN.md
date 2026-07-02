# Access Plan

## Public Layer

- Keep only the homepage, library preview, account draft, and public-safe availability metadata publicly available.
- Do not put limited-access files in `assets/resources/`.
- Do not publish unlisted YouTube IDs until the protected access layer is active.
- Keep locked-course metadata public only as counts, labels, and availability signals.

## Private Layer

- Store locked PDFs, syllabi, images, Anki files, transcript text, and protected metadata in private object storage.
- Keep videos on YouTube and embed them by video ID after authentication. Do not upload MP4, MOV, or MP3 files to GitHub.
- Require authenticated user accounts before returning any private file URL.
- Use short-lived signed URLs for downloads and streaming.
- Serve transcript text through the same protected access layer so students can copy/download captions for their own AI study workflows after approval.
- Assign users to access groups, such as `d1-full` and `owner`.
- Log access events for private file opens, downloads, and failed attempts.
- Local private upload staging exists at `private-staging/`; it is ignored by Git and must not be published through GitHub Pages.

## Master Approval

- Use a manual master-account approval flow to activate `d1-full`, future `d2-full`, or combined access.
- Never collect passwords, financial details, or access tokens through GitHub Pages.
- Seed the owner account server-side during launch setup instead of exposing owner creation in the browser.

## Launch Gate

- Push only the public site shell and public-safe placeholders to GitHub.
- Verify no locked file paths, transcript text, unlisted YouTube IDs, or private storage URLs exist in tracked client JavaScript, HTML, CSS, or public assets.
- Deploy protected files only after authentication, storage rules, and signed URL delivery are active.

## Syllabus Status

- Staged locally for locked access later: DSPR 136, DSPR 139, HEWB 123, HEWB 124, HEWB 128, HEWB 134, HWDP 131, HWDP 142, LDRS 111, LDRS 113, MAHE 145, REHE 120, REHE 151, REHE 152, REHE 158, and REHE 162.
- Still missing in the downloaded course folders: HEWB 130 Oral Histology and LDRS 118 Ergonomics.

## Video Status

- Local media files stay out of GitHub.
- YouTube Studio currently exposes 39 videos, with 34 unlisted videos that can be embedded and 5 private videos that need a visibility change before students can view them.
- The local preview override is `assets/js/youtube-videos.private.js`; it is ignored by Git so the unlisted IDs do not publish accidentally.
- The local transcript preview override is `assets/js/transcript-content.private.js`; it is ignored by Git so transcript text does not publish accidentally.
