-- Strict roster-only approval and delegated student-council administration.
--
-- Existing approved accounts are preserved. From this migration forward:
--   * a pending/revoked account cannot become approved without an exact active
--     student_roster email match;
--   * only a full owner (President/Vice President) can delegate council access;
--   * delegated members receive only the named permissions stored on profiles;
--   * authorization is enforced in both server code and RLS helpers.

alter table public.profiles
  add column if not exists council_title text,
  add column if not exists admin_permissions text[] not null default '{}'::text[],
  add column if not exists delegated_at timestamptz,
  add column if not exists delegated_by uuid references public.profiles(id) on delete set null;

update public.profiles
set admin_permissions = '{}'::text[]
where admin_permissions is null;

alter table public.profiles
  alter column admin_permissions set default '{}'::text[],
  alter column admin_permissions set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_admin_permissions_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_admin_permissions_check
      check (
        admin_permissions <@ array[
          'accounts.manage',
          'roster.manage',
          'collections.manage',
          'courses.manage',
          'operations.manage'
        ]::text[]
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_council_title_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_council_title_check
      check (council_title is null or char_length(btrim(council_title)) between 2 and 80);
  end if;
end $$;

create index if not exists profiles_delegated_by_idx
  on public.profiles (delegated_by)
  where delegated_by is not null;

create or replace function private.has_admin_permission(requested_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.status = 'approved'
      and (
        p.role = 'owner'
        or requested_permission = any(p.admin_permissions)
      )
  );
$$;

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
    );
$$;

create or replace function private.prevent_self_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() = old.id and not private.is_owner() then
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
    new.council_title := old.council_title;
    new.admin_permissions := old.admin_permissions;
    new.delegated_at := old.delegated_at;
    new.delegated_by := old.delegated_by;
  end if;

  new.updated_at := now();
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
      and (r.profile_id is null or r.profile_id = new.id)
    limit 1;

    if matched_roster.id is null then
      raise exception 'Exact roster email match required before approval';
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

    -- Existing full owners are grandfathered so the current President is not
    -- locked out while roster emails are cleaned up. Every new delegation,
    -- including a new Vice President, must have an exact roster match.
    if grants_council_access and not (old.role = 'owner' and new.role = 'owner') then
      select r.*
      into matched_roster
      from public.student_roster r
      where r.email is not null
        and lower(r.email) = lower(coalesce(new.email, ''))
        and r.status <> 'withdrawn'
        and (r.profile_id is null or r.profile_id = new.id)
      limit 1;

      if matched_roster.id is null then
        raise exception 'Exact roster email match required before delegating council access';
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

create or replace function private.prevent_authenticated_profile_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and new.email is distinct from old.email then
    raise exception 'Profile email is controlled by Google sign-in and cannot be edited';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_enforce_roster_only_council_access on public.profiles;
create trigger profiles_enforce_roster_only_council_access
  before update of status, role, council_title, admin_permissions, delegated_at, delegated_by
  on public.profiles
  for each row execute function private.enforce_roster_only_council_access();

drop trigger if exists profiles_prevent_authenticated_email_change on public.profiles;
create trigger profiles_prevent_authenticated_email_change
  before update of email on public.profiles
  for each row execute function private.prevent_authenticated_profile_email_change();

revoke all on function private.has_admin_permission(text)
  from public, anon, authenticated, service_role;
revoke all on function private.enforce_roster_only_council_access()
  from public, anon, authenticated, service_role;
revoke all on function private.prevent_authenticated_profile_email_change()
  from public, anon, authenticated, service_role;
grant execute on function private.has_admin_permission(text)
  to authenticated, service_role;

-- Profiles: users read/update themselves; membership staff can manage access;
-- operations staff may identify report authors. Council fields are still
-- protected by the trigger above and can only be changed by full owners.
drop policy if exists "read own profile" on public.profiles;
drop policy if exists "update own profile or owner" on public.profiles;
create policy "read own or delegated profiles" on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or (select private.has_admin_permission('accounts.manage'))
    or (select private.has_admin_permission('roster.manage'))
    or (select private.has_admin_permission('operations.manage'))
  );
create policy "update own or delegated profiles" on public.profiles
  for update to authenticated
  using (
    id = (select auth.uid())
    or (select private.has_admin_permission('accounts.manage'))
  )
  with check (
    id = (select auth.uid())
    or (select private.has_admin_permission('accounts.manage'))
  );

-- Roster management and exact-email admission.
drop policy if exists "owner reads student roster" on public.student_roster;
drop policy if exists "owner inserts student roster" on public.student_roster;
drop policy if exists "owner updates student roster" on public.student_roster;
drop policy if exists "owner deletes student roster" on public.student_roster;
create policy "delegated read student roster" on public.student_roster
  for select to authenticated
  using (
    (select private.has_admin_permission('roster.manage'))
    or (select private.has_admin_permission('accounts.manage'))
  );
create policy "delegated insert student roster" on public.student_roster
  for insert to authenticated
  with check ((select private.has_admin_permission('roster.manage')));
create policy "delegated update student roster" on public.student_roster
  for update to authenticated
  using ((select private.has_admin_permission('roster.manage')))
  with check ((select private.has_admin_permission('roster.manage')));
create policy "delegated delete student roster" on public.student_roster
  for delete to authenticated
  using ((select private.has_admin_permission('roster.manage')));

-- Student collection grants belong to membership/access staff.
drop policy if exists "read own or owner collection grants" on public.profile_resource_collection_grants;
drop policy if exists "owner inserts collection grants" on public.profile_resource_collection_grants;
drop policy if exists "owner updates collection grants" on public.profile_resource_collection_grants;
drop policy if exists "owner deletes collection grants" on public.profile_resource_collection_grants;
create policy "read own or delegated collection grants" on public.profile_resource_collection_grants
  for select to authenticated
  using (
    profile_id = (select auth.uid())
    or (select private.has_admin_permission('accounts.manage'))
  );
create policy "delegated insert collection grants" on public.profile_resource_collection_grants
  for insert to authenticated
  with check ((select private.has_admin_permission('accounts.manage')));
create policy "delegated update collection grants" on public.profile_resource_collection_grants
  for update to authenticated
  using ((select private.has_admin_permission('accounts.manage')))
  with check ((select private.has_admin_permission('accounts.manage')));
create policy "delegated delete collection grants" on public.profile_resource_collection_grants
  for delete to authenticated
  using ((select private.has_admin_permission('accounts.manage')));

-- Access staff need collection names to assign grants, but not the courses,
-- lectures, or files inside those collections.
drop policy if exists "access staff read resource collection labels" on public.resource_collections;
create policy "access staff read resource collection labels" on public.resource_collections
  for select to authenticated
  using ((select private.has_admin_permission('accounts.manage')));

-- Collection structure may be delegated independently from course content.
drop policy if exists "owner inserts resource collections" on public.resource_collections;
drop policy if exists "owner updates resource collections" on public.resource_collections;
drop policy if exists "owner deletes resource collections" on public.resource_collections;
create policy "delegated insert resource collections" on public.resource_collections
  for insert to authenticated
  with check ((select private.has_admin_permission('collections.manage')));
create policy "delegated update resource collections" on public.resource_collections
  for update to authenticated
  using ((select private.has_admin_permission('collections.manage')))
  with check ((select private.has_admin_permission('collections.manage')));
create policy "delegated delete resource collections" on public.resource_collections
  for delete to authenticated
  using ((select private.has_admin_permission('collections.manage')));

drop policy if exists "owner inserts course collection members" on public.course_collection_members;
drop policy if exists "owner updates course collection members" on public.course_collection_members;
drop policy if exists "owner deletes course collection members" on public.course_collection_members;
create policy "delegated insert course collection members" on public.course_collection_members
  for insert to authenticated
  with check (
    (select private.has_admin_permission('collections.manage'))
    or (select private.has_admin_permission('courses.manage'))
  );
create policy "delegated update course collection members" on public.course_collection_members
  for update to authenticated
  using (
    (select private.has_admin_permission('collections.manage'))
    or (select private.has_admin_permission('courses.manage'))
  )
  with check (
    (select private.has_admin_permission('collections.manage'))
    or (select private.has_admin_permission('courses.manage'))
  );
create policy "delegated delete course collection members" on public.course_collection_members
  for delete to authenticated
  using (
    (select private.has_admin_permission('collections.manage'))
    or (select private.has_admin_permission('courses.manage'))
  );

drop policy if exists "owner inserts course_sections" on public.course_sections;
drop policy if exists "owner updates course_sections" on public.course_sections;
drop policy if exists "owner deletes course_sections" on public.course_sections;
create policy "delegated insert course_sections" on public.course_sections
  for insert to authenticated
  with check ((select private.has_admin_permission('courses.manage')));
create policy "delegated update course_sections" on public.course_sections
  for update to authenticated
  using ((select private.has_admin_permission('courses.manage')))
  with check ((select private.has_admin_permission('courses.manage')));
create policy "delegated delete course_sections" on public.course_sections
  for delete to authenticated
  using ((select private.has_admin_permission('courses.manage')));

-- Course history and student reports.
drop policy if exists "Owners read content events" on public.content_events;
create policy "delegated read content events" on public.content_events
  for select to authenticated
  using (
    (select private.has_admin_permission('courses.manage'))
    or (select private.has_admin_permission('operations.manage'))
  );

drop policy if exists "owner reads reports" on public.resource_reports;
drop policy if exists "owner updates reports" on public.resource_reports;
create policy "delegated read reports" on public.resource_reports
  for select to authenticated
  using ((select private.has_admin_permission('operations.manage')));
create policy "delegated update reports" on public.resource_reports
  for update to authenticated
  using ((select private.has_admin_permission('operations.manage')))
  with check ((select private.has_admin_permission('operations.manage')));
