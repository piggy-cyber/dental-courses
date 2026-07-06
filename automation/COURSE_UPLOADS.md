# Bot course uploads

How an agent (or script) adds files to the course library without signing in.

## Setup

- `COURSE_BOT_API_KEY` must be set in Vercel (production) and locally in
  `automation/.env` (gitignored):

```
COURSE_BOT_API_KEY=<the key>
```

## Upload files

```bash
automation/.venv/bin/python automation/course_uploader.py --course "DENT 101" file1.pdf file2.pdf
```

- Files land in the course **Inbox**. Assign each one to a slot (syllabus,
  lecture slides, labs, etc.) in the admin UI at `/admin/courses/<code>`.
- GroupMe announces **once per batch**, when the last inbox file is assigned —
  not one message per file.
- `--resource-id <id>` replaces the file behind an existing resource row
  (announces immediately, since no assignment step is needed).
- `--collection` defaults to `d1-2025-2026`.

## API details (for building other clients)

`POST /api/admin/course-resource/upload`

- Header: `Authorization: Bearer $COURSE_BOT_API_KEY`
- Multipart form fields: `courseCode`, `collectionId`, one or more `file`
  fields, and either `inbox=1` or `resourceId=<id>`.
- Response: `{ ok, uploaded, storagePaths, resourceIds, errors }`.
- Max file size: 50 MB (Supabase free-tier bucket limit).

`DELETE /api/admin/course-resource/<id>?courseCode=...&collectionId=...`
removes a resource row and its stored file (same auth header).

## Limits

- The API cannot create courses or lectures — create the course shell first
  in the admin UI (`/admin/courses/new`), then upload into it.
- The GroupMe announcement bot is configured via `GROUPME_CONTENT_BOT_ID` in
  Vercel; if unset, uploads still work but nothing is announced.
