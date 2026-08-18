# Lab Help Queue

Status: owner-approved review milestone, 2026-08-18. Production release is not approved.

## Outcome

Provide a public, standalone page at `/lab-help-queue` where a student can request lab help without signing in and see the current queue grouped and numbered independently by professor. Add a locally saved submission preset to the existing Fourth Canal VisiLearn Chrome extension.

## Milestone acceptance

- The page is titled **Lab Help Queue** and contains no Fourth Canal navigation, tabs, home links, redirect controls, or sign-in requirement.
- The professor list and order are exactly: Dr. T, Dr. J, Dr. Berns, Dr. LaSalvia, Dr. Markarian, Dr. Zakhary, Dr. Ali, and Dr. Tarik.
- Name, bench seat, and professor are required; issue is optional. Inputs such as `#88` normalize to bench `88`.
- Active entries are grouped by professor and numbered independently in submission order.
- The page polls a sanitized same-origin API. The database remains inaccessible to anonymous browser roles.
- Anonymous abuse controls include Cloudflare Turnstile human verification (without a login), validation, a real honeypot field, same-origin JSON enforcement, short-lived signed submission tokens, HMAC request fingerprints, a 300-request-per-hour shared-network ceiling, per-browser rate limits, idempotency, and one active request per browser identifier.
- Active requests expire after eight hours. Leaving deletes the request immediately, and the existing CRON-secret-protected Vercel retention system permanently removes all remaining expired student details and stale rate-limit records.
- The extension stores one queue preset only in the local Chrome profile and submits the visible Fourth Canal form once after an explicit click. It does not navigate or contact Supabase directly.
- Existing Fourth Canal website, Echo360, YouTube, MODI, and download behavior remains unchanged.

## Release boundary

All work stays on a review branch/copy until Rick approves the preview. Applying the Supabase migration, replacing the canonical extension source, merging, and production deployment are separate release actions.

Production requires the existing `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and server-only `TURNSTILE_SECRET_KEY` Vercel variables. Test keys are accepted only outside production; production fails closed if a Cloudflare dummy secret is configured. The Turnstile widget must allow `fourthcanal.com` before release.
