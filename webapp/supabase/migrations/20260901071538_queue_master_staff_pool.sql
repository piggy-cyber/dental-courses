-- Replace QueueMaster email invitations with an explicit, in-app staff pool.
-- Browser roles retain no direct table or function access; the Next.js server
-- derives every actor from the authenticated Google session before using these
-- service-role-only functions.

create table public.queue_staff_candidates (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.queue_lobbies(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  email text not null check (email = lower(btrim(email)) and email like '%@%'),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  left_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (left_at is null or left_at >= joined_at)
);

create unique index queue_staff_candidates_one_active_idx
  on public.queue_staff_candidates (lobby_id, profile_id)
  where left_at is null;
create index queue_staff_candidates_lobby_presence_idx
  on public.queue_staff_candidates (lobby_id, left_at, last_seen_at desc);
create index queue_staff_candidates_profile_idx
  on public.queue_staff_candidates (profile_id, left_at, joined_at desc);

create table public.queue_admin_promotion_requests (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.queue_lobbies(id) on delete cascade,
  candidate_id uuid not null references public.queue_staff_candidates(id) on delete restrict,
  candidate_profile_id uuid not null references public.profiles(id) on delete restrict,
  requested_by_owner_profile_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  responded_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > created_at),
  check ((status in ('accepted', 'declined')) = (responded_at is not null)),
  check ((status = 'cancelled') = (cancelled_at is not null))
);

create unique index queue_admin_promotion_requests_one_pending_idx
  on public.queue_admin_promotion_requests (lobby_id, candidate_profile_id)
  where status = 'pending';
create index queue_admin_promotion_requests_candidate_idx
  on public.queue_admin_promotion_requests (candidate_profile_id, status, created_at desc);
create index queue_admin_promotion_requests_owner_idx
  on public.queue_admin_promotion_requests (requested_by_owner_profile_id, status, created_at desc);
create index queue_admin_promotion_requests_expiry_idx
  on public.queue_admin_promotion_requests (status, expires_at);

alter table public.queue_staff_candidates enable row level security;
alter table public.queue_admin_promotion_requests enable row level security;

revoke all on table public.queue_staff_candidates from public, anon, authenticated;
revoke all on table public.queue_admin_promotion_requests from public, anon, authenticated;
grant all on table public.queue_staff_candidates to service_role;
grant all on table public.queue_admin_promotion_requests to service_role;

create policy "Queue service role access" on public.queue_staff_candidates
  for all to service_role using (true) with check (true);
create policy "Queue service role access" on public.queue_admin_promotion_requests
  for all to service_role using (true) with check (true);

create trigger queue_staff_candidates_touch_lobby
after insert or update or delete on public.queue_staff_candidates
for each row execute function private.queue_touch_lobby();

create trigger queue_admin_promotion_requests_touch_lobby
after insert or update or delete on public.queue_admin_promotion_requests
for each row execute function private.queue_touch_lobby();

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
begin
  raise exception 'QUEUE_EMAIL_INVITATIONS_DEPRECATED' using errcode = 'P0001';
end;
$$;

comment on table public.queue_admin_invitations is
  'Deprecated QueueMaster email invitation history. New records must not be created.';
comment on function public.queue_claim_invitations(uuid, text, text) is
  'Deprecated and disabled. QueueMaster staff promotion now uses the in-app staff pool.';

create or replace function public.queue_join_staff_pool(
  p_lobby_id uuid,
  p_profile_id uuid,
  p_display_name text,
  p_email text
)
returns public.queue_staff_candidates
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  candidate public.queue_staff_candidates;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_lobby_id::text || ':' || p_profile_id::text, 0));

  if not exists (select 1 from public.queue_lobbies where id = p_lobby_id) then
    raise exception 'QUEUE_LOBBY_NOT_FOUND' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = p_profile_id and lower(email) = lower(btrim(p_email))
  ) then
    raise exception 'QUEUE_PROFILE_MISMATCH' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.queue_memberships
    where lobby_id = p_lobby_id and profile_id = p_profile_id and revoked_at is null
  ) then
    raise exception 'QUEUE_ALREADY_STAFF' using errcode = 'P0001';
  end if;

  select * into candidate
  from public.queue_staff_candidates
  where lobby_id = p_lobby_id and profile_id = p_profile_id and left_at is null
  for update;

  if candidate.id is null then
    insert into public.queue_staff_candidates (
      lobby_id, profile_id, display_name, email
    ) values (
      p_lobby_id, p_profile_id, btrim(p_display_name), lower(btrim(p_email))
    ) returning * into candidate;

    insert into public.queue_transition_events (
      lobby_id, actor_kind, actor_profile_id, event_type
    ) values (p_lobby_id, 'staff', p_profile_id, 'staff_pool_joined');
  else
    update public.queue_staff_candidates
    set display_name = btrim(p_display_name),
        email = lower(btrim(p_email)),
        last_seen_at = now(),
        updated_at = now()
    where id = candidate.id
    returning * into candidate;
  end if;

  return candidate;
end;
$$;

create or replace function public.queue_staff_candidate_heartbeat(
  p_candidate_id uuid,
  p_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  update public.queue_staff_candidates
  set last_seen_at = now(), updated_at = now()
  where id = p_candidate_id and profile_id = p_profile_id and left_at is null;
  if not found then
    raise exception 'QUEUE_CANDIDATE_FORBIDDEN' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.queue_leave_staff_pool(
  p_candidate_id uuid,
  p_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  candidate public.queue_staff_candidates;
begin
  select * into candidate from public.queue_staff_candidates
  where id = p_candidate_id for update;
  if candidate.id is null or candidate.profile_id <> p_profile_id or candidate.left_at is not null then
    raise exception 'QUEUE_CANDIDATE_FORBIDDEN' using errcode = 'P0001';
  end if;

  update public.queue_admin_promotion_requests
  set status = 'cancelled', cancelled_at = now(), updated_at = now()
  where candidate_id = candidate.id and status = 'pending';
  update public.queue_staff_candidates
  set left_at = now(), updated_at = now()
  where id = candidate.id;

  insert into public.queue_transition_events (
    lobby_id, actor_kind, actor_profile_id, event_type
  ) values (candidate.lobby_id, 'staff', p_profile_id, 'staff_pool_left');
end;
$$;

create or replace function public.queue_request_admin_promotion(
  p_candidate_id uuid,
  p_owner_profile_id uuid
)
returns public.queue_admin_promotion_requests
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  candidate public.queue_staff_candidates;
  request_row public.queue_admin_promotion_requests;
begin
  select * into candidate from public.queue_staff_candidates
  where id = p_candidate_id for update;
  if candidate.id is null or candidate.left_at is not null then
    raise exception 'QUEUE_CANDIDATE_UNAVAILABLE' using errcode = 'P0001';
  end if;
  if candidate.last_seen_at < now() - interval '45 seconds' then
    raise exception 'QUEUE_CANDIDATE_UNAVAILABLE' using errcode = 'P0001';
  end if;
  if candidate.profile_id = p_owner_profile_id then
    raise exception 'QUEUE_SELF_PROMOTION' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.queue_lobbies
    where id = candidate.lobby_id and owner_profile_id = p_owner_profile_id
  ) then
    raise exception 'QUEUE_OWNER_REQUIRED' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.queue_memberships
    where lobby_id = candidate.lobby_id and profile_id = candidate.profile_id and revoked_at is null
  ) then
    raise exception 'QUEUE_ALREADY_STAFF' using errcode = 'P0001';
  end if;

  update public.queue_admin_promotion_requests
  set status = 'expired', updated_at = now()
  where lobby_id = candidate.lobby_id
    and candidate_profile_id = candidate.profile_id
    and status = 'pending'
    and expires_at <= now();

  insert into public.queue_admin_promotion_requests (
    lobby_id, candidate_id, candidate_profile_id, requested_by_owner_profile_id
  ) values (
    candidate.lobby_id, candidate.id, candidate.profile_id, p_owner_profile_id
  ) returning * into request_row;

  insert into public.queue_transition_events (
    lobby_id, actor_kind, actor_profile_id, event_type
  ) values (candidate.lobby_id, 'staff', p_owner_profile_id, 'promotion_requested');
  return request_row;
exception
  when unique_violation then
    raise exception 'QUEUE_PROMOTION_ALREADY_PENDING' using errcode = 'P0001';
end;
$$;

create or replace function public.queue_cancel_admin_promotion(
  p_request_id uuid,
  p_owner_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  request_row public.queue_admin_promotion_requests;
begin
  select * into request_row from public.queue_admin_promotion_requests
  where id = p_request_id for update;
  if request_row.id is null or request_row.status <> 'pending' then
    raise exception 'QUEUE_PROMOTION_NOT_PENDING' using errcode = 'P0001';
  end if;
  if request_row.requested_by_owner_profile_id <> p_owner_profile_id
     or not exists (
       select 1 from public.queue_lobbies
       where id = request_row.lobby_id and owner_profile_id = p_owner_profile_id
     ) then
    raise exception 'QUEUE_OWNER_REQUIRED' using errcode = 'P0001';
  end if;
  update public.queue_admin_promotion_requests
  set status = 'cancelled', cancelled_at = now(), updated_at = now()
  where id = request_row.id;
  insert into public.queue_transition_events (
    lobby_id, actor_kind, actor_profile_id, event_type
  ) values (request_row.lobby_id, 'staff', p_owner_profile_id, 'promotion_cancelled');
end;
$$;

create or replace function public.queue_respond_admin_promotion(
  p_request_id uuid,
  p_candidate_profile_id uuid,
  p_accept boolean,
  p_display_name text
)
returns public.queue_memberships
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  request_row public.queue_admin_promotion_requests;
  candidate public.queue_staff_candidates;
  membership public.queue_memberships;
begin
  select * into request_row from public.queue_admin_promotion_requests
  where id = p_request_id for update;
  if request_row.id is null or request_row.candidate_profile_id <> p_candidate_profile_id then
    raise exception 'QUEUE_PROMOTION_FORBIDDEN' using errcode = 'P0001';
  end if;
  if request_row.status <> 'pending' then
    raise exception 'QUEUE_PROMOTION_NOT_PENDING' using errcode = 'P0001';
  end if;
  if request_row.expires_at <= now() then
    update public.queue_admin_promotion_requests
    set status = 'expired', updated_at = now()
    where id = request_row.id;
    raise exception 'QUEUE_PROMOTION_EXPIRED' using errcode = 'P0001';
  end if;

  select * into candidate from public.queue_staff_candidates
  where id = request_row.candidate_id for update;
  if candidate.id is null or candidate.left_at is not null
     or candidate.profile_id <> p_candidate_profile_id
     or candidate.lobby_id <> request_row.lobby_id then
    raise exception 'QUEUE_CANDIDATE_UNAVAILABLE' using errcode = 'P0001';
  end if;

  if p_accept then
    insert into public.queue_memberships (
      lobby_id, profile_id, role, display_name, accepting_guests, last_seen_at
    ) values (
      request_row.lobby_id, p_candidate_profile_id, 'admin', btrim(p_display_name), false, now()
    )
    on conflict (lobby_id, profile_id) do update
      set role = 'admin',
          display_name = excluded.display_name,
          accepting_guests = false,
          last_seen_at = now(),
          revoked_at = null,
          updated_at = now()
      where public.queue_memberships.role <> 'owner'
    returning * into membership;
    if membership.id is null then
      raise exception 'QUEUE_SELF_PROMOTION' using errcode = 'P0001';
    end if;
  end if;

  update public.queue_admin_promotion_requests
  set status = case when p_accept then 'accepted' else 'declined' end,
      responded_at = now(), updated_at = now()
  where id = request_row.id;

  if p_accept then
    update public.queue_staff_candidates
    set left_at = now(), updated_at = now()
    where id = candidate.id;
  end if;

  insert into public.queue_transition_events (
    lobby_id, actor_kind, actor_profile_id, event_type
  ) values (
    request_row.lobby_id, 'staff', p_candidate_profile_id,
    case when p_accept then 'promotion_accepted' else 'promotion_declined' end
  );
  return membership;
end;
$$;

create or replace function public.purge_queue_staff_pool_data()
returns table(candidates_deleted bigint, requests_deleted bigint, requests_expired bigint)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  with expired as (
    update public.queue_admin_promotion_requests
    set status = 'expired', updated_at = now()
    where status = 'pending' and expires_at <= now()
    returning 1
  ) select count(*) into requests_expired from expired;

  with deleted as (
    delete from public.queue_admin_promotion_requests
    where status <> 'pending' and updated_at <= now() - interval '30 days'
    returning 1
  ) select count(*) into requests_deleted from deleted;

  with deleted as (
    delete from public.queue_staff_candidates c
    where c.left_at <= now() - interval '30 days'
      and not exists (
        select 1 from public.queue_admin_promotion_requests r where r.candidate_id = c.id
      )
    returning 1
  ) select count(*) into candidates_deleted from deleted;
  return next;
end;
$$;

revoke all on function public.queue_join_staff_pool(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.queue_staff_candidate_heartbeat(uuid, uuid) from public, anon, authenticated;
revoke all on function public.queue_leave_staff_pool(uuid, uuid) from public, anon, authenticated;
revoke all on function public.queue_request_admin_promotion(uuid, uuid) from public, anon, authenticated;
revoke all on function public.queue_cancel_admin_promotion(uuid, uuid) from public, anon, authenticated;
revoke all on function public.queue_respond_admin_promotion(uuid, uuid, boolean, text) from public, anon, authenticated;
revoke all on function public.purge_queue_staff_pool_data() from public, anon, authenticated;

grant execute on function public.queue_join_staff_pool(uuid, uuid, text, text) to service_role;
grant execute on function public.queue_staff_candidate_heartbeat(uuid, uuid) to service_role;
grant execute on function public.queue_leave_staff_pool(uuid, uuid) to service_role;
grant execute on function public.queue_request_admin_promotion(uuid, uuid) to service_role;
grant execute on function public.queue_cancel_admin_promotion(uuid, uuid) to service_role;
grant execute on function public.queue_respond_admin_promotion(uuid, uuid, boolean, text) to service_role;
grant execute on function public.purge_queue_staff_pool_data() to service_role;

comment on table public.queue_staff_candidates is
  'Signed-in Google users who explicitly joined a QueueMaster lobby staff pool.';
comment on table public.queue_admin_promotion_requests is
  'Owner-created in-app QueueMaster admin promotion requests; no email delivery.';
