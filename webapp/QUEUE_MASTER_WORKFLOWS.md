# QueueMaster workflow and maintenance guide

QueueMaster is the public Fourth Canal homepage and a self-contained application whose lobby and information routes live under `/queue`. It reuses Fourth Canal Google Auth, Supabase, and deployment configuration, but its `queue_*` tables do not grant or reuse Fourth Canal course roles, approval status, or admin permissions.

## Routes

- `/` — QueueMaster product landing page. Legacy `/queue` permanently redirects here.
- `/queue/dashboard` — create/reopen owned and administered lobbies, resume a guest lobby, and answer promotion requests.
- `/queue/r/[slug]/join` — anonymous guest check-in and active-session controls.
- `/queue/r/[slug]/staff` — Google sign-in, explicit staff-pool join, heartbeat, and promotion response.
- `/queue/r/[slug]/admin` — membership heartbeat, availability, guest actions, owner staff controls, and both QR cards.
- `/queue/r/[slug]/display` — read-only classroom view with a permanent guest QR.
- `/queue/about`, `/queue/instructions`, `/queue/privacy`, `/queue/terms`, and `/queue/support` — public product, workflow, legal, and support pages. Legacy `/queue/how-it-works` redirects to `/queue/instructions`.

## Owner workflow

1. Sign in with Google at `/queue/dashboard` and create a lobby. Each owner can keep up to three lobbies active; closing an empty lobby frees a slot without deleting its history.
2. Share the guest QR (`/join`) with guests and the owner-only staff QR (`/staff`) with potential admins.
3. Turn on **Accepting guests**. Admin membership heartbeats run every 20 seconds and expire after 45 seconds.
4. Review active `queue_staff_candidates`, then call the service-only `queue_request_admin_promotion` function through the owner-authorized API.
5. A candidate must accept before a membership is created/reactivated. The new admin begins with `accepting_guests = false`.
6. Before removing an admin, reassign every waiting, called, and helping entry. The database function rejects removal otherwise.

## Guest workflow

1. Scan the guest QR, select an effectively available admin, and enter only first name plus desk/car location.
2. `queue_join_lobby` atomically rejects duplicate active entries and offline/non-accepting admins. The guest position counts only people waiting for the same selected admin.
3. The random guest token stays in an HttpOnly, SameSite=Lax cookie; Supabase stores only its SHA-256 hash.
4. `called` and `helping` are both green public states. The assigned admin or that guest can start helping and finish.
5. A waiting guest can leave. Owner/assigned admin can reorder, reassign, cancel, or no-show according to the server and database transition rules.

## Staff-candidate workflow

1. Scan the staff QR and complete Google sign-in. Authentication alone grants no queue role.
2. Explicitly join the staff pool. The owner-only snapshot includes the candidate's Google name and email.
3. Candidate heartbeat runs every 20 seconds; online state expires after 45 seconds.
4. The owner sends one pending in-app request. Pending requests expire after 24 hours.
5. The candidate accepts or declines from `/staff` or `/queue/dashboard`. Actor IDs always come from the Google session.
6. Acceptance and membership creation happen atomically, then the candidate is sent to `/admin`. Decline keeps the candidate in the pool; leaving cancels a pending request.

## Realtime and privacy

All database mutations advance the lobby revision and publish `queue_changed` with only `lobby_id` and `revision`. Names, emails, locations, tokens, session IDs, candidate IDs, and request IDs are never broadcast. Each client refetches its role-specific server snapshot after a broadcast, reconnect, or polling fallback. Anonymous guest snapshots contain availability and the guest's own active entry, but omit other guests' active-session details.

Every entry, membership, candidate, and promotion action is also checked against the lobby slug in the URL inside the same database transaction. A valid resource ID from another lobby is rejected rather than being acted on through the wrong route.

## Offline and retention behavior

- After 45 seconds without a heartbeat, new guest joins for that admin stop.
- Existing queues are never deleted or moved automatically. Owners receive an offline warning and reassign manually.
- Active entries expire after 12 hours; completed/cancelled/no-show entries after 24 hours; guest sessions after 30 days.
- Closed staff candidates and promotion requests are retained for 30 days.
- The cron retention endpoint must run both `purge_queue_pilot_data` and `purge_queue_staff_pool_data` after the additive migration is released.

## Release boundary

Two additive migrations remain pending for production: `20260901071538_queue_master_staff_pool.sql` replaces email invitations with the in-app staff pool without deleting invitation history, and `20260901100812_queue_master_lobby_lifecycle.sql` adds close/reopen behavior plus the three-active-lobby limit. Do not apply either migration or merge/deploy this branch until the release owner explicitly approves the production migration and release.
