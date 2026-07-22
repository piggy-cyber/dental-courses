-- Compact, revision-aware browser sync for the isolated Living Atlas runner.
-- The browser never receives answer keys. Revisions only order learner-owned
-- draft state so delayed background saves cannot replace newer local work.

alter table public.practice_sessions
  add column if not exists client_revision bigint not null default 0
    check (client_revision >= 0);

alter table public.practice_session_items
  add column if not exists client_revision bigint not null default 0
    check (client_revision >= 0);

create index if not exists practice_session_items_sync_revision_idx
  on public.practice_session_items (session_id, client_revision);
