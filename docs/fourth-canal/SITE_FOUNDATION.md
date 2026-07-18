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
