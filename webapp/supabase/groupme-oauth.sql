-- Per-user GroupMe OAuth token (set via /api/groupme/callback only).
alter table public.profiles
  add column if not exists groupme_access_token text,
  add column if not exists groupme_connected_at timestamptz;
