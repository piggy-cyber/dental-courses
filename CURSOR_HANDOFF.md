# Cursor Handoff: D1 Course Library

**Last updated:** 2026-07-03  
**Primary app:** Next.js 16 webapp in `webapp/` (Supabase backend)  
**Owner account:** `rickahnj@gmail.com` (promote via `node scripts/make-admin.mjs`)

## Goal

Student-facing course library: one place for lectures (Echo360 transcripts + YouTube), slides, study guides, syllabi, mastery guides, and textbook companions. Master-account approval gates access.

## Quick start (Next.js)

```bash
cd webapp
cp .env.example .env.local   # fill Supabase URL + keys (not in git)
npm install
npm run dev                  # http://localhost:3000
```

Required local files (gitignored — must exist on the machine):

```text
webapp/.env.local
assets/js/youtube-videos.private.js
assets/js/transcript-content.private.js
private-staging/student-pillars/
~/Downloads/Case Western D1 Assets/   # or set COURSE_FILES_DIR
```

## Routes

| Route | Who | Purpose |
|-------|-----|---------|
| `/` | Guests, pending | Login + access request |
| `/home` | Approved students | Dashboard |
| `/library` | Approved | Course list + search |
| `/course/[code]` | Approved | Organized course hub |
| `/profile` | Approved | Avatar, bio, username |
| `/about` | Public | About the library |
| `/admin` | Admins | Dashboard |
| `/admin/accounts` | Admins | Approve/revoke access |
| `/admin/team` | Admins | Promote/demote admins |
| `/admin/operations` | Admins | Upload health, reports |
| `/owner` | Redirect | → `/admin/accounts` |

## Auth

- Email magic link (works now)
- Google OAuth (enable in Supabase dashboard + `scripts/enable-google-auth.mjs` hints)
- Roles in `profiles.role`: `student`, `owner` (UI says “Admin”)
- Status: `pending` | `approved` | `revoked`

## Database / Supabase

Schema: `webapp/supabase/schema.sql`  
Additional SQL (run in Supabase SQL Editor if not applied):

```text
webapp/supabase/profile-fields.sql
webapp/supabase/access-fields.sql
webapp/supabase/resource-reports.sql
```

Verify: `node scripts/check-schema.mjs`

## Maintenance scripts

```bash
cd webapp
node scripts/seed.mjs                    # import courses/lectures/resources (preserves storage_path)
node scripts/upload-files.mjs --link-storage   # attach ALL existing bucket files (no re-upload)
node scripts/reconcile-storage.mjs --report    # gap report: needs-upload / not-found / duplicates
node scripts/audit-course-files.mjs --course "HEWB 130"  # lecture placement audit
node scripts/audit-all-courses.mjs                       # all 19 courses summary
node scripts/upload-files.mjs --canvas --course "CODE"    # upload gaps only (after reviewing report)
node scripts/make-admin.mjs email@...    # promote admin
node scripts/check-schema.mjs
```

**Local files root:** `~/Downloads/Case Western D1 Assets` (Course Materials, Cheat Sheets, etc.)  
**Seed filters:** drops ~617 Survival Guide duplicates (`origin: "Survival Guide"`) and known misfiles.  
**Link storage:** scans the `course-files` bucket and sets `storage_path` on resource rows when the filename already exists in storage — run globally after every seed.  
**Reconcile report:** `webapp/reports/storage-reconcile-YYYY-MM-DD.md` lists files ready to upload vs not found on disk.  
**Upload:** stores files under `library/<folder-path>/` mirroring D1 Assets layout; skips Local Media (YouTube).  
**Videos:** IDs in `youtube-videos.private.js`; Local Media rows embed via `webapp/src/lib/youtube-catalog.ts`.

## Course page organization (canonical)

**Goal:** Turn the old Google Drive / Canvas file dump into a **course hub** where students start with the most important documents, then move through lectures in order, with every related file attached near the lecture it belongs to.

**Design:** Restrained student-dashboard — not a marketing landing page. Same layout for every course; no per-course custom UI. Logic lives in shared modules so D2 courses reuse the same pipeline.

### Page flow (always this order)

| # | Section | What students see |
|---|---------|-------------------|
| 1 | **Course header** | Code, title, semester; counts for lectures, transcripts, videos, files online |
| 2 | **Start here / essentials** | One canonical syllabus; Course Mastery Guide (“Cheat sheet”); Textbook Companion (“Textbook version”); **PDF and DOCX** when both exist |
| 3 | **Lecture path** | Video + transcript + matched files per lecture; synthetic slide rows when a course has decks but few real lecture rows |
| 4 | **Supplemental videos** | Local Media matched to YouTube embeds (never uploaded to storage) |
| 5 | **Labs, flashcards & extras** | Unmatched files grouped by kind — never hidden |
| 6 | **Archive** | Survival-guide duplicates / misfiles in a collapsed section (preview/download available, not primary) |

Also: **Report an issue** — single form at bottom (`resource_reports` table).

### Lecture path — dual-track exception (mixed courses)

Simple courses (e.g. **HEWB 130**, **REHE 120**) use one continuous lecture list.

**Mixed courses** (e.g. **HEWB 121** — YouTube modules + Echo360) split section 3 into two labeled blocks (same components, no course-specific forks):

| Subsection | Content | Order |
|------------|---------|--------|
| **Video modules** | Numbered parts (DNA 1,2,5…); shared slides once; hero embed on Part 1; transcript per part | Curriculum `sort_order` |
| **Class sessions** | Dated Echo360 rows; multi-topic titles → topic chips; one transcript per session | By `lecture_date` |

| Lecture shape | Example | Behavior |
|---------------|---------|----------|
| Multi-part module | HEWB 121 FLS YouTube | Series groups; video + transcript per part |
| Multi-topic session | REHE 120 Radiography | “Intro, Anatomy, …” = one block, one transcript |

### Key files

| File | Role |
|------|------|
| [`webapp/src/lib/course-organize.ts`](webapp/src/lib/course-organize.ts) | Essentials, file matching, archive filter, supplemental pool |
| [`webapp/src/lib/lecture-groups.ts`](webapp/src/lib/lecture-groups.ts) | Track classification, series/session grouping, sort |
| [`webapp/src/app/(protected)/course/[code]/page.tsx`](webapp/src/app/(protected)/course/[code]/page.tsx) | Page layout (sections 1–6) |
| [`webapp/src/components/CourseResourceRows.tsx`](webapp/src/components/CourseResourceRows.tsx) | Essentials + file rows |
| [`webapp/src/components/CourseLectureSection.tsx`](webapp/src/components/CourseLectureSection.tsx) | Lecture path UI |
| [`webapp/src/components/ResourceFileActions.tsx`](webapp/src/components/ResourceFileActions.tsx) | Preview drawer + download (signed URLs) |
| [`webapp/scripts/lib/data.mjs`](webapp/scripts/lib/data.mjs) | Matching, canonical syllabus, synthetic rows, `resolveLectureYoutube` |
| [`webapp/scripts/lib/storage-reconcile.mjs`](webapp/scripts/lib/storage-reconcile.mjs) | Shared link/report logic, D1 Assets indexing |
| [`webapp/scripts/reconcile-storage.mjs`](webapp/scripts/reconcile-storage.mjs) | `--link` and `--report` for storage gaps |
| [`webapp/scripts/upload-files.mjs`](webapp/scripts/upload-files.mjs) | Upload local files to Supabase storage |

### Replication rules (data-driven)

- **One canonical syllabus** per course — `canonicalResources()` / `pickEssentials()`
- **Mastery guide + textbook companion** always pinned in Start here
- **Lecture files:** explicit `lecture-data.js` matches first, then title scoring (`relatedResourcesForLecture`)
- **Synthetic slide rows** when a course has slide decks but few dated/transcript lectures (`syntheticLectureRows` → seed)
- **YouTube IDs:** studio catalog first; fall back to `Source:` URL in transcript text (`resolveLectureYoutube`)
- **Videos:** do not upload Local Media; embed via [`youtube-catalog.ts`](webapp/src/lib/youtube-catalog.ts)
- **Files:** private Supabase storage + signed URLs via `/api/resource/[id]` — never public bucket links

### Upload commands

```bash
cd webapp

# 1. Seed catalog (preserves existing storage_path links)
node scripts/seed.mjs

# 2. Link files already in Supabase storage (always run after seed)
node scripts/upload-files.mjs --link-storage
# or: node scripts/reconcile-storage.mjs --link

# 3. Generate upload gap report (no uploads)
node scripts/reconcile-storage.mjs --report
# → webapp/reports/storage-reconcile-YYYY-MM-DD.md

# 4. Audit lecture file placement (optional, per course)
node scripts/audit-course-files.mjs --course "HEWB 130"

# 5. Upload only after reviewing the report (add --compress for oversized PDFs)
node scripts/upload-files.mjs --canvas --compress --course "HEWB 130"
node scripts/upload-files.mjs --canvas   # full library
```

**Rollout pattern:** seed → `--link-storage` → `--report` → review → `--canvas` for gaps only.

### Pilot course

**HEWB 130 Oral Histology** — organized reference implementation.

Top essentials (should be linked in storage):

- `HEWB 130 - Oral Histology - Syllabus.docx`
- `HEWB 130 Oral Histology Course Mastery Guide.pdf` / `.docx`
- `HEWB 130 Oral Histology Textbook Companion.pdf` / `.docx`

Review: `http://127.0.0.1:3000/course/HEWB%20130`

### Validation

```bash
cd webapp
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js
```

Spot-check: HEWB 130 (essentials + lectures), HEWB 121 (4 video series at top + class sessions), REHE 120 (session topic chips).

## Static site (legacy)

Original GitHub Pages shell still in repo root (`index.html`, `course.html`, etc.). Production target is the Next.js app, not Pages.

## What’s not done / next priorities

1. **Deploy** — Vercel + production OAuth redirect URLs  
2. **Global search** — library search is course names only; add cross-course file/lecture search  
3. **Email on approval** — pending users not notified yet  
4. **D1/D2 access tiers** — all approved users see full library  
5. **7 YouTube videos** — HWDP 142 + REHE 120 locals not in `youtube-videos.private.js` (optional)

## Completed (2026-07-03 polish pass)

- **687 unique file resources** in DB (30 duplicate rows removed at seed)  
- **645 files linked** in Supabase storage  
- **Inline file preview** — PDF/Office/image drawer on course pages  
- **Course file audit** — `node scripts/audit-all-courses.mjs` → `webapp/reports/course-audit-2026-07-03.md`  
- **Lecture file placement** — expanded `lectureFiles` for HWDP 131, HWDP 142, HEWB 134  
- **Upload pipeline** — `--compress` (LibreOffice + Ghostscript); dedup in `seed.mjs`

## Git branch

`codex/d1-course-library-draft` on `github.com/piggy-cyber/dental-courses`

## Privacy

Never commit: `.env.local`, `*.private.js`, `private-staging/`, unlisted YouTube IDs, transcript text.
