create table public.game_rounds (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  round_id uuid not null,
  game_id text not null,
  score integer not null,
  best_streak integer not null,
  correct integer not null,
  attempts integer not null,
  mastery_delta jsonb not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, round_id),
  constraint game_rounds_game_id_length check (char_length(game_id) between 1 and 64),
  constraint game_rounds_score_nonnegative check (score >= 0),
  constraint game_rounds_best_streak_valid check (best_streak >= 0 and best_streak <= correct),
  constraint game_rounds_correct_valid check (correct >= 0 and correct <= attempts),
  constraint game_rounds_attempts_valid check (attempts between 0 and 200),
  constraint game_rounds_mastery_object check (jsonb_typeof(mastery_delta) = 'object')
);

alter table public.game_rounds enable row level security;

revoke all on table public.game_rounds from anon, authenticated;
grant select, insert on table public.game_rounds to authenticated;
grant select, insert on table public.game_rounds to service_role;

create policy "Approved students can read their own game round receipts"
on public.game_rounds
for select
to authenticated
using (
  (select auth.uid()) = profile_id
  and (select private.is_approved())
);

create policy "Approved students can create their own game round receipts"
on public.game_rounds
for insert
to authenticated
with check (
  (select auth.uid()) = profile_id
  and (select private.is_approved())
);

create or replace function public.record_game_round(
  p_round_id uuid,
  p_game_id text,
  p_score integer,
  p_best_streak integer,
  p_correct integer,
  p_attempts integer,
  p_mastery_delta jsonb
)
returns public.game_progress
language plpgsql
security invoker
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  inserted_count integer := 0;
  mastery_correct integer := 0;
  mastery_attempts integer := 0;
  result public.game_progress%rowtype;
begin
  if caller_id is null or not (select private.is_approved()) then
    raise exception 'An approved account is required.' using errcode = '42501';
  end if;

  if p_round_id is null
    or p_game_id is null
    or char_length(p_game_id) not between 1 and 64
    or p_score not between 0 and 1000000
    or p_attempts not between 0 and 200
    or p_correct not between 0 and p_attempts
    or p_best_streak not between 0 and p_correct
    or p_mastery_delta is null
    or jsonb_typeof(p_mastery_delta) <> 'object'
  then
    raise exception 'Invalid game round.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_each(p_mastery_delta) as entry(code, value)
    where jsonb_typeof(value) <> 'object'
      or jsonb_typeof(value -> 'correct') <> 'number'
      or jsonb_typeof(value -> 'attempts') <> 'number'
      or (value ->> 'correct')::integer < 0
      or (value ->> 'attempts')::integer < 1
      or (value ->> 'correct')::integer > (value ->> 'attempts')::integer
  ) then
    raise exception 'Invalid mastery update.' using errcode = '22023';
  end if;

  select
    coalesce(sum((value ->> 'correct')::integer), 0),
    coalesce(sum((value ->> 'attempts')::integer), 0)
  into mastery_correct, mastery_attempts
  from jsonb_each(p_mastery_delta) as entry(code, value);

  if mastery_correct <> p_correct or mastery_attempts <> p_attempts then
    raise exception 'Round totals do not match mastery totals.' using errcode = '22023';
  end if;

  insert into public.game_rounds (
    profile_id,
    round_id,
    game_id,
    score,
    best_streak,
    correct,
    attempts,
    mastery_delta
  )
  values (
    caller_id,
    p_round_id,
    p_game_id,
    p_score,
    p_best_streak,
    p_correct,
    p_attempts,
    p_mastery_delta
  )
  on conflict (profile_id, round_id) do nothing;

  get diagnostics inserted_count = row_count;

  if inserted_count = 1 then
    insert into public.game_progress as current_progress (
      profile_id,
      game_id,
      best_score,
      best_streak,
      total_correct,
      total_attempts,
      rounds_played,
      mastery,
      last_played_at,
      updated_at
    )
    values (
      caller_id,
      p_game_id,
      p_score,
      p_best_streak,
      p_correct,
      p_attempts,
      1,
      p_mastery_delta,
      now(),
      now()
    )
    on conflict (profile_id, game_id) do update
    set best_score = greatest(current_progress.best_score, excluded.best_score),
        best_streak = greatest(current_progress.best_streak, excluded.best_streak),
        total_correct = current_progress.total_correct + excluded.total_correct,
        total_attempts = current_progress.total_attempts + excluded.total_attempts,
        rounds_played = current_progress.rounds_played + 1,
        mastery = (
          select coalesce(
            jsonb_object_agg(
              keys.code,
              jsonb_build_object(
                'correct',
                coalesce((current_progress.mastery -> keys.code ->> 'correct')::integer, 0)
                  + coalesce((excluded.mastery -> keys.code ->> 'correct')::integer, 0),
                'attempts',
                coalesce((current_progress.mastery -> keys.code ->> 'attempts')::integer, 0)
                  + coalesce((excluded.mastery -> keys.code ->> 'attempts')::integer, 0)
              )
            ),
            '{}'::jsonb
          )
          from jsonb_object_keys(current_progress.mastery || excluded.mastery) as keys(code)
        ),
        last_played_at = now(),
        updated_at = now()
    returning * into result;
  else
    select *
    into result
    from public.game_progress
    where profile_id = caller_id
      and game_id = p_game_id;
  end if;

  if result.profile_id is null then
    raise exception 'Game progress is unavailable.' using errcode = 'P0002';
  end if;

  return result;
end;
$$;

revoke all on function public.record_game_round(uuid, text, integer, integer, integer, integer, jsonb)
from public, anon, authenticated, service_role;

grant execute on function public.record_game_round(uuid, text, integer, integer, integer, integer, jsonb)
to authenticated;
