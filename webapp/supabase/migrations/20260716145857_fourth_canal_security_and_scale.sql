-- Fourth Canal security and scale hardening.
--
-- 1. Keep SECURITY DEFINER helpers out of the exposed public API schema.
-- 2. Restrict every application policy to signed-in users.
-- 3. Consolidate overlapping permissive policies.
-- 4. Cache auth lookups in RLS expressions and index foreign-key columns.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

alter function public.is_owner() set schema private;
alter function public.is_approved() set schema private;
alter function public.can_access_resource_collection(text) set schema private;
alter function public.can_access_course(text) set schema private;
alter function public.can_access_course_collection(text, text) set schema private;
alter function public.handle_new_user() set schema private;
alter function public.prevent_self_privilege_escalation() set schema private;
alter function public.sync_student_roster_from_profile() set schema private;

create or replace function private.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'owner'
      and status = 'approved'
  );
$$;

create or replace function private.is_approved()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and status = 'approved'
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
    or exists (
      select 1
      from public.profile_resource_collection_grants g
      join public.profiles p on p.id = g.profile_id
      where g.collection_id = can_access_resource_collection.collection_id
        and p.id = (select auth.uid())
        and p.status = 'approved'
    );
$$;

create or replace function private.can_access_course(course_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.course_collection_members m
    where m.course_code = can_access_course.course_code
      and private.can_access_resource_collection(m.collection_id)
  );
$$;

create or replace function private.can_access_course_collection(
  course_code text,
  collection_id text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.course_collection_members m
    where m.course_code = can_access_course_collection.course_code
      and m.collection_id = can_access_course_collection.collection_id
      and private.can_access_resource_collection(m.collection_id)
  );
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
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
  end if;

  new.updated_at := now();
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

create or replace function public.recheck_roster_matches()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  matched record;
  matched_count integer := 0;
  matched_tier text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
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

revoke all on function private.is_owner() from public, anon, authenticated, service_role;
revoke all on function private.is_approved() from public, anon, authenticated, service_role;
revoke all on function private.can_access_resource_collection(text) from public, anon, authenticated, service_role;
revoke all on function private.can_access_course(text) from public, anon, authenticated, service_role;
revoke all on function private.can_access_course_collection(text, text) from public, anon, authenticated, service_role;
revoke all on function private.handle_new_user() from public, anon, authenticated, service_role;
revoke all on function private.prevent_self_privilege_escalation() from public, anon, authenticated, service_role;
revoke all on function private.sync_student_roster_from_profile() from public, anon, authenticated, service_role;
revoke all on function public.recheck_roster_matches() from public, anon, authenticated, service_role;

grant execute on function private.is_owner() to authenticated, service_role;
grant execute on function private.is_approved() to authenticated, service_role;
grant execute on function private.can_access_resource_collection(text) to authenticated, service_role;
grant execute on function private.can_access_course(text) to authenticated, service_role;
grant execute on function private.can_access_course_collection(text, text) to authenticated, service_role;
grant execute on function private.handle_new_user() to service_role;
grant execute on function private.prevent_self_privilege_escalation() to authenticated, service_role;
grant execute on function private.sync_student_roster_from_profile() to authenticated, service_role;
grant execute on function public.recheck_roster_matches() to service_role;

-- Rebuild overlapping policies as one policy per role and operation.

alter policy "Owners read content events" on public.content_events
  to authenticated using ((select private.is_owner()));

drop policy if exists "owner manages course collection members" on public.course_collection_members;
drop policy if exists "read granted course collection members" on public.course_collection_members;
create policy "read accessible course collection members" on public.course_collection_members
  for select to authenticated
  using (private.can_access_resource_collection(collection_id));
create policy "owner inserts course collection members" on public.course_collection_members
  for insert to authenticated
  with check ((select private.is_owner()));
create policy "owner updates course collection members" on public.course_collection_members
  for update to authenticated
  using ((select private.is_owner()))
  with check ((select private.is_owner()));
create policy "owner deletes course collection members" on public.course_collection_members
  for delete to authenticated
  using ((select private.is_owner()));

drop policy if exists "approved read course_sections" on public.course_sections;
drop policy if exists "owner manage course_sections" on public.course_sections;
create policy "approved read course_sections" on public.course_sections
  for select to authenticated
  using ((select private.is_approved()));
create policy "owner inserts course_sections" on public.course_sections
  for insert to authenticated
  with check ((select private.is_owner()));
create policy "owner updates course_sections" on public.course_sections
  for update to authenticated
  using ((select private.is_owner()))
  with check ((select private.is_owner()));
create policy "owner deletes course_sections" on public.course_sections
  for delete to authenticated
  using ((select private.is_owner()));

alter policy "approved read courses" on public.courses
  to authenticated using (private.can_access_course(code));
alter policy "approved read lectures" on public.lectures
  to authenticated using (private.can_access_resource_collection(resource_collection_id));

drop policy if exists "owner manages collection grants" on public.profile_resource_collection_grants;
drop policy if exists "read own collection grants" on public.profile_resource_collection_grants;
create policy "read own or owner collection grants" on public.profile_resource_collection_grants
  for select to authenticated
  using (profile_id = (select auth.uid()) or (select private.is_owner()));
create policy "owner inserts collection grants" on public.profile_resource_collection_grants
  for insert to authenticated
  with check ((select private.is_owner()));
create policy "owner updates collection grants" on public.profile_resource_collection_grants
  for update to authenticated
  using ((select private.is_owner()))
  with check ((select private.is_owner()));
create policy "owner deletes collection grants" on public.profile_resource_collection_grants
  for delete to authenticated
  using ((select private.is_owner()));

drop policy if exists "owner updates profiles" on public.profiles;
drop policy if exists "read own profile" on public.profiles;
drop policy if exists "update own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select private.is_owner()));
create policy "update own profile or owner" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select private.is_owner()))
  with check (id = (select auth.uid()) or (select private.is_owner()));

drop policy if exists "owner manages resource collections" on public.resource_collections;
drop policy if exists "read granted resource collections" on public.resource_collections;
create policy "read accessible resource collections" on public.resource_collections
  for select to authenticated
  using (private.can_access_resource_collection(id));
create policy "owner inserts resource collections" on public.resource_collections
  for insert to authenticated
  with check ((select private.is_owner()));
create policy "owner updates resource collections" on public.resource_collections
  for update to authenticated
  using ((select private.is_owner()))
  with check ((select private.is_owner()));
create policy "owner deletes resource collections" on public.resource_collections
  for delete to authenticated
  using ((select private.is_owner()));

alter policy "owner reads reports" on public.resource_reports
  to authenticated using ((select private.is_owner()));
alter policy "owner updates reports" on public.resource_reports
  to authenticated
  using ((select private.is_owner()))
  with check ((select private.is_owner()));
alter policy "users insert own reports" on public.resource_reports
  to authenticated with check (user_id = (select auth.uid()));

alter policy "approved read resource_roles" on public.resource_roles
  to authenticated using ((select private.is_approved()));
alter policy "approved read resources" on public.resources
  to authenticated using (private.can_access_resource_collection(resource_collection_id));

alter policy "owner deletes student roster" on public.student_roster
  to authenticated using ((select private.is_owner()));
alter policy "owner inserts student roster" on public.student_roster
  to authenticated with check ((select private.is_owner()));
alter policy "owner reads student roster" on public.student_roster
  to authenticated using ((select private.is_owner()));
alter policy "owner updates student roster" on public.student_roster
  to authenticated
  using ((select private.is_owner()))
  with check ((select private.is_owner()));

alter policy "approved read transcripts" on public.transcripts
  to authenticated
  using (
    exists (
      select 1
      from public.lectures l
      where l.id = transcripts.lecture_id
        and private.can_access_resource_collection(l.resource_collection_id)
    )
  );

-- Public buckets already serve public URLs; the broad SELECT policy only enabled listing.
drop policy if exists "avatars public read" on storage.objects;
alter policy "avatars delete own" on storage.objects
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
alter policy "avatars insert own" on storage.objects
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
alter policy "avatars update own" on storage.objects
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Foreign-key columns used for joins, deletes, and admin filtering.
create index if not exists content_events_actor_idx
  on public.content_events (actor_id);
create index if not exists content_events_collection_idx
  on public.content_events (collection_id);
create index if not exists course_sections_resource_collection_idx
  on public.course_sections (resource_collection_id);
create index if not exists profile_collection_grants_granted_by_idx
  on public.profile_resource_collection_grants (granted_by);
create index if not exists profiles_approved_by_idx
  on public.profiles (approved_by);
create index if not exists profiles_revoked_by_idx
  on public.profiles (revoked_by);
create index if not exists resource_reports_resolved_by_idx
  on public.resource_reports (resolved_by);
create index if not exists resource_reports_user_idx
  on public.resource_reports (user_id);
