-- Replace moving D1/D2 account labels with stable graduating classes and
-- permanent resource vintages. Student access is cumulative within a class,
-- while council roles remain a separate administrative responsibility.

alter table public.student_roster
  add column if not exists graduation_year smallint,
  add column if not exists access_approved boolean not null default false,
  add column if not exists access_approved_at timestamptz,
  add column if not exists access_approved_by uuid references public.profiles(id) on delete set null;

-- Convert the legacy d1-2025 / d2-2026 values to their permanent class year.
update public.student_roster
set graduation_year = right(cohort, 4)::smallint
  + (5 - substring(lower(cohort) from 2 for 1)::smallint)
where graduation_year is null
  and lower(cohort) ~ '^d[1-4]-[0-9]{4}$';

do $$
begin
  if exists (select 1 from public.student_roster where graduation_year is null) then
    raise exception 'Every roster row needs a graduation year before this migration can continue';
  end if;
end $$;

alter table public.student_roster
  alter column graduation_year set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_roster_graduation_year_check'
      and conrelid = 'public.student_roster'::regclass
  ) then
    alter table public.student_roster
      add constraint student_roster_graduation_year_check
      check (graduation_year between 2000 and 2200);
  end if;
end $$;

drop index if exists public.student_roster_name_cohort_email_empty_unique;
create index if not exists student_roster_name_graduation_year_idx
  on public.student_roster (graduation_year, lower(full_name));
create index if not exists student_roster_graduation_year_idx
  on public.student_roster (graduation_year);
create index if not exists student_roster_access_approved_by_idx
  on public.student_roster (access_approved_by)
  where access_approved_by is not null;
create index if not exists student_roster_allowed_unlinked_idx
  on public.student_roster (graduation_year, lower(full_name))
  where access_approved and profile_id is null and status <> 'withdrawn';
create unique index if not exists student_roster_profile_unique
  on public.student_roster (profile_id)
  where profile_id is not null;
create unique index if not exists profiles_roster_unique
  on public.profiles (roster_id)
  where roster_id is not null;

alter table public.resource_collections
  add column if not exists graduation_year smallint,
  add column if not exists curriculum_year smallint,
  add column if not exists academic_year_start smallint,
  add column if not exists cumulative_access boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'resource_collections_graduation_year_check'
      and conrelid = 'public.resource_collections'::regclass
  ) then
    alter table public.resource_collections
      add constraint resource_collections_graduation_year_check
      check (graduation_year is null or graduation_year between 2000 and 2200);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'resource_collections_curriculum_year_check'
      and conrelid = 'public.resource_collections'::regclass
  ) then
    alter table public.resource_collections
      add constraint resource_collections_curriculum_year_check
      check (curriculum_year is null or curriculum_year between 1 and 4);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'resource_collections_academic_year_start_check'
      and conrelid = 'public.resource_collections'::regclass
  ) then
    alter table public.resource_collections
      add constraint resource_collections_academic_year_start_check
      check (academic_year_start is null or academic_year_start between 2000 and 2200);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'resource_collections_cumulative_metadata_check'
      and conrelid = 'public.resource_collections'::regclass
  ) then
    alter table public.resource_collections
      add constraint resource_collections_cumulative_metadata_check
      check (
        not cumulative_access
        or (
          graduation_year is not null
          and curriculum_year is not null
          and academic_year_start is not null
        )
      );
  end if;
end $$;

create index if not exists resource_collections_cumulative_class_idx
  on public.resource_collections (graduation_year, curriculum_year, academic_year_start)
  where cumulative_access and is_active;

-- This is the Class of 2029's permanent D1 resource vintage. It remains
-- available when the class becomes D2, D3, and D4.
update public.resource_collections
set label = 'Class of 2029 · D1 · 2025–26',
    short_label = 'Class of 2029 · D1',
    description = 'First-year resources for the Class of 2029. These remain available as the class advances.',
    source_tier = 'd1',
    source_cohort = 'class-2029',
    default_for_tier = false,
    graduation_year = 2029,
    curriculum_year = 1,
    academic_year_start = 2025,
    cumulative_access = true
where id = 'd1-2025-2026';

-- Keep the placeholder D2 set explicitly manual so it can never be granted
-- by the cumulative class rule.
update public.resource_collections
set label = 'D2 · 2025–26 · Admin Preview',
    short_label = 'D2 Admin Preview',
    default_for_tier = false,
    graduation_year = null,
    curriculum_year = null,
    academic_year_start = null,
    cumulative_access = false
where id = 'd2-2025-2026';

create or replace function private.current_curriculum_year(
  graduation_year smallint,
  as_of date default current_date
)
returns smallint
language sql
stable
set search_path = ''
as $$
  select least(
    4,
    greatest(
      0,
      (
        case
          when extract(month from as_of) >= 7 then extract(year from as_of)::integer
          else extract(year from as_of)::integer - 1
        end
      ) - graduation_year::integer + 5
    )
  )::smallint;
$$;

revoke all on function private.current_curriculum_year(smallint, date)
  from public, anon, authenticated, service_role;

create or replace function private.can_access_resource_collection(collection_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_owner()
    or private.has_admin_permission('collections.manage')
    or private.has_admin_permission('courses.manage')
    or private.has_admin_permission('operations.manage')
    or exists (
      select 1
      from public.profile_resource_collection_grants g
      join public.profiles p on p.id = g.profile_id
      where g.collection_id = can_access_resource_collection.collection_id
        and p.id = (select auth.uid())
        and p.status = 'approved'
    )
    or exists (
      select 1
      from public.profiles p
      join public.student_roster r
        on r.id = p.roster_id
       and r.profile_id = p.id
      join public.resource_collections rc
        on rc.id = can_access_resource_collection.collection_id
      where p.id = (select auth.uid())
        and p.status = 'approved'
        and p.roster_match
        and r.status <> 'withdrawn'
        and r.access_approved
        and rc.is_active
        and rc.cumulative_access
        and rc.graduation_year = r.graduation_year
        and rc.curriculum_year <= private.current_curriculum_year(r.graduation_year)
    );
$$;

revoke all on function private.can_access_resource_collection(text)
  from public, anon, authenticated, service_role;
grant execute on function private.can_access_resource_collection(text)
  to authenticated, service_role;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  roster public.student_roster%rowtype;
begin
  select r.*
  into roster
  from public.student_roster r
  where r.email is not null
    and lower(r.email) = lower(coalesce(new.email, ''))
    and r.status <> 'withdrawn'
    and r.access_approved
    and r.profile_id is null
  limit 1;

  insert into public.profiles (
    id,
    email,
    name,
    status,
    approved_at,
    approved_by,
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
    case when roster.id is not null then roster.access_approved_by else null end,
    roster.id,
    roster.id is not null,
    '{}'::text[]
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

create or replace function private.sync_student_roster_from_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.roster_id is not null then
    update public.student_roster
    set profile_id = new.id,
        status = 'signed_in'
    where id = new.roster_id
      and access_approved
      and status <> 'withdrawn';
  elsif coalesce(new.email, '') <> '' then
    update public.student_roster
    set profile_id = new.id,
        status = 'signed_in'
    where profile_id is null
      and email is not null
      and lower(email) = lower(new.email)
      and access_approved
      and status <> 'withdrawn';
  end if;

  return new;
end;
$$;

create or replace function private.enforce_roster_only_council_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  matched_roster public.student_roster%rowtype;
  acting_user uuid := auth.uid();
  council_access_changed boolean;
  grants_council_access boolean;
  had_council_access boolean;
begin
  had_council_access :=
    old.role = 'owner'
    or old.council_title is not null
    or coalesce(cardinality(old.admin_permissions), 0) > 0;

  if new.status is distinct from old.status and had_council_access then
    if acting_user is not null and not private.is_owner() then
      raise exception 'Only the President or Vice President can change a council member status';
    end if;

    if new.status <> 'approved' then
      new.role := 'student';
      new.council_title := null;
      new.admin_permissions := '{}'::text[];
    end if;
  end if;

  if new.status = 'approved' and old.status is distinct from 'approved' then
    select r.*
    into matched_roster
    from public.student_roster r
    where r.email is not null
      and lower(r.email) = lower(coalesce(new.email, ''))
      and r.status <> 'withdrawn'
      and r.access_approved
      and (r.profile_id is null or r.profile_id = new.id)
    limit 1;

    if matched_roster.id is null then
      raise exception 'An allowed Class roster match is required before approval';
    end if;

    new.roster_id := matched_roster.id;
    new.roster_match := true;
  end if;

  council_access_changed :=
    new.role is distinct from old.role
    or new.council_title is distinct from old.council_title
    or new.admin_permissions is distinct from old.admin_permissions
    or new.delegated_at is distinct from old.delegated_at
    or new.delegated_by is distinct from old.delegated_by;

  grants_council_access :=
    new.role = 'owner'
    or new.council_title is not null
    or coalesce(cardinality(new.admin_permissions), 0) > 0;

  if council_access_changed then
    if acting_user is not null and not private.is_owner() then
      raise exception 'Only the President or Vice President can change council access';
    end if;

    if grants_council_access and new.status <> 'approved' then
      raise exception 'Council access requires an approved account';
    end if;

    -- Existing full owners are grandfathered to prevent an accidental lockout.
    if grants_council_access and not (old.role = 'owner' and new.role = 'owner') then
      select r.*
      into matched_roster
      from public.student_roster r
      where r.email is not null
        and lower(r.email) = lower(coalesce(new.email, ''))
        and r.status <> 'withdrawn'
        and r.access_approved
        and (r.profile_id is null or r.profile_id = new.id)
      limit 1;

      if matched_roster.id is null then
        raise exception 'An allowed Class roster match is required before delegating council access';
      end if;

      new.roster_id := matched_roster.id;
      new.roster_match := true;
    end if;

    new.delegated_at := now();
    new.delegated_by := coalesce(acting_user, new.delegated_by, old.delegated_by);
  end if;

  return new;
end;
$$;

create or replace function public.link_profile_to_roster(
  p_actor_id uuid,
  p_profile_id uuid,
  p_roster_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  acting_user uuid := p_actor_id;
  actor_authorized boolean := false;
  actor_is_owner boolean := false;
  target_profile public.profiles%rowtype;
  target_roster public.student_roster%rowtype;
begin
  select true, p.role = 'owner'
  into actor_authorized, actor_is_owner
  from public.profiles p
  where p.id = acting_user
    and p.status = 'approved'
    and (p.role = 'owner' or 'accounts.manage' = any(p.admin_permissions));

  if acting_user is null or not actor_authorized then
    raise exception 'Not authorized to link student accounts';
  end if;

  select p.*
  into target_profile
  from public.profiles p
  where p.id = p_profile_id
  for update;

  if target_profile.id is null then
    raise exception 'Account not found';
  end if;
  if target_profile.id = acting_user and not actor_is_owner then
    raise exception 'A delegated administrator cannot link their own account';
  end if;

  select r.*
  into target_roster
  from public.student_roster r
  where r.id = p_roster_id
  for update;

  if target_roster.id is null then
    raise exception 'Roster student not found';
  end if;
  if target_roster.status = 'withdrawn' then
    raise exception 'A withdrawn roster student cannot be linked';
  end if;
  if not target_roster.access_approved then
    raise exception 'Allow this student on the roster before linking their Google account';
  end if;
  if target_roster.profile_id is not null and target_roster.profile_id <> p_profile_id then
    raise exception 'This roster student is already linked to another Google account';
  end if;
  if target_profile.roster_id is not null and target_profile.roster_id <> p_roster_id then
    raise exception 'This Google account is already linked to another roster student';
  end if;
  if exists (
    select 1
    from public.student_roster r
    where r.id <> p_roster_id
      and r.email is not null
      and lower(r.email) = lower(target_profile.email)
  ) then
    raise exception 'This Google email is already assigned to another roster student';
  end if;

  update public.student_roster
  set email = lower(target_profile.email),
      profile_id = target_profile.id,
      status = 'signed_in'
  where id = target_roster.id;

  update public.profiles
  set roster_id = target_roster.id,
      roster_match = true,
      status = 'approved',
      approved_at = coalesce(approved_at, now()),
      approved_by = coalesce(approved_by, acting_user),
      revoked_at = null,
      revoked_by = null
  where id = target_profile.id;
end;
$$;

revoke all on function public.link_profile_to_roster(uuid, uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.link_profile_to_roster(uuid, uuid, uuid)
  to service_role;

create or replace function public.set_roster_access_approval(
  p_actor_id uuid,
  p_roster_id uuid,
  p_allowed boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  acting_user uuid := p_actor_id;
  actor_authorized boolean := false;
  actor_is_owner boolean := false;
  target_roster public.student_roster%rowtype;
  target_profile public.profiles%rowtype;
begin
  select true, p.role = 'owner'
  into actor_authorized, actor_is_owner
  from public.profiles p
  where p.id = acting_user
    and p.status = 'approved'
    and (p.role = 'owner' or 'roster.manage' = any(p.admin_permissions));

  if acting_user is null or not actor_authorized then
    raise exception 'Not authorized to manage roster access';
  end if;

  select r.*
  into target_roster
  from public.student_roster r
  where r.id = p_roster_id
  for update;

  if target_roster.id is null then
    raise exception 'Roster student not found';
  end if;

  if not p_allowed and target_roster.profile_id is not null then
    select p.*
    into target_profile
    from public.profiles p
    where p.id = target_roster.profile_id
    for update;

    if target_profile.id = acting_user then
      raise exception 'You cannot remove your own roster access';
    end if;

    if target_profile.role = 'owner' and (
      select count(*)
      from public.profiles p
      where p.role = 'owner' and p.status = 'approved'
    ) <= 1 then
      raise exception 'Cannot remove roster access from the last full administrator';
    end if;

    if (
      target_profile.role = 'owner'
      or target_profile.council_title is not null
      or coalesce(cardinality(target_profile.admin_permissions), 0) > 0
    ) and not actor_is_owner then
      raise exception 'Only the President or Vice President can remove access from a council member';
    end if;

    delete from public.profile_resource_collection_grants
    where profile_id = target_profile.id;

    update public.profiles
    set status = 'revoked',
        role = 'student',
        council_title = null,
        admin_permissions = '{}'::text[],
        approved_at = null,
        approved_by = null,
        revoked_at = now(),
        revoked_by = acting_user
    where id = target_profile.id;
  end if;

  update public.student_roster
  set access_approved = p_allowed,
      access_approved_at = case when p_allowed then now() else null end,
      access_approved_by = case when p_allowed then acting_user else null end
  where id = target_roster.id;
end;
$$;

revoke all on function public.set_roster_access_approval(uuid, uuid, boolean)
  from public, anon, authenticated, service_role;
grant execute on function public.set_roster_access_approval(uuid, uuid, boolean)
  to service_role;

create or replace function public.recheck_roster_matches()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  matched record;
  matched_count integer := 0;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then
    raise exception 'Not authorized to recheck roster matches';
  end if;

  for matched in
    select p.id as profile_id, r.id as roster_id
    from public.profiles p
    join public.student_roster r
      on r.email is not null
     and lower(r.email) = lower(p.email)
    where coalesce(p.roster_match, false) = false
      and p.status <> 'revoked'
      and r.status <> 'withdrawn'
      and r.access_approved
      and (r.profile_id is null or r.profile_id = p.id)
  loop
    update public.student_roster
    set profile_id = matched.profile_id,
        status = 'signed_in'
    where id = matched.roster_id;

    update public.profiles
    set status = 'approved',
        approved_at = coalesce(approved_at, now()),
        approved_by = coalesce(approved_by, auth.uid()),
        roster_id = matched.roster_id,
        roster_match = true,
        revoked_at = null,
        revoked_by = null
    where id = matched.profile_id;

    matched_count := matched_count + 1;
  end loop;

  return matched_count;
end;
$$;

revoke all on function public.recheck_roster_matches()
  from public, anon, authenticated, service_role;
grant execute on function public.recheck_roster_matches()
  to service_role;
