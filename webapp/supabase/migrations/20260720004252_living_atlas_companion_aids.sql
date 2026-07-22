-- Living Atlas companion progression, cosmetic collectibles, and Study-only
-- aid receipts. All authoritative aid outcomes remain server controlled.

alter table public.practice_question_state
  add column if not exists echo_repairs integer not null default 0;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'practice_question_state_echo_repairs_check') then
    alter table public.practice_question_state
      add constraint practice_question_state_echo_repairs_check check (echo_repairs >= 0);
  end if;
end $$;

create table if not exists public.practice_companion_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  companion_id text not null default 'white-holland-lop'
    check (companion_id in ('white-holland-lop')),
  chorus_opt_in boolean not null default false,
  equipped_head text,
  equipped_collar text,
  equipped_body text,
  equipped_accessory text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.practice_collectible_unlocks (
  user_id uuid not null references auth.users(id) on delete cascade,
  collectible_id text not null,
  source_event text not null,
  unlocked_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  primary key (user_id, collectible_id)
);

create table if not exists public.practice_session_aid_uses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.practice_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  position integer not null check (position > 0),
  aid_type text not null check (aid_type in ('prism_split', 'atlas_chorus', 'bunny_nudge', 'rift_turn')),
  outcome jsonb not null check (jsonb_typeof(outcome) = 'object'),
  created_at timestamptz not null default now(),
  unique (session_id, position, aid_type)
);

create or replace function private.enforce_practice_session_aid_limit()
returns trigger
language plpgsql
set search_path = public, private
as $$
declare
  v_owner uuid;
  v_count integer;
begin
  select user_id into v_owner
  from public.practice_sessions
  where id = new.session_id
  for update;

  if v_owner is null or v_owner <> new.user_id then
    raise exception 'living_atlas_aid_owner_mismatch';
  end if;

  select count(*) into v_count
  from public.practice_session_aid_uses
  where session_id = new.session_id;

  if v_count >= 3 then
    raise exception 'living_atlas_aid_limit_reached';
  end if;

  return new;
end;
$$;

drop trigger if exists practice_session_aid_limit on public.practice_session_aid_uses;
create trigger practice_session_aid_limit
before insert on public.practice_session_aid_uses
for each row execute function private.enforce_practice_session_aid_limit();

alter table public.practice_companion_profiles enable row level security;
alter table public.practice_collectible_unlocks enable row level security;
alter table public.practice_session_aid_uses enable row level security;

drop policy if exists "founder owns companion profile" on public.practice_companion_profiles;
create policy "founder owns companion profile" on public.practice_companion_profiles
for all to authenticated
using (((select auth.uid()) = user_id) and (select private.is_owner()))
with check (((select auth.uid()) = user_id) and (select private.is_owner()));

drop policy if exists "founder owns collectible unlocks" on public.practice_collectible_unlocks;
create policy "founder owns collectible unlocks" on public.practice_collectible_unlocks
for select to authenticated
using (((select auth.uid()) = user_id) and (select private.is_owner()));

drop policy if exists "founder owns session aid uses" on public.practice_session_aid_uses;
create policy "founder owns session aid uses" on public.practice_session_aid_uses
for select to authenticated
using (((select auth.uid()) = user_id) and (select private.is_owner()));

grant select, insert, update on public.practice_companion_profiles to authenticated;
grant select on public.practice_collectible_unlocks to authenticated;
grant select on public.practice_session_aid_uses to authenticated;

create index if not exists practice_session_aid_uses_owner_session_idx
  on public.practice_session_aid_uses (user_id, session_id, created_at);
create unique index if not exists practice_session_aid_uses_session_type_unique
  on public.practice_session_aid_uses (session_id, aid_type);
create index if not exists practice_collectible_unlocks_owner_idx
  on public.practice_collectible_unlocks (user_id, unlocked_at desc);
create index if not exists practice_responses_variant_user_answered_idx
  on public.practice_responses (variant_id, user_id, answered_at);
