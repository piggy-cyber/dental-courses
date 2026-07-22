# Fourth Canal Project 1 — Functional Site Foundation

Status: Owner approved for implementation on 2026-07-18.
Branch: `codex/site-foundation`.
Release boundary: preview and review only; production promotion and the live Supabase migration require a separate explicit owner approval.

## Outcome

Make Fourth Canal a reliable, legitimate dental-student study platform before expanding its audience or educational-content scope.

## Included milestones

1. Public reliability, accessibility, and baseline security controls.
2. Dental-student SEO, clear ownership/editorial information, and privacy-preserving measurement.
3. Public support reporting, protected admin triage, and health monitoring.
4. Backward-compatible Supabase migration, automated checks, and a reviewable Vercel preview.

## Acceptance criteria

- Public pages remain useful when Supabase Auth is temporarily unavailable; protected pages still require server-side authorization.
- Invalid sessions recover without a runtime exception; ordinary users receive redirects or 404s rather than authorization crashes.
- Public support reports are CAPTCHA-verified, rate-limited without retaining raw IP addresses, and visible to operations administrators.
- Public metadata, canonicals, sitemap, robots rules, structured data, and support links are consistent with the dental-student audience.
- No production deployment, production database mutation, secret disclosure, or unrelated-file staging occurs during this project without additional approval.

## Deferred

- Patient/family positioning, public clinical-consumer content, game redesign, automatic production deployment, and an architecture migration.

## Production release gate

The review preview is the release candidate. Do not promote it or apply the
database migration until the owner explicitly approves both actions.

Before that approval, the release operator must have configured these Vercel
variables for Production (and Preview if a fully functional support-form
rehearsal is required):

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- `SUPPORT_RATE_LIMIT_SECRET`

The existing `SUPABASE_SECRET_KEY` remains server-only. Never add any of these
values to source control. Configure the Turnstile widget to accept
`fourthcanal.com` and `www.fourthcanal.com` before enabling the live form.

Release order after approval:

1. Apply `webapp/supabase/migrations/20260718175551_public_support_foundation.sql` to the live Supabase project.
2. Verify the new `resource_reports` fields, the private rate-limit table,
   function grants, RLS, and security advisors.
3. Confirm a real Turnstile-protected support report appears in
   `/admin/operations`; verify that the stored record contains only the HMAC
   fingerprint, not a raw IP address.
4. Promote the already-tested Vercel preview, confirm `/api/health` returns
   `200`, and recheck runtime errors.
5. Verify the production domain in Google Search Console and submit
   `https://fourthcanal.com/sitemap.xml` for indexing.

The migration is forward-compatible with the old application code. If a web
rollback is needed, roll back the Vercel deployment; do not reverse or delete
support reports as part of the release response.
