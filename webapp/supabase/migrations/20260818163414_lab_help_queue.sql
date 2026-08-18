-- Anonymous students use the Fourth Canal server route; the queue table itself
-- is never exposed directly to browser roles.
create table public.lab_help_queue_entries (
  id uuid primary key default gen_random_uuid(),
  student_name text not null,
  issue text,
  bench_seat text not null,
  professor text not null,
  status text not null default 'waiting',
  client_fingerprint text not null,
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '8 hours'),
  completed_at timestamptz,
  constraint lab_help_queue_student_name_check
    check (char_length(btrim(student_name)) between 1 and 80),
  constraint lab_help_queue_issue_check
    check (issue is null or char_length(btrim(issue)) between 1 and 160),
  constraint lab_help_queue_bench_seat_check
    check (bench_seat ~ '^[1-9][0-9]{0,2}$'),
  constraint lab_help_queue_professor_check
    check (professor in (
      'Dr. T',
      'Dr. J',
      'Dr. Berns',
      'Dr. LaSalvia',
      'Dr. Markarian',
      'Dr. Zakhary',
      'Dr. Ali',
      'Dr. Tarik'
    )),
  constraint lab_help_queue_status_check
    check (status in ('waiting', 'completed', 'cancelled', 'expired')),
  constraint lab_help_queue_client_fingerprint_check
    check (client_fingerprint ~ '^[a-f0-9]{64}$'),
  constraint lab_help_queue_expiration_check
    check (
      expires_at > created_at
      and expires_at <= created_at + interval '8 hours'
    )
);

create unique index lab_help_queue_idempotency_key
  on public.lab_help_queue_entries (idempotency_key);
create unique index lab_help_queue_one_waiting_per_client
  on public.lab_help_queue_entries (client_fingerprint)
  where status = 'waiting';
create index lab_help_queue_public_display
  on public.lab_help_queue_entries (professor, created_at, id)
  where status = 'waiting';
create index lab_help_queue_expiration
  on public.lab_help_queue_entries (expires_at);

alter table public.lab_help_queue_entries enable row level security;
revoke all on table public.lab_help_queue_entries from public, anon, authenticated;
grant select, insert, update, delete on table public.lab_help_queue_entries to service_role;

create policy "service role manages lab help queue"
  on public.lab_help_queue_entries
  for all
  to service_role
  using (true)
  with check (true);

create schema if not exists private;

create table private.lab_help_queue_rate_limits (
  rate_scope text not null
    check (rate_scope in ('client', 'network')),
  fingerprint text not null
    check (fingerprint ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null,
  accepted_count smallint not null default 0
    check (accepted_count between 0 and 300),
  updated_at timestamptz not null default now(),
  primary key (rate_scope, fingerprint)
);

create index lab_help_queue_rate_limits_retention
  on private.lab_help_queue_rate_limits (updated_at);

alter table private.lab_help_queue_rate_limits enable row level security;
revoke all on table private.lab_help_queue_rate_limits
  from public, anon, authenticated, service_role;

-- The public location makes this RPC reachable through PostgREST, but only the
-- server's service role may execute it.
create function public.accept_lab_help_queue_request(
  p_client_fingerprint text,
  p_request_fingerprint text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_time constant timestamptz := statement_timestamp();
begin
  if p_client_fingerprint is null
     or p_client_fingerprint !~ '^[a-f0-9]{64}$'
     or p_request_fingerprint is null
     or p_request_fingerprint !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid lab queue fingerprint.' using errcode = '22023';
  end if;

  insert into private.lab_help_queue_rate_limits (
    rate_scope,
    fingerprint,
    window_started_at,
    accepted_count,
    updated_at
  )
  values
    ('client', p_client_fingerprint, request_time, 0, request_time),
    ('network', p_request_fingerprint, request_time, 0, request_time)
  on conflict (rate_scope, fingerprint) do nothing;

  -- Lock both counters in a deterministic order so a request either consumes
  -- both limits or neither limit under concurrent submissions.
  perform limits.rate_scope
  from private.lab_help_queue_rate_limits as limits
  where (limits.rate_scope = 'client' and limits.fingerprint = p_client_fingerprint)
     or (limits.rate_scope = 'network' and limits.fingerprint = p_request_fingerprint)
  order by limits.rate_scope, limits.fingerprint
  for update;

  update private.lab_help_queue_rate_limits as limits
  set
    window_started_at = request_time,
    accepted_count = 0,
    updated_at = request_time
  where (
      limits.rate_scope = 'client'
      and limits.fingerprint = p_client_fingerprint
      and limits.window_started_at <= request_time - interval '15 minutes'
    )
    or (
      limits.rate_scope = 'network'
      and limits.fingerprint = p_request_fingerprint
      and limits.window_started_at <= request_time - interval '1 hour'
    );

  if exists (
    select 1
    from private.lab_help_queue_rate_limits as limits
    where (
      (limits.rate_scope = 'client' and limits.fingerprint = p_client_fingerprint)
      or (limits.rate_scope = 'network' and limits.fingerprint = p_request_fingerprint)
    )
    and limits.accepted_count >= case limits.rate_scope
      when 'client' then 6
      else 300
    end
  ) then
    return false;
  end if;

  update private.lab_help_queue_rate_limits as limits
  set
    accepted_count = limits.accepted_count + 1,
    updated_at = request_time
  where (limits.rate_scope = 'client' and limits.fingerprint = p_client_fingerprint)
     or (limits.rate_scope = 'network' and limits.fingerprint = p_request_fingerprint);

  return true;
end;
$$;

revoke all on function public.accept_lab_help_queue_request(text, text)
  from public, anon, authenticated;
grant execute on function public.accept_lab_help_queue_request(text, text) to service_role;

-- Vercel calls this service-role-only RPC daily. Expired queue entries contain
-- student names and issue details, so they are permanently removed rather than
-- retained as an activity log. Old anonymous rate-limit buckets are also erased.
create function public.purge_lab_help_queue_data()
returns table(entries_removed bigint, limits_removed bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed_entries bigint := 0;
  removed_limits bigint := 0;
begin
  delete from public.lab_help_queue_entries
  where expires_at <= now()
     or (
       status <> 'waiting'
       and coalesce(completed_at, created_at) <= now() - interval '15 minutes'
     );
  get diagnostics removed_entries = row_count;

  delete from private.lab_help_queue_rate_limits
  where updated_at <= now() - interval '2 hours';
  get diagnostics removed_limits = row_count;

  return query select removed_entries, removed_limits;
end;
$$;

revoke all on function public.purge_lab_help_queue_data()
  from public, anon, authenticated;
grant execute on function public.purge_lab_help_queue_data() to service_role;
