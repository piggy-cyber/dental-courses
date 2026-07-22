-- Living Atlas content-correct practice boundary.
--
-- Quizlet source cards remain immutable source material. They are now delivered
-- as recall cards, not automatically fabricated multiple-choice assessments.
-- Existing automated MCQ sessions are retained for founder audit only and are
-- excluded from all current learning, companion, collectible, and pacing data.

alter table public.practice_banks
  drop constraint if exists practice_banks_bank_kind_check;

alter table public.practice_banks
  add constraint practice_banks_bank_kind_check
  check (bank_kind in ('recall_practice', 'practice_problem', 'practice_test'));

alter table public.practice_sessions
  add column if not exists metric_scope text not null default 'current'
    check (metric_scope in ('current', 'legacy'));

create index if not exists practice_sessions_owner_metric_scope_idx
  on public.practice_sessions (user_id, metric_scope, status, updated_at desc);

-- One source-derived bank is one honest recall deck. No change touches the
-- source cards themselves or deletes historical runs/responses.
update public.practice_sessions session
set metric_scope = 'legacy',
    status = case when session.status = 'active' then 'abandoned' else session.status end,
    completed_at = case when session.status = 'active' then coalesce(session.completed_at, now()) else session.completed_at end,
    paused_at = null,
    updated_at = now()
from public.practice_banks bank
where bank.id = session.bank_id
  and bank.provenance = 'source_derived'
  and session.metric_scope <> 'legacy';

update public.practice_banks
set bank_kind = 'recall_practice',
    default_mode = 'tutor',
    updated_at = now()
where provenance = 'source_derived';

-- Versions and variants are retained for audit/history but cannot be selected
-- as current Test Mode material. Approved versions may only transition to
-- retired under the existing immutability guard.
update public.practice_bank_versions version
set status = 'retired', updated_at = now()
from public.practice_banks bank
where bank.id = version.bank_id
  and bank.provenance = 'source_derived'
  and version.status <> 'retired';

update public.practice_variants variant
set status = 'stale',
    review_status = 'stale',
    review_note = 'Retired from Test Mode: source-derived card requires recall delivery or an original reviewed MCQ.',
    updated_at = now()
from public.practice_bank_versions version
join public.practice_banks bank on bank.id = version.bank_id
where version.id = variant.bank_version_id
  and bank.provenance = 'source_derived';

create table if not exists public.practice_recall_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bank_id text not null references public.practice_banks(id) on delete restrict,
  source_id text not null references public.practice_sources(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  current_position integer not null default 1 check (current_position > 0),
  card_count integer not null check (card_count > 0),
  rated_count integer not null default 0 check (rated_count >= 0),
  visible_timer boolean not null default false,
  active_time_ms bigint not null default 0 check (active_time_ms >= 0),
  filters jsonb not null default '{}'::jsonb check (jsonb_typeof(filters) = 'object'),
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  paused_at timestamptz
);

create table if not exists public.practice_recall_session_items (
  session_id uuid not null references public.practice_recall_sessions(id) on delete cascade,
  position integer not null check (position > 0),
  question_id bigint not null references public.practice_questions(id) on delete restrict,
  revealed_at timestamptz,
  rating text check (rating is null or rating in ('again', 'learning', 'know_it')),
  active_time_ms bigint not null default 0 check (active_time_ms >= 0),
  rated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (session_id, position),
  unique (session_id, question_id)
);

create table if not exists public.practice_recall_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id bigint not null references public.practice_questions(id) on delete cascade,
  again_count integer not null default 0 check (again_count >= 0),
  learning_count integer not null default 0 check (learning_count >= 0),
  know_it_count integer not null default 0 check (know_it_count >= 0),
  current_state text not null default 'new' check (current_state in ('new', 'again', 'learning', 'know_it')),
  needs_recall boolean not null default false,
  last_rated_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create index if not exists practice_recall_sessions_owner_status_idx
  on public.practice_recall_sessions (user_id, bank_id, status, updated_at desc);
create index if not exists practice_recall_session_items_session_idx
  on public.practice_recall_session_items (session_id, position);
create index if not exists practice_recall_state_owner_repair_idx
  on public.practice_recall_state (user_id, needs_recall, updated_at desc);

alter table public.practice_recall_sessions enable row level security;
alter table public.practice_recall_session_items enable row level security;
alter table public.practice_recall_state enable row level security;

revoke all on public.practice_recall_sessions from anon, authenticated;
revoke all on public.practice_recall_session_items from anon, authenticated;
revoke all on public.practice_recall_state from anon, authenticated;

drop policy if exists "founder owns recall sessions" on public.practice_recall_sessions;
create policy "founder owns recall sessions" on public.practice_recall_sessions
for all to authenticated
using (((select auth.uid()) = user_id) and (select private.is_owner()))
with check (((select auth.uid()) = user_id) and (select private.is_owner()));

drop policy if exists "founder owns recall session items" on public.practice_recall_session_items;
create policy "founder owns recall session items" on public.practice_recall_session_items
for all to authenticated
using (
  (select private.is_owner()) and exists (
    select 1 from public.practice_recall_sessions session
    where session.id = practice_recall_session_items.session_id
      and session.user_id = (select auth.uid())
  )
)
with check (
  (select private.is_owner()) and exists (
    select 1 from public.practice_recall_sessions session
    where session.id = practice_recall_session_items.session_id
      and session.user_id = (select auth.uid())
  )
);

drop policy if exists "founder owns recall state" on public.practice_recall_state;
create policy "founder owns recall state" on public.practice_recall_state
for all to authenticated
using (((select auth.uid()) = user_id) and (select private.is_owner()))
with check (((select auth.uid()) = user_id) and (select private.is_owner()));

grant select, insert, update on public.practice_recall_sessions to authenticated;
grant select, insert, update on public.practice_recall_session_items to authenticated;
grant select, insert, update on public.practice_recall_state to authenticated;
