-- Resource collections and admin-controlled grants.
-- A student's year does not automatically expose every course-year bucket.
-- Admins grant specific resource collections to profiles or cohorts.

create table if not exists public.resource_collections (
  id text primary key,
  label text not null,
  short_label text not null,
  description text,
  source_tier text check (source_tier in ('d1', 'd2', 'd3', 'd4')),
  source_cohort text,
  default_for_tier boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.profile_resource_collection_grants (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  collection_id text not null references public.resource_collections(id) on delete cascade,
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  note text,
  primary key (profile_id, collection_id)
);

create table if not exists public.course_collection_members (
  collection_id text not null references public.resource_collections(id) on delete cascade,
  course_code text not null references public.courses(code) on delete cascade,
  sort_order integer not null default 0,
  display_semester text,
  display_area text,
  created_at timestamptz not null default now(),
  primary key (collection_id, course_code)
);

create index if not exists resource_collections_sort_idx
  on public.resource_collections (sort_order, label);

create index if not exists profile_collection_grants_collection_idx
  on public.profile_resource_collection_grants (collection_id);

create index if not exists course_collection_members_course_idx
  on public.course_collection_members (course_code, sort_order);

insert into public.resource_collections (
  id,
  label,
  short_label,
  description,
  source_tier,
  source_cohort,
  default_for_tier,
  sort_order
)
values (
  'd1-2025-2026',
  'D1 2025-2026 Resources',
  'Your D1 Resources',
  'Current D1 course resources imported from the original library.',
  'd1',
  'd1-2025',
  true,
  10
)
on conflict (id) do update
set label = excluded.label,
    short_label = excluded.short_label,
    description = excluded.description,
    source_tier = excluded.source_tier,
    source_cohort = excluded.source_cohort,
    default_for_tier = excluded.default_for_tier,
    sort_order = excluded.sort_order;

alter table public.courses
  add column if not exists resource_collection_id text
  references public.resource_collections(id);

alter table public.lectures
  add column if not exists resource_collection_id text
  references public.resource_collections(id);

alter table public.resources
  add column if not exists resource_collection_id text
  references public.resource_collections(id);

update public.courses
set resource_collection_id = 'd1-2025-2026'
where resource_collection_id is null;

update public.lectures
set resource_collection_id = 'd1-2025-2026'
where resource_collection_id is null;

update public.resources
set resource_collection_id = 'd1-2025-2026'
where resource_collection_id is null;

alter table public.courses
  alter column resource_collection_id set default 'd1-2025-2026',
  alter column resource_collection_id set not null;

alter table public.lectures
  alter column resource_collection_id set default 'd1-2025-2026',
  alter column resource_collection_id set not null;

alter table public.resources
  alter column resource_collection_id set default 'd1-2025-2026',
  alter column resource_collection_id set not null;

create index if not exists courses_resource_collection_idx
  on public.courses (resource_collection_id, sort_order);

create index if not exists lectures_resource_collection_idx
  on public.lectures (resource_collection_id, course_code, sort_order);

create index if not exists resources_resource_collection_idx
  on public.resources (resource_collection_id, course_code);

insert into public.profile_resource_collection_grants (profile_id, collection_id)
select p.id, rc.id
from public.profiles p
join public.resource_collections rc
  on rc.default_for_tier
 and rc.source_tier = any(coalesce(p.access_tiers, '{}'::text[]))
where p.status = 'approved'
on conflict do nothing;

insert into public.course_collection_members (
  collection_id,
  course_code,
  sort_order,
  display_semester,
  display_area
)
select
  c.resource_collection_id,
  c.code,
  c.sort_order,
  c.semester,
  c.area
from public.courses c
on conflict (collection_id, course_code) do update
set sort_order = excluded.sort_order,
    display_semester = excluded.display_semester,
    display_area = excluded.display_area;

create or replace function public.can_access_resource_collection(collection_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_owner()
    or exists (
      select 1
      from public.profile_resource_collection_grants g
      join public.profiles p on p.id = g.profile_id
      where g.collection_id = can_access_resource_collection.collection_id
        and p.id = auth.uid()
        and p.status = 'approved'
    );
$$;

create or replace function public.can_access_course(course_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.course_collection_members m
    where m.course_code = can_access_course.course_code
      and public.can_access_resource_collection(m.collection_id)
  );
$$;

create or replace function public.can_access_course_collection(course_code text, collection_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.course_collection_members m
    where m.course_code = can_access_course_collection.course_code
      and m.collection_id = can_access_course_collection.collection_id
      and public.can_access_resource_collection(m.collection_id)
  );
$$;

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

  if matched_tier is not null then
    insert into public.profile_resource_collection_grants (profile_id, collection_id)
    select new.id, rc.id
    from public.resource_collections rc
    where rc.is_active
      and rc.default_for_tier
      and rc.source_tier = matched_tier
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

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

    if matched_tier is not null then
      insert into public.profile_resource_collection_grants (profile_id, collection_id)
      select matched.profile_id, rc.id
      from public.resource_collections rc
      where rc.is_active
        and rc.default_for_tier
        and rc.source_tier = matched_tier
      on conflict do nothing;
    end if;

    matched_count := matched_count + 1;
  end loop;

  return matched_count;
end;
$$;

alter table public.resource_collections enable row level security;
alter table public.profile_resource_collection_grants enable row level security;
alter table public.course_collection_members enable row level security;

drop policy if exists "read granted resource collections" on public.resource_collections;
create policy "read granted resource collections" on public.resource_collections
  for select using (public.can_access_resource_collection(id));

drop policy if exists "owner manages resource collections" on public.resource_collections;
create policy "owner manages resource collections" on public.resource_collections
  for all using (public.is_owner()) with check (public.is_owner());

drop policy if exists "read own collection grants" on public.profile_resource_collection_grants;
create policy "read own collection grants" on public.profile_resource_collection_grants
  for select using (profile_id = auth.uid() or public.is_owner());

drop policy if exists "owner manages collection grants" on public.profile_resource_collection_grants;
create policy "owner manages collection grants" on public.profile_resource_collection_grants
  for all using (public.is_owner()) with check (public.is_owner());

drop policy if exists "read granted course collection members" on public.course_collection_members;
create policy "read granted course collection members" on public.course_collection_members
  for select using (public.can_access_resource_collection(collection_id));

drop policy if exists "owner manages course collection members" on public.course_collection_members;
create policy "owner manages course collection members" on public.course_collection_members
  for all using (public.is_owner()) with check (public.is_owner());

drop policy if exists "approved read courses" on public.courses;
create policy "approved read courses" on public.courses
  for select using (public.can_access_course(code));

drop policy if exists "approved read lectures" on public.lectures;
create policy "approved read lectures" on public.lectures
  for select using (public.can_access_resource_collection(resource_collection_id));

drop policy if exists "approved read transcripts" on public.transcripts;
create policy "approved read transcripts" on public.transcripts
  for select using (
    exists (
      select 1
      from public.lectures l
      where l.id = lecture_id
        and public.can_access_resource_collection(l.resource_collection_id)
    )
  );

drop policy if exists "approved read resources" on public.resources;
create policy "approved read resources" on public.resources
  for select using (public.can_access_resource_collection(resource_collection_id));
