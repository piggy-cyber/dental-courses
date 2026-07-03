-- Roster-linked approval, access tiers, and library-tier row security.

alter table public.profiles
  add column if not exists username text,
  add column if not exists bio text,
  add column if not exists avatar_url text,
  add column if not exists access_note text,
  add column if not exists approved_by uuid references public.profiles(id),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists roster_id uuid references public.student_roster(id) on delete set null,
  add column if not exists roster_match boolean not null default false,
  add column if not exists access_tiers text[] not null default '{}'::text[],
  add column if not exists admin_note text,
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by uuid references public.profiles(id);

create index if not exists profiles_roster_idx
  on public.profiles (roster_id);

alter table public.profiles
  drop constraint if exists profiles_access_tiers_check;

alter table public.profiles
  add constraint profiles_access_tiers_check
  check (access_tiers <@ array['d1', 'd2', 'd3', 'd4']::text[]);

alter table public.courses
  add column if not exists library_tier text not null default 'd1';

alter table public.courses
  drop constraint if exists courses_library_tier_check;

alter table public.courses
  add constraint courses_library_tier_check
  check (library_tier in ('d1', 'd2', 'd3', 'd4'));

update public.courses
set library_tier = 'd1'
where library_tier is null or library_tier not in ('d1', 'd2', 'd3', 'd4');

create or replace function public.cohort_to_tier(cohort text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when lower(coalesce(cohort, '')) ~ '^d[1-4]-' then split_part(lower(cohort), '-', 1)
    else null
  end;
$$;

create or replace function public.sync_student_roster_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.roster_id is not null then
    update public.student_roster
    set profile_id = new.id,
        status = 'signed_in'
    where id = new.roster_id;
  elsif coalesce(new.email, '') <> '' then
    update public.student_roster
    set profile_id = new.id,
        status = 'signed_in'
    where profile_id is null
      and email is not null
      and lower(email) = lower(new.email);
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_sync_student_roster on public.profiles;
create trigger profiles_sync_student_roster
  after insert or update of roster_id, email on public.profiles
  for each row execute function public.sync_student_roster_from_profile();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  roster public.student_roster%rowtype;
  matched_tier text;
begin
  select *
  into roster
  from public.student_roster
  where email is not null
    and lower(email) = lower(coalesce(new.email, ''))
  limit 1;

  matched_tier := public.cohort_to_tier(roster.cohort);

  insert into public.profiles (
    id,
    email,
    name,
    status,
    approved_at,
    roster_id,
    roster_match,
    access_tiers
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    case when roster.id is not null then 'approved' else 'pending' end,
    case when roster.id is not null then now() else null end,
    roster.id,
    roster.id is not null,
    case
      when matched_tier is not null then array[matched_tier]::text[]
      else '{}'::text[]
    end
  )
  on conflict (id) do nothing;

  if roster.id is not null then
    update public.student_roster
    set profile_id = new.id,
        status = 'signed_in'
    where id = roster.id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.prevent_self_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id and not public.is_owner() then
    new.role := old.role;
    new.status := old.status;
    new.approved_at := old.approved_at;
    new.approved_by := old.approved_by;
    new.email := old.email;
    new.roster_id := old.roster_id;
    new.roster_match := old.roster_match;
    new.access_tiers := old.access_tiers;
    new.admin_note := old.admin_note;
    new.revoked_at := old.revoked_at;
    new.revoked_by := old.revoked_by;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_guard_privileges on public.profiles;
create trigger profiles_guard_privileges
  before update on public.profiles
  for each row execute function public.prevent_self_privilege_escalation();

create or replace function public.recheck_roster_matches()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  matched record;
  matched_count integer := 0;
  matched_tier text;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.is_owner() then
    raise exception 'not authorized';
  end if;

  for matched in
    select p.id as profile_id, p.access_tiers, r.id as roster_id, r.cohort
    from public.profiles p
    join public.student_roster r
      on r.email is not null
     and lower(r.email) = lower(p.email)
    where coalesce(p.roster_match, false) = false
      and p.status <> 'revoked'
  loop
    matched_tier := public.cohort_to_tier(matched.cohort);

    update public.profiles
    set status = 'approved',
        approved_at = coalesce(approved_at, now()),
        roster_id = matched.roster_id,
        roster_match = true,
        access_tiers = case
          when matched_tier is null then access_tiers
          when matched_tier = any(access_tiers) then access_tiers
          else access_tiers || matched_tier
        end
    where id = matched.profile_id;

    update public.student_roster
    set profile_id = matched.profile_id,
        status = 'signed_in'
    where id = matched.roster_id;

    matched_count := matched_count + 1;
  end loop;

  return matched_count;
end;
$$;

create or replace function public.can_access_course(course_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_owner()
    or exists (
      select 1
      from public.profiles p
      join public.courses c on c.code = course_code
      where p.id = auth.uid()
        and p.status = 'approved'
        and c.library_tier = any(p.access_tiers)
    );
$$;

drop policy if exists "approved read courses" on public.courses;
create policy "approved read courses" on public.courses
  for select using (public.can_access_course(code));

drop policy if exists "approved read lectures" on public.lectures;
create policy "approved read lectures" on public.lectures
  for select using (public.can_access_course(course_code));

drop policy if exists "approved read transcripts" on public.transcripts;
create policy "approved read transcripts" on public.transcripts
  for select using (
    exists (
      select 1
      from public.lectures l
      where l.id = lecture_id
        and public.can_access_course(l.course_code)
    )
  );

drop policy if exists "approved read resources" on public.resources;
create policy "approved read resources" on public.resources
  for select using (public.can_access_course(course_code));
