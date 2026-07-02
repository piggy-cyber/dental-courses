# Cursor Handoff: D1 Course Library

## Current Goal

Build a student-facing course resource hub that replaces scattered Google Drive, Canvas, YouTube, and transcript folders with one clean course navigation site. Students should choose a course, see lectures in order, and open the related video, transcript, slides, documents, flashcards, syllabi, and study guides from the same row. FLS / HEWB 121 is the free sample. The rest of the D1 library should require master-account approval and eventually support D1-only, D2-only, or D1 + D2 access.

## Repository State

Local repo: this repository root.

Preview server used during this handoff:

```bash
python3 -m http.server 8174 --bind 127.0.0.1
```

Important pages:

```text
index.html       Homepage / student entry
library.html     Course directory
course.html      Student course hub
login.html       Demo Google/email access page
owner.html       Master account management queue
management.html  Lecture/video/resource audit page
```

Important data/scripts:

```text
assets/js/course-data.js              Course list
assets/js/lecture-data.js             Transcript-derived lecture rows
assets/js/resource-map.js             Course resource inventory
assets/js/course-page.js              Main course hub behavior
assets/js/library.js                  Library directory behavior
assets/js/login-demo.js               Local-only demo login state
assets/js/access-demo.js              Local-only owner queue state
assets/js/private-preview-loader.js   Local-only private data loader
```

Private local preview files:

```text
assets/js/youtube-videos.private.js
assets/js/transcript-content.private.js
private-staging/
```

These are intentionally ignored by Git. Do not commit transcript text, private course files, unlisted YouTube IDs, or local absolute file paths to a public repo.

## What Was Completed In Codex

- The homepage/library were redesigned as a student course library, not a company page.
- `course.html` now works as a course hub with ordered lecture rows, embedded YouTube videos, transcript buttons, packet/resource buttons, and a supplemental resource shelf.
- HEWB 121 / FLS remains the free sample; protected courses lock videos/transcripts for visitors.
- HWDP 131 approved preview currently verifies at 42 lecture rows, 35 embedded videos, 42 transcript buttons, and one visible syllabus.
- Neoplasia / DSPR 139 no longer shows only two transcript rows. It now synthesizes slide/PDF-based lecture rows for:
  - Basics Of Neoplasia
  - Carcinogenesis
  - Carcinogenesis Beyond Mutations
  - Clinical Features Of Neoplasia
  - Diagnosis And Treatment Of Neoplasia
- Resource modals now include a preview panel. This is a UI placeholder ready for real protected preview URLs.
- Duplicate syllabi are collapsed at display-time in the course page, so each course shows one syllabus even if raw `resource-map.js` contains duplicate syllabus candidates.
- `owner.html` was expanded into a master account management page with Google sign-in labels, D1/D2 requested access, approval buttons for D1, D2, or both, and a queue export button.
- `login.html` now has a Google demo button and approved/pending account states.

## What Is Demo-Only

The current site is static HTML/CSS/JS. It is not secure authentication.

Demo-only pieces:

- `localStorage` access mode in `login-demo.js`
- owner queue state in `access-demo.js`
- private transcript/video loader on localhost
- protected file open/download buttons
- resource preview panel content

Do not publish this as a protected-access product without replacing those pieces with real auth, database, and private storage.

## Recommended Cursor Direction

Move from a static GitHub Pages-style site to a stack that can protect files:

Preferred simple stack:

```text
Next.js or Astro frontend
Supabase Auth with Google provider
Supabase Postgres for account/course/resource metadata
Supabase Storage private buckets with signed URLs
Manual master approval for D1/D2 access groups
```

Firebase Auth + Firestore + Cloud Storage is also reasonable. GitHub Pages alone is not enough for paid protected files because any file deployed there is public.

## Account Model To Implement

Minimum tables:

```sql
users (
  id uuid primary key,
  email text unique not null,
  name text,
  google_sub text unique,
  role text check (role in ('student', 'owner')) default 'student',
  created_at timestamptz default now()
)

access_requests (
  id uuid primary key,
  user_id uuid references users(id),
  requested_groups text[] not null,
  review_status text check (review_status in ('pending', 'hold', 'approved', 'revoked')) default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

access_grants (
  id uuid primary key,
  user_id uuid references users(id),
  access_group text check (access_group in ('d1', 'd2')) not null,
  granted_by uuid references users(id),
  granted_at timestamptz default now(),
  revoked_at timestamptz
)
```

Access behavior:

- Student signs in with Google.
- If no approved grant exists, show free sample and pending status.
- If `d1` grant exists, open D1 protected courses.
- If `d2` grant exists later, open D2 courses.
- Owner role can see pending requests and grant/revoke D1/D2 access.

## Course/Resource Data Model

Normalize the current JS data into tables:

```sql
courses (
  code text primary key,
  title text not null,
  semester text,
  access_group text not null
)

lectures (
  id text primary key,
  course_code text references courses(code),
  title text not null,
  lecture_date date,
  source_type text,
  sort_order integer
)

resources (
  id text primary key,
  course_code text references courses(code),
  name text not null,
  kind text not null,
  ext text,
  storage_path text,
  preview_path text,
  section text,
  size_mb numeric,
  is_canonical_syllabus boolean default false
)

lecture_resources (
  lecture_id text references lectures(id),
  resource_id text references resources(id),
  relationship text,
  primary key (lecture_id, resource_id)
)

transcripts (
  lecture_id text primary key references lectures(id),
  storage_path text,
  word_count integer
)
```

## File Preview Implementation

Question: can PDF/Word/PowerPoint be embedded for preview?

Yes, but use different strategies:

- PDF: easiest. Serve a signed protected PDF URL and render it in an `<iframe>` or PDF viewer.
- PowerPoint: do not rely on browser-native rendering. Convert to PDF or slide images, then show the PDF/images as preview.
- Word: convert to PDF or HTML for preview. Do not depend on direct `.docx` browser rendering.
- Microsoft Office web viewer only works for publicly reachable URLs. It is not a good fit for private course files unless you intentionally create temporary public signed URLs and accept the privacy tradeoff.

Recommended backend preview pipeline:

1. Upload original file to private storage.
2. Generate a preview artifact:
   - `.pdf` stays `.pdf`
   - `.ppt/.pptx` -> `.pdf` and/or page images
   - `.doc/.docx` -> `.pdf`
3. Store preview in private storage.
4. When approved student opens a resource, request a short-lived signed URL for preview and download separately.
5. Render the signed preview URL in the existing `.resource-preview-panel`.

The current UI already has the preview slot. Wire it by adding `previewUrl` / `downloadUrl` or fetching those URLs from the backend when `openResource()` runs in `assets/js/course-page.js`.

## Content Rules To Preserve

- One syllabus per course. The current display-time heuristic chooses a canonical syllabus, but the real migration should mark exactly one `is_canonical_syllabus = true` per course.
- Do not list every random document as a lecture. Use slide/PDF deck rows only when a course is clearly underlisted.
- Keep transcripts beside the matching lecture row so students can copy/download them for AI study.
- Keep FLS as the free sample.
- Keep resource rows compact and searchable; avoid turning the course page into a flat file dump.

## Known Gaps For Cursor

- Real Google OAuth is not implemented.
- Real owner/master account is not implemented server-side.
- Master approval is local demo data only.
- Protected file storage is not implemented.
- Real preview URLs are not implemented.
- Downloads are disabled in the static prototype except transcript text generated locally.
- `resource-map.js` still contains raw duplicate syllabus candidates. The UI hides duplicates, but the data should be cleaned during migration.
- `private-staging/` and `*.private.js` files are local-only inputs and should be moved into private storage or a secure ingestion process.
- The CSS is currently one large static file. Refactor only after the secure data/auth architecture is chosen.

## Verification Already Done

Browser checks on `http://127.0.0.1:8174`:

- HWDP 131 approved student view: 42 lecture rows, 35 YouTube iframes, 42 transcript buttons.
- HWDP 131 visible syllabus: `Syllabus 1`, one syllabus card.
- DSPR 139 Neoplasia: 5 lecture rows, 3 slide/PDF preview tiles, one syllabus.
- Resource preview drawer opens for `Basics of Neoplasia.pdf`.
- Owner page shows account management, D1/D2 requested access chips, approval buttons, and export queue.
- Google demo login lands in HWDP 131 approved student view.

Script checks:

```bash
node --check assets/js/course-page.js
node --check assets/js/access-demo.js
node --check assets/js/login-demo.js
```

Privacy checks used:

Run a public-file scan for local paths, staging metadata keys, private transcript phrases, and private YouTube IDs while excluding `*.private.js` and `private-staging/**`.

Expected result: no public hits.

Ignore check:

```bash
git check-ignore -v assets/js/youtube-videos.private.js assets/js/transcript-content.private.js private-staging/lecture-assets/manifest.json
```

Expected result: all ignored.

## Suggested First Cursor Tasks

1. Choose the production stack: Supabase + Next.js/Astro is the shortest path.
2. Create Google OAuth login and owner role.
3. Create Postgres tables for users, access requests, access grants, courses, lectures, resources, lecture-resource links, and transcripts.
4. Import current `course-data.js`, `lecture-data.js`, and `resource-map.js` into database seed scripts.
5. Clean canonical syllabi during import.
6. Move private files/transcripts from local staging into private storage.
7. Generate file previews for PDFs/Word/PowerPoints.
8. Replace localStorage checks with real auth and access grants.
9. Replace static resource buttons with signed preview/download URL fetches.
10. Keep the current UI structure unless there is a clear data-driven reason to change it.

## URLs To Review Locally

```text
http://127.0.0.1:8174/index.html
http://127.0.0.1:8174/library.html
http://127.0.0.1:8174/login.html
http://127.0.0.1:8174/owner.html?demo=owner
http://127.0.0.1:8174/course.html?course=HWDP%20131&demo=student
http://127.0.0.1:8174/course.html?course=DSPR%20139&demo=student
```
