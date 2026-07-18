-- President-owned communications foundation. These records contain only safe
-- operational metadata; support messages, emails, roster details, and grades
-- remain in their existing protected records.

-- Security preflight: this table is accessed only by the service role from
-- server-side game code. Enabling RLS preserves that behavior while removing
-- the exposed-table finding.
alter table private.game_leaderboard_identities enable row level security;

drop policy if exists "service role reads game leaderboard identities"
  on private.game_leaderboard_identities;
create policy "service role reads game leaderboard identities"
  on private.game_leaderboard_identities
  for select to service_role
  using (true);

drop policy if exists "service role inserts game leaderboard identities"
  on private.game_leaderboard_identities;
create policy "service role inserts game leaderboard identities"
  on private.game_leaderboard_identities
  for insert to service_role
  with check (true);

-- Add the isolated communications permission without changing existing
-- delegated officer grants. Full administrators continue to receive every
-- administrative permission automatically in server authorization.
alter table public.profiles
  drop constraint if exists profiles_admin_permissions_check;

alter table public.profiles
  add constraint profiles_admin_permissions_check
  check (
    admin_permissions <@ array[
      'accounts.manage',
      'roster.manage',
      'collections.manage',
      'courses.manage',
      'operations.manage',
      'communications.manage'
    ]::text[]
  );

create schema if not exists private;

create table if not exists private.admin_activity_events (
  id bigint generated always as identity primary key,
  scope text not null check (scope in ('access', 'support', 'content', 'operations')),
  severity text not null check (severity in ('info', 'attention', 'urgent')),
  event_type text not null check (event_type ~ '^[a-z0-9][a-z0-9._-]{1,79}$'),
  reference_id text not null check (char_length(reference_id) between 1 and 160),
  dashboard_path text not null
    check (dashboard_path like '/%' and dashboard_path not like '//%'),
  profile_id uuid references public.profiles(id) on delete set null,
  report_id bigint references public.resource_reports(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists private.admin_notification_outbox (
  id bigint generated always as identity primary key,
  event_id bigint not null references private.admin_activity_events(id) on delete cascade,
  destination text not null check (
    destination in ('president', 'site_ops', 'member_access', 'academic_content', 'support_inbox')
  ),
  status text not null default 'pending'
    check (status in ('pending', 'delivered', 'failed', 'disabled')),
  delivery_attempts smallint not null default 0
    check (delivery_attempts between 0 and 100),
  last_error text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, destination)
);

create index if not exists admin_activity_events_created_at_idx
  on private.admin_activity_events (created_at desc);
create index if not exists admin_activity_events_profile_created_at_idx
  on private.admin_activity_events (profile_id, created_at desc)
  where profile_id is not null;
create index if not exists admin_notification_outbox_status_created_at_idx
  on private.admin_notification_outbox (status, created_at desc);

alter table private.admin_activity_events enable row level security;
alter table private.admin_notification_outbox enable row level security;

revoke all on table private.admin_activity_events from public, anon, authenticated;
revoke all on table private.admin_notification_outbox from public, anon, authenticated;
grant select, insert, update on table private.admin_activity_events to service_role;
grant select, insert, update on table private.admin_notification_outbox to service_role;

drop policy if exists "service role manages admin activity events"
  on private.admin_activity_events;
create policy "service role manages admin activity events"
  on private.admin_activity_events
  for all to service_role
  using (true)
  with check (true);

drop policy if exists "service role manages admin notification outbox"
  on private.admin_notification_outbox;
create policy "service role manages admin notification outbox"
  on private.admin_notification_outbox
  for all to service_role
  using (true)
  with check (true);

-- Private schemas are deliberately not exposed through the public data API.
-- These service-role-only functions are the server's narrow interface for
-- creating, reading, and retrying safe operational notifications.
create or replace function public.record_communications_event(
  p_scope text,
  p_severity text,
  p_event_type text,
  p_reference_id text,
  p_dashboard_path text,
  p_profile_id uuid default null,
  p_report_id bigint default null
)
returns table (
  activity_event_id bigint,
  notification_outbox_id bigint,
  notification_destination text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  recorded_event_id bigint;
  recorded_outbox_id bigint;
  resolved_destination text;
begin
  if p_scope not in ('access', 'support', 'content', 'operations') then
    raise exception 'Invalid communications scope.' using errcode = '22023';
  end if;
  if p_severity not in ('info', 'attention', 'urgent') then
    raise exception 'Invalid communications severity.' using errcode = '22023';
  end if;
  if p_event_type !~ '^[a-z0-9][a-z0-9._-]{1,79}$' then
    raise exception 'Invalid communications event type.' using errcode = '22023';
  end if;
  if char_length(coalesce(p_reference_id, '')) not between 1 and 160 then
    raise exception 'Invalid communications reference.' using errcode = '22023';
  end if;
  if p_dashboard_path is null
     or p_dashboard_path not like '/%'
     or p_dashboard_path like '//%' then
    raise exception 'Invalid communications dashboard path.' using errcode = '22023';
  end if;

  resolved_destination := case p_scope
    when 'access' then 'member_access'
    when 'content' then 'academic_content'
    when 'operations' then 'site_ops'
    when 'support' then case
      when p_event_type in ('support.privacy', 'support.copyright', 'support.security')
        then 'president'
      else 'support_inbox'
    end
  end;

  insert into private.admin_activity_events (
    scope, severity, event_type, reference_id, dashboard_path, profile_id, report_id
  )
  values (
    p_scope, p_severity, p_event_type, p_reference_id, p_dashboard_path, p_profile_id, p_report_id
  )
  returning id into recorded_event_id;

  insert into private.admin_notification_outbox (event_id, destination)
  values (recorded_event_id, resolved_destination)
  returning id into recorded_outbox_id;

  return query
  select recorded_event_id, recorded_outbox_id, resolved_destination;
end;
$$;

create or replace function public.get_communications_inbox(p_limit integer default 100)
returns table (
  event_id bigint,
  scope text,
  severity text,
  event_type text,
  reference_id text,
  dashboard_path text,
  profile_id uuid,
  report_id bigint,
  event_created_at timestamptz,
  outbox_id bigint,
  destination text,
  delivery_status text,
  delivery_attempts smallint,
  delivery_error text,
  delivered_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    event.id,
    event.scope,
    event.severity,
    event.event_type,
    event.reference_id,
    event.dashboard_path,
    event.profile_id,
    event.report_id,
    event.created_at,
    outbox.id,
    outbox.destination,
    outbox.status,
    outbox.delivery_attempts,
    outbox.last_error,
    outbox.delivered_at
  from private.admin_activity_events event
  join private.admin_notification_outbox outbox on outbox.event_id = event.id
  order by event.created_at desc, outbox.id desc
  limit least(greatest(coalesce(p_limit, 100), 1), 200);
$$;

create or replace function public.get_profile_communications_history(
  p_profile_id uuid,
  p_limit integer default 30
)
returns table (
  event_id bigint,
  scope text,
  severity text,
  event_type text,
  reference_id text,
  dashboard_path text,
  event_created_at timestamptz,
  delivery_status text,
  delivery_attempts smallint,
  delivery_error text,
  delivered_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    event.id,
    event.scope,
    event.severity,
    event.event_type,
    event.reference_id,
    event.dashboard_path,
    event.created_at,
    outbox.status,
    outbox.delivery_attempts,
    outbox.last_error,
    outbox.delivered_at
  from private.admin_activity_events event
  join private.admin_notification_outbox outbox on outbox.event_id = event.id
  where event.profile_id = p_profile_id
  order by event.created_at desc, outbox.id desc
  limit least(greatest(coalesce(p_limit, 30), 1), 100);
$$;

create or replace function public.get_communications_delivery(p_outbox_id bigint)
returns table (
  outbox_id bigint,
  destination text,
  event_type text,
  severity text,
  reference_id text,
  dashboard_path text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    outbox.id,
    outbox.destination,
    event.event_type,
    event.severity,
    event.reference_id,
    event.dashboard_path
  from private.admin_notification_outbox outbox
  join private.admin_activity_events event on event.id = outbox.event_id
  where outbox.id = p_outbox_id;
$$;

create or replace function public.update_communications_delivery(
  p_outbox_id bigint,
  p_status text,
  p_error text default null,
  p_increment_attempt boolean default false
)
returns table (
  outbox_id bigint,
  delivery_status text,
  delivery_attempts smallint,
  delivery_error text,
  delivered_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status not in ('pending', 'delivered', 'failed', 'disabled') then
    raise exception 'Invalid delivery status.' using errcode = '22023';
  end if;

  return query
  update private.admin_notification_outbox outbox
  set
    status = p_status,
    delivery_attempts = case
      when p_increment_attempt then least(outbox.delivery_attempts + 1, 100)::smallint
      else outbox.delivery_attempts
    end,
    last_error = case
      when p_status = 'delivered' then null
      else nullif(left(coalesce(p_error, ''), 300), '')
    end,
    delivered_at = case when p_status = 'delivered' then now() else null end
  where outbox.id = p_outbox_id
  returning outbox.id, outbox.status, outbox.delivery_attempts, outbox.last_error, outbox.delivered_at;
end;
$$;

revoke all on function public.record_communications_event(text, text, text, text, text, uuid, bigint)
  from public, anon, authenticated;
revoke all on function public.get_communications_inbox(integer)
  from public, anon, authenticated;
revoke all on function public.get_profile_communications_history(uuid, integer)
  from public, anon, authenticated;
revoke all on function public.get_communications_delivery(bigint)
  from public, anon, authenticated;
revoke all on function public.update_communications_delivery(bigint, text, text, boolean)
  from public, anon, authenticated;

grant execute on function public.record_communications_event(text, text, text, text, text, uuid, bigint)
  to service_role;
grant execute on function public.get_communications_inbox(integer)
  to service_role;
grant execute on function public.get_profile_communications_history(uuid, integer)
  to service_role;
grant execute on function public.get_communications_delivery(bigint)
  to service_role;
grant execute on function public.update_communications_delivery(bigint, text, text, boolean)
  to service_role;
