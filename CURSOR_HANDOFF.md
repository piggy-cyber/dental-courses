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
~/Downloads/Case Western D1 2025-2026/   # or set COURSE_FILES_DIR
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
node scripts/upload-files.mjs --canvas  # upload files to Supabase storage
node scripts/make-admin.mjs email@...    # promote admin
node scripts/check-schema.mjs
```

**Seed filters:** drops ~617 Survival Guide duplicates (`origin: "Survival Guide"`) and known misfiles.  
**Upload:** stores files under `library/<folder-path>/` mirroring Downloads layout; skips Local Media (YouTube).  
**Videos:** IDs in `youtube-videos.private.js`; Local Media rows embed via `webapp/src/lib/youtube-catalog.ts`.

## Course page organization

Implemented in `webapp/src/lib/course-organize.ts`:

1. **Start here** — one syllabus, one mastery guide PDF, one textbook companion PDF  
2. **Lectures** — real rows only (`synthetic = false`); files matched via `lecture-data.js` + title scoring  
3. **Labs & extras** — flashcards, lab guides, unmatched files  
4. **Report problem** — `resource_reports` table (needs SQL migration)

Pilot course: **HEWB 130 Oral Histology** — 10 lectures, ~48 resources (was 109 before cleanup).

## Static site (legacy)

Original GitHub Pages shell still in repo root (`index.html`, `course.html`, etc.). Production target is the Next.js app, not Pages.

## What’s not done / next priorities

1. **Deploy** — Vercel + production OAuth redirect URLs  
2. **Finish file upload** — re-run `upload-files.mjs --canvas` after seed (717 resources in DB)  
3. **PDF inline preview** — currently opens signed URL in new tab  
4. **Global search** — library search is course names only  
5. **Email on approval** — pending users not notified yet  
6. **D1/D2 access tiers** — all approved users see full library  
7. **7 YouTube videos** — HWDP 142 + REHE 120 locals not in `youtube-videos.private.js` (user chose to ignore)

## Git branch

`codex/d1-course-library-draft` on `github.com/piggy-cyber/dental-courses`

## Privacy

Never commit: `.env.local`, `*.private.js`, `private-staging/`, unlisted YouTube IDs, transcript text.
