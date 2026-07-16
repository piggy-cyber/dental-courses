create table public.game_progress (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  game_id text not null,
  best_score integer not null default 0,
  best_streak integer not null default 0,
  total_correct integer not null default 0,
  total_attempts integer not null default 0,
  rounds_played integer not null default 0,
  mastery jsonb not null default '{}'::jsonb,
  last_played_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (profile_id, game_id),
  constraint game_progress_game_id_length check (char_length(game_id) between 1 and 64),
  constraint game_progress_best_score_nonnegative check (best_score >= 0),
  constraint game_progress_best_streak_nonnegative check (best_streak >= 0),
  constraint game_progress_total_correct_nonnegative check (total_correct >= 0),
  constraint game_progress_total_attempts_nonnegative check (total_attempts >= 0),
  constraint game_progress_rounds_played_nonnegative check (rounds_played >= 0),
  constraint game_progress_correct_within_attempts check (total_correct <= total_attempts),
  constraint game_progress_mastery_object check (jsonb_typeof(mastery) = 'object')
);

alter table public.game_progress enable row level security;

revoke all on table public.game_progress from anon, authenticated;
grant select, insert, update on table public.game_progress to authenticated;
grant select, insert, update on table public.game_progress to service_role;

create policy "Approved students can read their own game progress"
on public.game_progress
for select
to authenticated
using (
  (select auth.uid()) = profile_id
  and (select private.is_approved())
);

create policy "Approved students can create their own game progress"
on public.game_progress
for insert
to authenticated
with check (
  (select auth.uid()) = profile_id
  and (select private.is_approved())
);

create policy "Approved students can update their own game progress"
on public.game_progress
for update
to authenticated
using (
  (select auth.uid()) = profile_id
  and (select private.is_approved())
)
with check (
  (select auth.uid()) = profile_id
  and (select private.is_approved())
);
