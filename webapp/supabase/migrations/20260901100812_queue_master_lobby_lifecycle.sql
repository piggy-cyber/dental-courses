-- QueueMaster lobby lifecycle and per-owner active-lobby pilot limit.
-- Additive only: existing lobbies remain active until an owner closes them.

alter table public.queue_lobbies
  add column closed_at timestamptz;

alter table public.queue_lobbies
  add constraint queue_lobbies_closed_after_creation_chk
  check (closed_at is null or closed_at >= created_at);

create index queue_lobbies_owner_active_idx
  on public.queue_lobbies (owner_profile_id, created_at desc)
  where closed_at is null;

create or replace function private.queue_assert_lobby_open(p_lobby_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  -- The row lock prevents a close operation from racing a new join or promotion.
  perform 1
  from public.queue_lobbies
  where id = p_lobby_id
    and closed_at is null
  for share;

  if not found then
    raise exception 'QUEUE_LOBBY_CLOSED' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function private.queue_assert_lobby_open(uuid)
  from public, anon, authenticated;

create or replace function private.queue_require_open_entry_lobby()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  perform private.queue_assert_lobby_open(new.lobby_id);
  return new;
end;
$$;

revoke all on function private.queue_require_open_entry_lobby()
  from public, anon, authenticated;

create trigger queue_entries_require_open_lobby
before insert on public.queue_entries
for each row execute function private.queue_require_open_entry_lobby();

create or replace function private.queue_require_open_for_accepting()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if new.accepting_guests and not old.accepting_guests then
    perform private.queue_assert_lobby_open(new.lobby_id);
  end if;
  return new;
end;
$$;

revoke all on function private.queue_require_open_for_accepting()
  from public, anon, authenticated;

create trigger queue_memberships_require_open_for_accepting
before update of accepting_guests on public.queue_memberships
for each row execute function private.queue_require_open_for_accepting();

create or replace function private.queue_require_open_staff_join()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if tg_op = 'INSERT' and new.left_at is null then
    perform private.queue_assert_lobby_open(new.lobby_id);
  elsif tg_op = 'UPDATE' and new.left_at is null
        and (old.left_at is not null or new.joined_at is distinct from old.joined_at) then
    perform private.queue_assert_lobby_open(new.lobby_id);
  end if;
  return new;
end;
$$;

revoke all on function private.queue_require_open_staff_join()
  from public, anon, authenticated;

create trigger queue_staff_candidates_require_open_lobby
before insert or update of joined_at, left_at on public.queue_staff_candidates
for each row execute function private.queue_require_open_staff_join();

create or replace function private.queue_require_open_promotion()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if tg_op = 'INSERT' then
    perform private.queue_assert_lobby_open(new.lobby_id);
  elsif new.status = 'accepted' and old.status is distinct from new.status then
    perform private.queue_assert_lobby_open(new.lobby_id);
  end if;
  return new;
end;
$$;

revoke all on function private.queue_require_open_promotion()
  from public, anon, authenticated;

create trigger queue_admin_promotions_require_open_lobby
before insert or update of status on public.queue_admin_promotion_requests
for each row execute function private.queue_require_open_promotion();

create or replace function public.queue_create_lobby(
  p_owner_profile_id uuid,
  p_name text,
  p_slug text,
  p_display_name text
)
returns public.queue_lobbies
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  created_lobby public.queue_lobbies;
begin
  if not exists (select 1 from public.profiles where id = p_owner_profile_id) then
    raise exception 'QUEUE_PROFILE_REQUIRED' using errcode = 'P0001';
  end if;

  -- Serialize lobby creation for one owner so concurrent requests cannot exceed the pilot cap.
  perform pg_advisory_xact_lock(hashtextextended(p_owner_profile_id::text, 0));

  if (
    select count(*)
    from public.queue_lobbies
    where owner_profile_id = p_owner_profile_id
      and closed_at is null
  ) >= 3 then
    raise exception 'QUEUE_LOBBY_LIMIT' using errcode = 'P0001';
  end if;

  insert into public.queue_lobbies (name, slug, owner_profile_id)
  values (btrim(p_name), lower(btrim(p_slug)), p_owner_profile_id)
  returning * into created_lobby;

  insert into public.queue_memberships (
    lobby_id, profile_id, role, display_name, accepting_guests, last_seen_at
  ) values (
    created_lobby.id, p_owner_profile_id, 'owner', btrim(p_display_name), false, now()
  );

  insert into public.queue_transition_events (
    lobby_id, actor_kind, actor_profile_id, event_type
  ) values (
    created_lobby.id, 'staff', p_owner_profile_id, 'lobby_created'
  );

  return created_lobby;
end;
$$;

create or replace function public.queue_set_lobby_closed(
  p_lobby_id uuid,
  p_owner_profile_id uuid,
  p_closed boolean
)
returns public.queue_lobbies
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  target_lobby public.queue_lobbies;
  target_owner_profile_id uuid;
begin
  select owner_profile_id
  into target_owner_profile_id
  from public.queue_lobbies
  where id = p_lobby_id;

  if target_owner_profile_id is null then
    raise exception 'QUEUE_LOBBY_NOT_FOUND' using errcode = 'P0001';
  end if;
  if target_owner_profile_id <> p_owner_profile_id then
    raise exception 'QUEUE_OWNER_REQUIRED' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target_owner_profile_id::text, 0));

  select *
  into target_lobby
  from public.queue_lobbies
  where id = p_lobby_id
  for update;

  if p_closed then
    if target_lobby.closed_at is not null then
      return target_lobby;
    end if;
    if exists (
      select 1
      from public.queue_entries
      where lobby_id = p_lobby_id
        and status in ('waiting', 'called', 'helping')
    ) then
      raise exception 'QUEUE_ACTIVE_ENTRIES' using errcode = 'P0001';
    end if;

    update public.queue_memberships
    set accepting_guests = false,
        updated_at = now()
    where lobby_id = p_lobby_id
      and revoked_at is null
      and accepting_guests;

    update public.queue_lobbies
    set closed_at = now(),
        updated_at = now()
    where id = p_lobby_id
    returning * into target_lobby;

    insert into public.queue_transition_events (
      lobby_id, actor_kind, actor_profile_id, event_type
    ) values (
      p_lobby_id, 'staff', p_owner_profile_id, 'lobby_closed'
    );
  else
    if target_lobby.closed_at is null then
      return target_lobby;
    end if;
    if (
      select count(*)
      from public.queue_lobbies
      where owner_profile_id = p_owner_profile_id
        and closed_at is null
        and id <> p_lobby_id
    ) >= 3 then
      raise exception 'QUEUE_LOBBY_LIMIT' using errcode = 'P0001';
    end if;

    update public.queue_lobbies
    set closed_at = null,
        updated_at = now()
    where id = p_lobby_id
    returning * into target_lobby;

    insert into public.queue_transition_events (
      lobby_id, actor_kind, actor_profile_id, event_type
    ) values (
      p_lobby_id, 'staff', p_owner_profile_id, 'lobby_reopened'
    );
  end if;

  perform private.queue_publish_change(p_lobby_id);
  select * into target_lobby from public.queue_lobbies where id = p_lobby_id;
  return target_lobby;
end;
$$;

revoke all on function public.queue_create_lobby(uuid, text, text, text)
  from public, anon, authenticated;
revoke all on function public.queue_set_lobby_closed(uuid, uuid, boolean)
  from public, anon, authenticated;

grant execute on function public.queue_create_lobby(uuid, text, text, text)
  to service_role;
grant execute on function public.queue_set_lobby_closed(uuid, uuid, boolean)
  to service_role;

comment on column public.queue_lobbies.closed_at is
  'Null for an active lobby. Closed lobbies remain as owner-visible history and do not accept new joins.';
comment on function public.queue_set_lobby_closed(uuid, uuid, boolean) is
  'Owner-only service function for closing or reopening a QueueMaster lobby under the three-active-lobby pilot cap.';
