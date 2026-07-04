# AI Handoff - 2026-07-04

## Current Scope

This handoff covers the academic portal redesign, D2 resource readiness, admin-wide access wording, and the admin-only D2 preview collection.

The working branch for the implementation run was `codex/theme-mode-review`. If this file is present on `main`, the requested push-to-main flow should already be complete. If it is only present on the review branch, finish by merging or fast-forwarding `main` and pushing `origin main`.

## Shipped Behavior

- Admins use the existing `owner` role and Supabase policy path; no schema change was added.
- Admins can read all available resource collections through `public.can_access_resource_collection()`.
- Student-facing collection copy still says granted collections; admin-facing copy now says all available collections.
- The D2 admin preview is intentionally not default-granted and has zero student grants.
- The D2 preview course route is `/course/D2QA%20100?collection=d2-2025-2026`.

## D2 Preview Data

- Tracked manifest: `webapp/data/resource-manifests/d2-admin-preview.json`
- Collection: `d2-2025-2026`
- Course: `D2QA 100`
- Lecture: `d2-2025-2026-d2qa-100-orientation`
- Resource row: `D2 admin preview placeholder.pdf`

The preview content is for admin navigation QA only. Replace it with a real D2 manifest later, then upload/reconcile files with collection filtering, for example:

```bash
node scripts/import-resource-manifest.mjs --file webapp/data/resource-manifests/d2-admin-preview.json
node scripts/upload-files.mjs --canvas --collection d2-2025-2026
node scripts/reconcile-storage.mjs --report --collection d2-2025-2026
```

## Verification Completed

Commands run from `webapp/`:

```bash
node scripts/import-resource-manifest.mjs --file webapp/data/resource-manifests/d2-admin-preview.json --dry
node --check scripts/import-resource-manifest.mjs
tsc --noEmit
eslint
next build
node scripts/import-resource-manifest.mjs --file webapp/data/resource-manifests/d2-admin-preview.json
```

Supabase verification after import:

- `resource_collections` contains `d2-2025-2026`.
- `course_collection_members` contains `D2QA 100` for `d2-2025-2026`.
- `resources` and `lectures` each contain one row scoped to `d2-2025-2026`.
- `profile_resource_collection_grants` has zero rows for `d2-2025-2026`.
- Anonymous Supabase reads returned no visible D2 collection.

Browser note: the in-app browser blocked local route navigation with its URL policy / `ERR_NETWORK_IO_SUSPENDED`, so route verification was not bypassed. Use the live app or a normal browser session to visually confirm `/library`, `/home`, and the D2 preview course page.

## Do Not Accidentally Stage

The repo had pre-existing untracked report artifacts under `webapp/reports/` before this handoff file was added. Only `webapp/reports/2026-07-04-ai-handoff.md` is intended to be committed from that folder unless the user explicitly asks for the older report artifacts.
