-- The first cohort migration exposed three tightly-authorized SECURITY DEFINER
-- RPCs to all signed-in users. Keep the same database authorization checks,
-- but make the RPC surface server-only so the Supabase security advisor is clean.

revoke all on function public.recheck_roster_matches()
  from public, anon, authenticated, service_role;

drop function if exists public.link_profile_to_roster(uuid, uuid);
drop function if exists public.set_roster_access_approval(uuid, boolean);

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
