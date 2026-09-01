-- QueueMaster local pilot. This is an isolated queue domain; it does not alter
-- Fourth Canal profile authorization or the existing lab_help_queue_entries flow.

create table public.queue_lobbies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) between 3 and 64),
  owner_profile_id uuid not null references public.profiles(id) on delete restrict,
  revision bigint not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index queue_lobbies_slug_lower_uidx on public.queue_lobbies (lower(slug));
create index queue_lobbies_owner_idx on public.queue_lobbies (owner_profile_id, created_at desc);

create table public.queue_memberships (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.queue_lobbies(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  role text not null check (role in ('owner', 'admin')),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  accepting_guests boolean not null default false,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lobby_id, profile_id)
);

create unique index queue_memberships_one_owner_idx
  on public.queue_memberships (lobby_id)
  where role = 'owner' and revoked_at is null;
create index queue_memberships_profile_idx
  on public.queue_memberships (profile_id, revoked_at, created_at desc);
create index queue_memberships_lobby_active_idx
  on public.queue_memberships (lobby_id, revoked_at, display_name);

create table public.queue_admin_invitations (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.queue_lobbies(id) on delete cascade,
  email text not null check (email = lower(btrim(email)) and email like '%@%'),
  invited_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  claimed_by_profile_id uuid references public.profiles(id) on delete restrict,
  claimed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check ((claimed_by_profile_id is null) = (claimed_at is null))
);

create unique index queue_admin_invitations_active_email_idx
  on public.queue_admin_invitations (lobby_id, email)
  where revoked_at is null;
create index queue_admin_invitations_claim_idx
  on public.queue_admin_invitations (email, claimed_at, revoked_at);

create table public.queue_guest_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  last_lobby_id uuid references public.queue_lobbies(id) on delete set null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  check (expires_at > created_at)
);

create index queue_guest_sessions_expiry_idx on public.queue_guest_sessions (expires_at);

create table public.queue_entries (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.queue_lobbies(id) on delete cascade,
  guest_session_id uuid not null references public.queue_guest_sessions(id) on delete cascade,
  guest_first_name text not null check (char_length(btrim(guest_first_name)) between 1 and 40),
  location text not null check (char_length(btrim(location)) between 1 and 40),
  assigned_membership_id uuid not null references public.queue_memberships(id) on delete restrict,
  status text not null default 'waiting'
    check (status in ('waiting', 'called', 'helping', 'completed', 'cancelled', 'no_show')),
  sort_position bigint not null check (sort_position > 0),
  called_at timestamptz,
  helping_at timestamptz,
  finished_at timestamptz,
  expires_at timestamptz not null default (now() + interval '12 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status not in ('called', 'helping', 'completed')) or called_at is not null),
  check ((status <> 'helping') or helping_at is not null),
  check ((status not in ('completed', 'cancelled', 'no_show')) or finished_at is not null)
);

create unique index queue_entries_one_active_guest_idx
  on public.queue_entries (lobby_id, guest_session_id)
  where status in ('waiting', 'called', 'helping');
create unique index queue_entries_one_active_admin_idx
  on public.queue_entries (assigned_membership_id)
  where status in ('called', 'helping');
create index queue_entries_lobby_queue_idx
  on public.queue_entries (lobby_id, status, sort_position, created_at);
create index queue_entries_guest_idx
  on public.queue_entries (guest_session_id, created_at desc);
create index queue_entries_expiry_idx on public.queue_entries (expires_at);

create table public.queue_transition_events (
  id bigint generated always as identity primary key,
  lobby_id uuid not null references public.queue_lobbies(id) on delete cascade,
  entry_id uuid references public.queue_entries(id) on delete set null,
  actor_kind text not null check (actor_kind in ('staff', 'guest', 'system')),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  actor_guest_session_id uuid references public.queue_guest_sessions(id) on delete set null,
  event_type text not null check (char_length(event_type) between 2 and 50),
  from_status text,
  to_status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (jsonb_typeof(metadata) = 'object')
);

create index queue_transition_events_lobby_idx
  on public.queue_transition_events (lobby_id, created_at desc);
create index queue_transition_events_entry_idx
  on public.queue_transition_events (entry_id, created_at desc);

alter table public.queue_lobbies enable row level security;
alter table public.queue_memberships enable row level security;
alter table public.queue_admin_invitations enable row level security;
alter table public.queue_guest_sessions enable row level security;
alter table public.queue_entries enable row level security;
alter table public.queue_transition_events enable row level security;

revoke all on table public.queue_lobbies from public, anon, authenticated;
revoke all on table public.queue_memberships from public, anon, authenticated;
revoke all on table public.queue_admin_invitations from public, anon, authenticated;
revoke all on table public.queue_guest_sessions from public, anon, authenticated;
revoke all on table public.queue_entries from public, anon, authenticated;
revoke all on table public.queue_transition_events from public, anon, authenticated;
revoke all on sequence public.queue_transition_events_id_seq from public, anon, authenticated;

grant all on table public.queue_lobbies to service_role;
grant all on table public.queue_memberships to service_role;
grant all on table public.queue_admin_invitations to service_role;
grant all on table public.queue_guest_sessions to service_role;
grant all on table public.queue_entries to service_role;
grant all on table public.queue_transition_events to service_role;
grant all on sequence public.queue_transition_events_id_seq to service_role;

create or replace function private.queue_publish_change(p_lobby_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, realtime
as $$
declare
  next_revision bigint;
begin
  update public.queue_lobbies
  set revision = revision + 1,
      updated_at = now()
  where id = p_lobby_id
  returning revision into next_revision;

  if next_revision is not null then
    perform realtime.send(
      jsonb_build_object('lobby_id', p_lobby_id, 'revision', next_revision),
      'queue_changed',
      'queue:' || p_lobby_id::text,
      false
    );
  end if;
end;
$$;

revoke all on function private.queue_publish_change(uuid) from public, anon, authenticated;
grant execute on function private.queue_publish_change(uuid) to service_role;

create or replace function private.queue_touch_lobby()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  perform private.queue_publish_change(coalesce(new.lobby_id, old.lobby_id));
  return null;
end;
$$;

revoke all on function private.queue_touch_lobby() from public, anon, authenticated;

create trigger queue_memberships_touch_lobby
after insert or update or delete on public.queue_memberships
for each row execute function private.queue_touch_lobby();

create trigger queue_admin_invitations_touch_lobby
after insert or update or delete on public.queue_admin_invitations
for each row execute function private.queue_touch_lobby();

create trigger queue_entries_touch_lobby
after insert or update or delete on public.queue_entries
for each row execute function private.queue_touch_lobby();

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

create or replace function public.queue_claim_invitations(
  p_profile_id uuid,
  p_email text,
  p_display_name text
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  claimed_count integer := 0;
  invitation_row public.queue_admin_invitations;
begin
  if not exists (
    select 1 from public.profiles
    where id = p_profile_id and lower(email) = lower(btrim(p_email))
  ) then
    raise exception 'QUEUE_EMAIL_MISMATCH' using errcode = 'P0001';
  end if;

  for invitation_row in
    select * from public.queue_admin_invitations
    where email = lower(btrim(p_email))
      and claimed_at is null
      and revoked_at is null
    for update
  loop
    insert into public.queue_memberships (lobby_id, profile_id, role, display_name)
    values (invitation_row.lobby_id, p_profile_id, 'admin', btrim(p_display_name))
    on conflict (lobby_id, profile_id) do update
      set revoked_at = null,
          display_name = excluded.display_name,
          updated_at = now();

    update public.queue_admin_invitations
    set claimed_by_profile_id = p_profile_id,
        claimed_at = now()
    where id = invitation_row.id;

    claimed_count := claimed_count + 1;
  end loop;

  return claimed_count;
end;
$$;

create or replace function public.queue_join_lobby(
  p_lobby_id uuid,
  p_guest_session_id uuid,
  p_guest_first_name text,
  p_location text,
  p_assigned_membership_id uuid
)
returns public.queue_entries
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  selected_admin public.queue_memberships;
  created_entry public.queue_entries;
  next_position bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_lobby_id::text, 0));

  select * into selected_admin
  from public.queue_memberships
  where id = p_assigned_membership_id and lobby_id = p_lobby_id
  for update;

  if selected_admin.id is null
     or selected_admin.revoked_at is not null
     or not selected_admin.accepting_guests
     or selected_admin.last_seen_at is null
     or selected_admin.last_seen_at < now() - interval '45 seconds' then
    raise exception 'QUEUE_ADMIN_OFFLINE' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.queue_entries
    where lobby_id = p_lobby_id
      and guest_session_id = p_guest_session_id
      and status in ('waiting', 'called', 'helping')
  ) then
    raise exception 'QUEUE_ALREADY_JOINED' using errcode = 'P0001';
  end if;

  select coalesce(max(sort_position), 0) + 1000 into next_position
  from public.queue_entries
  where lobby_id = p_lobby_id and status = 'waiting';

  insert into public.queue_entries (
    lobby_id, guest_session_id, guest_first_name, location,
    assigned_membership_id, sort_position
  ) values (
    p_lobby_id, p_guest_session_id, btrim(p_guest_first_name), btrim(p_location),
    p_assigned_membership_id, next_position
  ) returning * into created_entry;

  update public.queue_guest_sessions
  set last_lobby_id = p_lobby_id,
      last_seen_at = now(),
      expires_at = now() + interval '30 days'
  where id = p_guest_session_id;

  insert into public.queue_transition_events (
    lobby_id, entry_id, actor_kind, actor_guest_session_id, event_type, to_status
  ) values (
    p_lobby_id, created_entry.id, 'guest', p_guest_session_id, 'joined', 'waiting'
  );

  return created_entry;
end;
$$;

create or replace function public.queue_call_entry(
  p_entry_id uuid,
  p_actor_profile_id uuid
)
returns public.queue_entries
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_entry public.queue_entries;
  actor_membership public.queue_memberships;
begin
  select * into target_entry from public.queue_entries where id = p_entry_id for update;
  if target_entry.id is null or target_entry.status <> 'waiting' then
    raise exception 'QUEUE_ENTRY_NOT_WAITING' using errcode = 'P0001';
  end if;

  select * into actor_membership
  from public.queue_memberships
  where lobby_id = target_entry.lobby_id
    and profile_id = p_actor_profile_id
    and revoked_at is null;

  if actor_membership.id is null
     or (actor_membership.role <> 'owner' and actor_membership.id <> target_entry.assigned_membership_id) then
    raise exception 'QUEUE_STAFF_FORBIDDEN' using errcode = 'P0001';
  end if;

  update public.queue_entries
  set status = 'called', called_at = now(), updated_at = now()
  where id = p_entry_id
  returning * into target_entry;

  insert into public.queue_transition_events (
    lobby_id, entry_id, actor_kind, actor_profile_id, event_type, from_status, to_status
  ) values (
    target_entry.lobby_id, target_entry.id, 'staff', p_actor_profile_id,
    'called', 'waiting', 'called'
  );

  return target_entry;
exception
  when unique_violation then
    raise exception 'QUEUE_ADMIN_ALREADY_BUSY' using errcode = 'P0001';
end;
$$;

create or replace function public.queue_transition_entry(
  p_entry_id uuid,
  p_to_status text,
  p_actor_kind text,
  p_actor_profile_id uuid default null,
  p_guest_session_id uuid default null
)
returns public.queue_entries
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_entry public.queue_entries;
  actor_membership public.queue_memberships;
  old_status text;
begin
  select * into target_entry from public.queue_entries where id = p_entry_id for update;
  if target_entry.id is null then
    raise exception 'QUEUE_ENTRY_NOT_FOUND' using errcode = 'P0001';
  end if;
  old_status := target_entry.status;

  if p_actor_kind = 'guest' then
    if p_guest_session_id is null or p_guest_session_id <> target_entry.guest_session_id then
      raise exception 'QUEUE_GUEST_FORBIDDEN' using errcode = 'P0001';
    end if;
    if not (
      (old_status = 'waiting' and p_to_status = 'cancelled') or
      (old_status = 'called' and p_to_status in ('helping', 'completed')) or
      (old_status = 'helping' and p_to_status = 'completed')
    ) then
      raise exception 'QUEUE_INVALID_TRANSITION' using errcode = 'P0001';
    end if;
  elsif p_actor_kind = 'staff' then
    select * into actor_membership
    from public.queue_memberships
    where lobby_id = target_entry.lobby_id
      and profile_id = p_actor_profile_id
      and revoked_at is null;
    if actor_membership.id is null then
      raise exception 'QUEUE_STAFF_FORBIDDEN' using errcode = 'P0001';
    end if;
    if old_status = 'waiting' then
      if p_to_status not in ('cancelled', 'no_show')
         or (actor_membership.role <> 'owner' and actor_membership.id <> target_entry.assigned_membership_id) then
        raise exception 'QUEUE_INVALID_TRANSITION' using errcode = 'P0001';
      end if;
    elsif old_status in ('called', 'helping') then
      if actor_membership.id <> target_entry.assigned_membership_id
         or not ((old_status = 'called' and p_to_status in ('helping', 'completed', 'no_show'))
                 or (old_status = 'helping' and p_to_status = 'completed')) then
        raise exception 'QUEUE_INVALID_TRANSITION' using errcode = 'P0001';
      end if;
    else
      raise exception 'QUEUE_INVALID_TRANSITION' using errcode = 'P0001';
    end if;
  else
    raise exception 'QUEUE_ACTOR_REQUIRED' using errcode = 'P0001';
  end if;

  update public.queue_entries
  set status = p_to_status,
      helping_at = case when p_to_status = 'helping' then coalesce(helping_at, now()) else helping_at end,
      finished_at = case when p_to_status in ('completed', 'cancelled', 'no_show') then now() else finished_at end,
      expires_at = case
        when p_to_status in ('completed', 'cancelled', 'no_show') then now() + interval '24 hours'
        else expires_at
      end,
      updated_at = now()
  where id = p_entry_id
  returning * into target_entry;

  insert into public.queue_transition_events (
    lobby_id, entry_id, actor_kind, actor_profile_id, actor_guest_session_id,
    event_type, from_status, to_status
  ) values (
    target_entry.lobby_id, target_entry.id, p_actor_kind, p_actor_profile_id,
    p_guest_session_id, 'status_changed', old_status, p_to_status
  );

  return target_entry;
end;
$$;

create or replace function public.queue_manage_waiting_entry(
  p_entry_id uuid,
  p_actor_profile_id uuid,
  p_assigned_membership_id uuid default null,
  p_sort_position bigint default null
)
returns public.queue_entries
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_entry public.queue_entries;
  actor_membership public.queue_memberships;
  destination public.queue_memberships;
begin
  select * into target_entry from public.queue_entries where id = p_entry_id for update;
  if target_entry.id is null or target_entry.status <> 'waiting' then
    raise exception 'QUEUE_ENTRY_NOT_WAITING' using errcode = 'P0001';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(target_entry.lobby_id::text, 0));

  select * into actor_membership from public.queue_memberships
  where lobby_id = target_entry.lobby_id and profile_id = p_actor_profile_id and revoked_at is null;
  if actor_membership.id is null
     or (actor_membership.role <> 'owner' and actor_membership.id <> target_entry.assigned_membership_id) then
    raise exception 'QUEUE_STAFF_FORBIDDEN' using errcode = 'P0001';
  end if;

  if p_assigned_membership_id is not null then
    select * into destination from public.queue_memberships
    where id = p_assigned_membership_id
      and lobby_id = target_entry.lobby_id
      and revoked_at is null;
    if destination.id is null then
      raise exception 'QUEUE_DESTINATION_INVALID' using errcode = 'P0001';
    end if;
  end if;

  update public.queue_entries
  set assigned_membership_id = coalesce(p_assigned_membership_id, assigned_membership_id),
      sort_position = coalesce(p_sort_position, sort_position),
      updated_at = now()
  where id = p_entry_id
  returning * into target_entry;

  insert into public.queue_transition_events (
    lobby_id, entry_id, actor_kind, actor_profile_id, event_type
  ) values (
    target_entry.lobby_id, target_entry.id, 'staff', p_actor_profile_id,
    case when p_assigned_membership_id is not null then 'reassigned' else 'reordered' end
  );

  return target_entry;
end;
$$;

create or replace function public.queue_remove_membership(
  p_membership_id uuid,
  p_owner_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_membership public.queue_memberships;
begin
  select * into target_membership
  from public.queue_memberships where id = p_membership_id for update;

  if target_membership.id is null or target_membership.role = 'owner' then
    raise exception 'QUEUE_MEMBER_NOT_REMOVABLE' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.queue_lobbies
    where id = target_membership.lobby_id and owner_profile_id = p_owner_profile_id
  ) then
    raise exception 'QUEUE_OWNER_REQUIRED' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.queue_entries
    where assigned_membership_id = p_membership_id
      and status in ('waiting', 'called', 'helping')
  ) then
    raise exception 'QUEUE_REASSIGN_BEFORE_REMOVAL' using errcode = 'P0001';
  end if;

  update public.queue_memberships
  set revoked_at = now(), accepting_guests = false, updated_at = now()
  where id = p_membership_id;
end;
$$;

create or replace function public.purge_queue_pilot_data()
returns table(entries_deleted bigint, sessions_deleted bigint)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  with deleted as (
    delete from public.queue_entries where expires_at <= now() returning 1
  ) select count(*) into entries_deleted from deleted;

  with deleted as (
    delete from public.queue_guest_sessions s
    where s.expires_at <= now()
      and not exists (
        select 1 from public.queue_entries e
        where e.guest_session_id = s.id and e.status in ('waiting', 'called', 'helping')
      )
    returning 1
  ) select count(*) into sessions_deleted from deleted;

  return next;
end;
$$;

revoke all on function public.queue_create_lobby(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.queue_claim_invitations(uuid, text, text) from public, anon, authenticated;
revoke all on function public.queue_join_lobby(uuid, uuid, text, text, uuid) from public, anon, authenticated;
revoke all on function public.queue_call_entry(uuid, uuid) from public, anon, authenticated;
revoke all on function public.queue_transition_entry(uuid, text, text, uuid, uuid) from public, anon, authenticated;
revoke all on function public.queue_manage_waiting_entry(uuid, uuid, uuid, bigint) from public, anon, authenticated;
revoke all on function public.queue_remove_membership(uuid, uuid) from public, anon, authenticated;
revoke all on function public.purge_queue_pilot_data() from public, anon, authenticated;

grant execute on function public.queue_create_lobby(uuid, text, text, text) to service_role;
grant execute on function public.queue_claim_invitations(uuid, text, text) to service_role;
grant execute on function public.queue_join_lobby(uuid, uuid, text, text, uuid) to service_role;
grant execute on function public.queue_call_entry(uuid, uuid) to service_role;
grant execute on function public.queue_transition_entry(uuid, text, text, uuid, uuid) to service_role;
grant execute on function public.queue_manage_waiting_entry(uuid, uuid, uuid, bigint) to service_role;
grant execute on function public.queue_remove_membership(uuid, uuid) to service_role;
grant execute on function public.purge_queue_pilot_data() to service_role;

comment on table public.queue_lobbies is 'QueueMaster lobbies, isolated from Fourth Canal access roles.';
comment on table public.queue_guest_sessions is 'App-scoped guest sessions; token_hash stores SHA-256 only.';
comment on table public.queue_transition_events is 'QueueMaster transition audit trail. Realtime publishes only lobby_id and revision.';
