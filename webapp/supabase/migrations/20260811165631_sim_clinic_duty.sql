-- Sim Clinic Duty: private, student-run shared-space accountability for D2.
-- The term is deliberately seeded as a draft. Publishing is a separate,
-- audited coordinator action after founder and school-policy review.

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
      'communications.manage',
      'clinic-duty.manage'
    ]::text[]
  );

create table public.sim_clinic_duty_terms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,62}$'),
  label text not null check (char_length(btrim(label)) between 3 and 100),
  graduation_year smallint not null check (graduation_year between 2000 and 2200),
  starts_on date not null,
  ends_on date not null,
  timezone text not null default 'America/New_York',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  schedule_seed text not null,
  published_at timestamptz,
  published_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on),
  check (
    (status = 'draft' and published_at is null)
    or (status in ('published', 'archived') and published_at is not null)
  )
);

create table public.sim_clinic_duty_dates (
  id uuid primary key default gen_random_uuid(),
  term_id uuid not null references public.sim_clinic_duty_terms(id) on delete cascade,
  duty_date date not null,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  closure_reason text,
  photo_waived_at timestamptz,
  photo_waived_by uuid references public.profiles(id) on delete set null,
  photo_waiver_reason text,
  created_at timestamptz not null default now(),
  unique (term_id, duty_date),
  check (closes_at > opens_at),
  check (
    (status = 'open' and closure_reason is null)
    or (status = 'closed' and char_length(btrim(closure_reason)) between 3 and 500)
  ),
  check (
    (photo_waived_at is null and photo_waiver_reason is null)
    or (
      photo_waived_at is not null
      and char_length(btrim(photo_waiver_reason)) between 3 and 500
    )
  )
);

create table public.sim_clinic_duty_slots (
  id uuid primary key default gen_random_uuid(),
  duty_date_id uuid not null references public.sim_clinic_duty_dates(id) on delete cascade,
  position smallint not null check (position in (1, 2)),
  original_roster_id uuid not null references public.student_roster(id) on delete restrict,
  assignee_roster_id uuid not null references public.student_roster(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (duty_date_id, position),
  unique (duty_date_id, assignee_roster_id)
);

create table public.sim_clinic_duty_exchanges (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('release', 'trade')),
  offered_slot_id uuid not null references public.sim_clinic_duty_slots(id) on delete cascade,
  requested_slot_id uuid references public.sim_clinic_duty_slots(id) on delete cascade,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  created_by_roster_id uuid not null references public.student_roster(id) on delete restrict,
  counterparty_roster_id uuid references public.student_roster(id) on delete restrict,
  status text not null default 'open'
    check (status in ('open', 'accepted', 'rejected', 'cancelled', 'expired')),
  deadline_at timestamptz not null,
  responded_by_profile_id uuid references public.profiles(id) on delete set null,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (kind = 'release' and requested_slot_id is null and counterparty_roster_id is null)
    or (kind = 'trade' and requested_slot_id is not null and counterparty_roster_id is not null)
  ),
  check ((status = 'open') = (responded_at is null))
);

create unique index sim_clinic_duty_open_exchange_per_offered_slot
  on public.sim_clinic_duty_exchanges (offered_slot_id)
  where status = 'open';
create unique index sim_clinic_duty_open_trade_requested_slot
  on public.sim_clinic_duty_exchanges (requested_slot_id)
  where status = 'open' and requested_slot_id is not null;

create table public.sim_clinic_duty_submissions (
  id uuid primary key default gen_random_uuid(),
  duty_date_id uuid not null unique references public.sim_clinic_duty_dates(id) on delete cascade,
  status text not null default 'completed' check (status in ('completed', 'reopened')),
  checklist jsonb not null default '{}'::jsonb check (jsonb_typeof(checklist) = 'object'),
  unsafe_issue_reported boolean not null default false,
  unsafe_issue_type text,
  unsafe_issue_note text,
  submitted_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  submitted_by_roster_id uuid references public.student_roster(id) on delete set null,
  submitted_at timestamptz not null default now(),
  reopened_at timestamptz,
  reopened_by uuid references public.profiles(id) on delete set null,
  reopen_reason text,
  check (
    not unsafe_issue_reported
    or char_length(btrim(unsafe_issue_note)) between 3 and 1000
  ),
  check (
    status = 'completed'
    or (
      reopened_at is not null
      and char_length(btrim(reopen_reason)) between 3 and 500
    )
  )
);

create table public.sim_clinic_duty_photos (
  id uuid primary key default gen_random_uuid(),
  duty_date_id uuid not null references public.sim_clinic_duty_dates(id) on delete cascade,
  storage_path text not null unique check (storage_path like 'duty/%'),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/webp')),
  byte_size integer not null check (byte_size between 1 and 5000000),
  status text not null default 'pending' check (status in ('pending', 'ready')),
  uploaded_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  uploaded_by_roster_id uuid references public.student_roster(id) on delete set null,
  created_at timestamptz not null default now(),
  ready_at timestamptz,
  purge_after timestamptz not null default (now() + interval '60 days'),
  check ((status = 'ready') = (ready_at is not null))
);

create table public.sim_clinic_duty_events (
  id bigint generated always as identity primary key,
  term_id uuid references public.sim_clinic_duty_terms(id) on delete set null,
  duty_date_id uuid references public.sim_clinic_duty_dates(id) on delete set null,
  slot_id uuid references public.sim_clinic_duty_slots(id) on delete set null,
  exchange_id uuid references public.sim_clinic_duty_exchanges(id) on delete set null,
  submission_id uuid references public.sim_clinic_duty_submissions(id) on delete set null,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  actor_roster_id uuid references public.student_roster(id) on delete set null,
  event_type text not null check (event_type ~ '^[a-z0-9][a-z0-9._-]{1,79}$'),
  reason text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index sim_clinic_duty_dates_term_date_idx
  on public.sim_clinic_duty_dates (term_id, duty_date);
create index sim_clinic_duty_slots_assignee_idx
  on public.sim_clinic_duty_slots (assignee_roster_id, duty_date_id);
create index sim_clinic_duty_exchanges_status_deadline_idx
  on public.sim_clinic_duty_exchanges (status, deadline_at);
create index sim_clinic_duty_exchanges_counterparty_idx
  on public.sim_clinic_duty_exchanges (counterparty_roster_id, status);
create index sim_clinic_duty_photos_retention_idx
  on public.sim_clinic_duty_photos (purge_after)
  where status = 'ready';
create index sim_clinic_duty_events_date_created_idx
  on public.sim_clinic_duty_events (duty_date_id, created_at desc);
create index sim_clinic_duty_terms_published_by_idx
  on public.sim_clinic_duty_terms (published_by) where published_by is not null;
create index sim_clinic_duty_dates_photo_waived_by_idx
  on public.sim_clinic_duty_dates (photo_waived_by) where photo_waived_by is not null;
create index sim_clinic_duty_slots_original_roster_idx
  on public.sim_clinic_duty_slots (original_roster_id);
create index sim_clinic_duty_exchanges_creator_profile_idx
  on public.sim_clinic_duty_exchanges (created_by_profile_id);
create index sim_clinic_duty_exchanges_creator_roster_idx
  on public.sim_clinic_duty_exchanges (created_by_roster_id);
create index sim_clinic_duty_exchanges_responder_idx
  on public.sim_clinic_duty_exchanges (responded_by_profile_id)
  where responded_by_profile_id is not null;
create index sim_clinic_duty_submissions_submitter_profile_idx
  on public.sim_clinic_duty_submissions (submitted_by_profile_id);
create index sim_clinic_duty_submissions_submitter_roster_idx
  on public.sim_clinic_duty_submissions (submitted_by_roster_id)
  where submitted_by_roster_id is not null;
create index sim_clinic_duty_submissions_reopened_by_idx
  on public.sim_clinic_duty_submissions (reopened_by) where reopened_by is not null;
create index sim_clinic_duty_photos_date_idx
  on public.sim_clinic_duty_photos (duty_date_id);
create index sim_clinic_duty_photos_uploader_profile_idx
  on public.sim_clinic_duty_photos (uploaded_by_profile_id);
create index sim_clinic_duty_photos_uploader_roster_idx
  on public.sim_clinic_duty_photos (uploaded_by_roster_id)
  where uploaded_by_roster_id is not null;
create index sim_clinic_duty_events_term_idx
  on public.sim_clinic_duty_events (term_id) where term_id is not null;
create index sim_clinic_duty_events_slot_idx
  on public.sim_clinic_duty_events (slot_id) where slot_id is not null;
create index sim_clinic_duty_events_exchange_idx
  on public.sim_clinic_duty_events (exchange_id) where exchange_id is not null;
create index sim_clinic_duty_events_submission_idx
  on public.sim_clinic_duty_events (submission_id) where submission_id is not null;
create index sim_clinic_duty_events_actor_profile_idx
  on public.sim_clinic_duty_events (actor_profile_id) where actor_profile_id is not null;
create index sim_clinic_duty_events_actor_roster_idx
  on public.sim_clinic_duty_events (actor_roster_id) where actor_roster_id is not null;

alter table public.sim_clinic_duty_terms enable row level security;
alter table public.sim_clinic_duty_dates enable row level security;
alter table public.sim_clinic_duty_slots enable row level security;
alter table public.sim_clinic_duty_exchanges enable row level security;
alter table public.sim_clinic_duty_submissions enable row level security;
alter table public.sim_clinic_duty_photos enable row level security;
alter table public.sim_clinic_duty_events enable row level security;

revoke all on table public.sim_clinic_duty_terms from public, anon, authenticated;
revoke all on table public.sim_clinic_duty_dates from public, anon, authenticated;
revoke all on table public.sim_clinic_duty_slots from public, anon, authenticated;
revoke all on table public.sim_clinic_duty_exchanges from public, anon, authenticated;
revoke all on table public.sim_clinic_duty_submissions from public, anon, authenticated;
revoke all on table public.sim_clinic_duty_photos from public, anon, authenticated;
revoke all on table public.sim_clinic_duty_events from public, anon, authenticated;
revoke all on table public.sim_clinic_duty_terms from service_role;
revoke all on table public.sim_clinic_duty_dates from service_role;
revoke all on table public.sim_clinic_duty_slots from service_role;
revoke all on table public.sim_clinic_duty_exchanges from service_role;
revoke all on table public.sim_clinic_duty_submissions from service_role;
revoke all on table public.sim_clinic_duty_photos from service_role;
revoke all on table public.sim_clinic_duty_events from service_role;

grant select, insert, update, delete on table public.sim_clinic_duty_terms to service_role;
grant select, insert, update, delete on table public.sim_clinic_duty_dates to service_role;
grant select, insert, update, delete on table public.sim_clinic_duty_slots to service_role;
grant select, insert, update, delete on table public.sim_clinic_duty_exchanges to service_role;
grant select, insert, update, delete on table public.sim_clinic_duty_submissions to service_role;
grant select, insert, update, delete on table public.sim_clinic_duty_photos to service_role;
grant select, insert on table public.sim_clinic_duty_events to service_role;
grant usage, select on sequence public.sim_clinic_duty_events_id_seq to service_role;

create policy "service role manages clinic duty terms"
  on public.sim_clinic_duty_terms for all to service_role using (true) with check (true);
create policy "service role manages clinic duty dates"
  on public.sim_clinic_duty_dates for all to service_role using (true) with check (true);
create policy "service role manages clinic duty slots"
  on public.sim_clinic_duty_slots for all to service_role using (true) with check (true);
create policy "service role manages clinic duty exchanges"
  on public.sim_clinic_duty_exchanges for all to service_role using (true) with check (true);
create policy "service role manages clinic duty submissions"
  on public.sim_clinic_duty_submissions for all to service_role using (true) with check (true);
create policy "service role manages clinic duty photos"
  on public.sim_clinic_duty_photos for all to service_role using (true) with check (true);
create policy "service role reads clinic duty events"
  on public.sim_clinic_duty_events for select to service_role using (true);
create policy "service role inserts clinic duty events"
  on public.sim_clinic_duty_events for insert to service_role with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sim-clinic-duty',
  'sim-clinic-duty',
  false,
  5000000,
  array['image/jpeg', 'image/webp']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Storage is accessed only with service-issued signed upload and read URLs.
-- Direct object-table access remains denied to browser roles.
drop policy if exists "service role manages sim clinic duty photos" on storage.objects;
create policy "service role manages sim clinic duty photos"
  on storage.objects for all to service_role
  using (bucket_id = 'sim-clinic-duty')
  with check (bucket_id = 'sim-clinic-duty');

create or replace function private.sim_clinic_duty_actor()
returns table (
  profile_id uuid,
  roster_id uuid,
  is_manager boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    r.id,
    (
      p.role = 'owner'
      or 'clinic-duty.manage' = any(coalesce(p.admin_permissions, '{}'::text[]))
    )
  from public.profiles p
  left join public.student_roster r
    on r.id = p.roster_id
   and r.status <> 'withdrawn'
   and r.access_approved
   and r.graduation_year = 2029
  where p.id = (select auth.uid())
    and p.status = 'approved'
    and (
      p.role = 'owner'
      or 'clinic-duty.manage' = any(coalesce(p.admin_permissions, '{}'::text[]))
      or r.id is not null
    );
$$;

create or replace function private.record_sim_clinic_duty_event(
  p_event_type text,
  p_term_id uuid default null,
  p_duty_date_id uuid default null,
  p_slot_id uuid default null,
  p_exchange_id uuid default null,
  p_submission_id uuid default null,
  p_reason text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor record;
  recorded_id bigint;
begin
  select * into actor from private.sim_clinic_duty_actor();
  insert into public.sim_clinic_duty_events (
    term_id, duty_date_id, slot_id, exchange_id, submission_id,
    actor_profile_id, actor_roster_id, event_type, reason, metadata
  )
  values (
    p_term_id, p_duty_date_id, p_slot_id, p_exchange_id, p_submission_id,
    actor.profile_id, actor.roster_id, p_event_type, nullif(btrim(p_reason), ''),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into recorded_id;
  return recorded_id;
end;
$$;

create or replace function private.prevent_sim_clinic_duty_event_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'Sim Clinic Duty audit events are append-only.';
end;
$$;

create trigger sim_clinic_duty_events_append_only
  before update or delete on public.sim_clinic_duty_events
  for each row execute function private.prevent_sim_clinic_duty_event_changes();

create or replace function private.prevent_completed_sim_clinic_submission_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'completed'
     and coalesce(current_setting('app.sim_clinic_duty_reopen', true), '') <> 'on' then
    raise exception 'Completed Sim Clinic Duty submissions are immutable until reopened.';
  end if;
  return new;
end;
$$;

create trigger sim_clinic_duty_submissions_immutable
  before update or delete on public.sim_clinic_duty_submissions
  for each row execute function private.prevent_completed_sim_clinic_submission_changes();

create or replace function private.touch_sim_clinic_duty_slot()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger sim_clinic_duty_slots_touch_updated_at
  before update on public.sim_clinic_duty_slots
  for each row execute function private.touch_sim_clinic_duty_slot();

create or replace function private.expire_sim_clinic_duty_exchanges()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  expired_count integer;
begin
  with expired as (
    update public.sim_clinic_duty_exchanges ex
    set status = 'expired', responded_at = now()
    where ex.status = 'open' and ex.deadline_at <= now()
    returning ex.id, ex.offered_slot_id
  ), recorded as (
    insert into public.sim_clinic_duty_events (
      term_id, duty_date_id, slot_id, exchange_id, event_type
    )
    select d.term_id, d.id, expired.offered_slot_id, expired.id, 'exchange.expired'
    from expired
    join public.sim_clinic_duty_slots s on s.id = expired.offered_slot_id
    join public.sim_clinic_duty_dates d on d.id = s.duty_date_id
    returning 1
  )
  select count(*) into expired_count from recorded;
  return expired_count;
end;
$$;

create or replace function public.get_sim_clinic_duty_portal()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor record;
  selected_term public.sim_clinic_duty_terms%rowtype;
  local_today date;
begin
  perform private.expire_sim_clinic_duty_exchanges();
  select * into actor from private.sim_clinic_duty_actor();
  if actor.profile_id is null then
    raise exception 'Approved D2 access is required.' using errcode = '42501';
  end if;

  select t.* into selected_term
  from public.sim_clinic_duty_terms t
  where actor.is_manager or t.status = 'published'
  order by
    case when t.starts_on <= current_date and t.ends_on >= current_date then 0 else 1 end,
    t.starts_on desc
  limit 1;

  if selected_term.id is null then
    return jsonb_build_object(
      'viewer', jsonb_build_object(
        'profileId', actor.profile_id,
        'rosterId', actor.roster_id,
        'isManager', actor.is_manager
      ),
      'term', null,
      'dates', '[]'::jsonb,
      'exchanges', '[]'::jsonb
    );
  end if;

  local_today := (now() at time zone selected_term.timezone)::date;

  return jsonb_build_object(
    'viewer', jsonb_build_object(
      'profileId', actor.profile_id,
      'rosterId', actor.roster_id,
      'isManager', actor.is_manager
    ),
    'term', jsonb_build_object(
      'id', selected_term.id,
      'slug', selected_term.slug,
      'label', selected_term.label,
      'startsOn', selected_term.starts_on,
      'endsOn', selected_term.ends_on,
      'timezone', selected_term.timezone,
      'status', selected_term.status
    ),
    'dates', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', d.id,
          'date', d.duty_date,
          'opensAt', d.opens_at,
          'closesAt', d.closes_at,
          'dateStatus', d.status,
          'closureReason', d.closure_reason,
          'completionStatus', case
            when d.status = 'closed' then 'closed'
            when sub.status = 'completed' then 'completed'
            when d.duty_date < local_today then 'overdue'
            when d.duty_date = local_today then 'due-today'
            when exists (
              select 1
              from public.sim_clinic_duty_exchanges ex
              join public.sim_clinic_duty_slots xs
                on xs.id in (ex.offered_slot_id, ex.requested_slot_id)
              where xs.duty_date_id = d.id
                and ex.status = 'open'
                and ex.deadline_at > now()
                and ex.kind = 'trade'
            ) then 'trade-pending'
            when exists (
              select 1
              from public.sim_clinic_duty_exchanges ex
              join public.sim_clinic_duty_slots xs on xs.id = ex.offered_slot_id
              where xs.duty_date_id = d.id
                and ex.status = 'open'
                and ex.deadline_at > now()
                and ex.kind = 'release'
            ) then 'released'
            else 'scheduled'
          end,
          'submittedByName', submitted_roster.full_name,
          'submittedAt', sub.submitted_at,
          'slots', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', s.id,
                'position', s.position,
                'originalRosterId', s.original_roster_id,
                'assigneeRosterId', s.assignee_roster_id,
                'assigneeName', r.full_name,
                'isMine', s.assignee_roster_id = actor.roster_id,
                'releaseOpen', exists (
                  select 1 from public.sim_clinic_duty_exchanges ex
                  where ex.offered_slot_id = s.id
                    and ex.kind = 'release'
                    and ex.status = 'open'
                    and ex.deadline_at > now()
                )
              ) order by s.position
            )
            from public.sim_clinic_duty_slots s
            join public.student_roster r on r.id = s.assignee_roster_id
            where s.duty_date_id = d.id
          ), '[]'::jsonb)
        ) order by d.duty_date
      )
      from public.sim_clinic_duty_dates d
      left join public.sim_clinic_duty_submissions sub
        on sub.duty_date_id = d.id and sub.status = 'completed'
      left join public.student_roster submitted_roster
        on submitted_roster.id = sub.submitted_by_roster_id
      where d.term_id = selected_term.id
    ), '[]'::jsonb),
    'exchanges', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', ex.id,
          'kind', ex.kind,
          'offeredSlotId', ex.offered_slot_id,
          'requestedSlotId', ex.requested_slot_id,
          'createdByRosterId', ex.created_by_roster_id,
          'createdByName', creator.full_name,
          'counterpartyRosterId', ex.counterparty_roster_id,
          'counterpartyName', counterparty.full_name,
          'status', case
            when ex.status = 'open' and ex.deadline_at <= now() then 'expired'
            else ex.status
          end,
          'deadlineAt', ex.deadline_at,
          'createdAt', ex.created_at,
          'offeredDate', offered_date.duty_date,
          'requestedDate', requested_date.duty_date
        ) order by ex.created_at desc
      )
      from public.sim_clinic_duty_exchanges ex
      join public.sim_clinic_duty_slots offered on offered.id = ex.offered_slot_id
      join public.sim_clinic_duty_dates offered_date on offered_date.id = offered.duty_date_id
      left join public.sim_clinic_duty_slots requested on requested.id = ex.requested_slot_id
      left join public.sim_clinic_duty_dates requested_date on requested_date.id = requested.duty_date_id
      join public.student_roster creator on creator.id = ex.created_by_roster_id
      left join public.student_roster counterparty on counterparty.id = ex.counterparty_roster_id
      where offered_date.term_id = selected_term.id
        and (
          actor.is_manager
          or ex.kind = 'release'
          or ex.created_by_roster_id = actor.roster_id
          or ex.counterparty_roster_id = actor.roster_id
        )
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.get_sim_clinic_duty_date(p_duty_date date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor record;
  selected_date record;
  may_open boolean;
begin
  perform private.expire_sim_clinic_duty_exchanges();
  select * into actor from private.sim_clinic_duty_actor();
  if actor.profile_id is null then
    raise exception 'Approved D2 access is required.' using errcode = '42501';
  end if;

  select d.*, t.label as term_label, t.status as term_status, t.timezone
  into selected_date
  from public.sim_clinic_duty_dates d
  join public.sim_clinic_duty_terms t on t.id = d.term_id
  where d.duty_date = p_duty_date
    and (actor.is_manager or t.status = 'published')
  order by t.starts_on desc
  limit 1;

  if selected_date.id is null then
    return null;
  end if;

  may_open := actor.is_manager or exists (
    select 1 from public.sim_clinic_duty_slots s
    where s.duty_date_id = selected_date.id
      and s.assignee_roster_id = actor.roster_id
  );
  if not may_open then
    raise exception 'Only the assigned duty pair can open this checklist.' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'viewer', jsonb_build_object(
      'profileId', actor.profile_id,
      'rosterId', actor.roster_id,
      'isManager', actor.is_manager
    ),
    'id', selected_date.id,
    'date', selected_date.duty_date,
    'opensAt', selected_date.opens_at,
    'closesAt', selected_date.closes_at,
    'dateStatus', selected_date.status,
    'closureReason', selected_date.closure_reason,
    'termLabel', selected_date.term_label,
    'termStatus', selected_date.term_status,
    'photoWaived', selected_date.photo_waived_at is not null,
    'photoWaiverReason', selected_date.photo_waiver_reason,
    'slots', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'position', s.position,
        'assigneeRosterId', s.assignee_roster_id,
        'assigneeName', r.full_name,
        'isMine', s.assignee_roster_id = actor.roster_id
      ) order by s.position)
      from public.sim_clinic_duty_slots s
      join public.student_roster r on r.id = s.assignee_roster_id
      where s.duty_date_id = selected_date.id
    ), '[]'::jsonb),
    'submission', (
      select jsonb_build_object(
        'id', sub.id,
        'status', sub.status,
        'checklist', sub.checklist,
        'unsafeIssueReported', sub.unsafe_issue_reported,
        'unsafeIssueType', sub.unsafe_issue_type,
        'unsafeIssueNote', sub.unsafe_issue_note,
        'submittedByName', r.full_name,
        'submittedAt', sub.submitted_at,
        'reopenedAt', sub.reopened_at,
        'reopenReason', sub.reopen_reason
      )
      from public.sim_clinic_duty_submissions sub
      left join public.student_roster r on r.id = sub.submitted_by_roster_id
      where sub.duty_date_id = selected_date.id
    ),
    'photos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'status', p.status,
        'mimeType', p.mime_type,
        'byteSize', p.byte_size,
        'createdAt', p.created_at
      ) order by p.created_at)
      from public.sim_clinic_duty_photos p
      where p.duty_date_id = selected_date.id
        and p.status = 'ready'
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.release_sim_clinic_duty_slot(p_slot_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor record;
  target record;
  exchange_id uuid;
begin
  select * into actor from private.sim_clinic_duty_actor();
  if actor.roster_id is null then
    raise exception 'An approved linked D2 roster identity is required.' using errcode = '42501';
  end if;

  select s.*, d.id as date_id, d.closes_at, d.status as date_status,
         t.id as term_id, t.status as term_status
  into target
  from public.sim_clinic_duty_slots s
  join public.sim_clinic_duty_dates d on d.id = s.duty_date_id
  join public.sim_clinic_duty_terms t on t.id = d.term_id
  where s.id = p_slot_id
  for update of s, d;

  if target.id is null or target.assignee_roster_id <> actor.roster_id then
    raise exception 'You can release only your current assignment.' using errcode = '42501';
  end if;
  if target.term_status <> 'published' or target.date_status <> 'open' or target.closes_at <= now() then
    raise exception 'This duty can no longer be released.' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.sim_clinic_duty_submissions sub
    where sub.duty_date_id = target.date_id and sub.status = 'completed'
  ) then
    raise exception 'Completed duties cannot be released.' using errcode = '22023';
  end if;

  insert into public.sim_clinic_duty_exchanges (
    kind, offered_slot_id, created_by_profile_id, created_by_roster_id, deadline_at
  ) values (
    'release', target.id, actor.profile_id, actor.roster_id, target.closes_at
  ) returning id into exchange_id;

  perform private.record_sim_clinic_duty_event(
    'exchange.release_created', target.term_id, target.date_id, target.id,
    exchange_id, null, null, '{}'::jsonb
  );
  return exchange_id;
end;
$$;

create or replace function public.claim_sim_clinic_duty_release(p_exchange_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor record;
  offer record;
  previous_roster_id uuid;
begin
  select * into actor from private.sim_clinic_duty_actor();
  if actor.roster_id is null then
    raise exception 'An approved linked D2 roster identity is required.' using errcode = '42501';
  end if;

  select ex.*, s.duty_date_id, s.assignee_roster_id,
         d.closes_at, d.status as date_status, t.id as term_id, t.status as term_status
  into offer
  from public.sim_clinic_duty_exchanges ex
  join public.sim_clinic_duty_slots s on s.id = ex.offered_slot_id
  join public.sim_clinic_duty_dates d on d.id = s.duty_date_id
  join public.sim_clinic_duty_terms t on t.id = d.term_id
  where ex.id = p_exchange_id
  for update of ex, s, d;

  if offer.id is null or offer.kind <> 'release' or offer.status <> 'open' then
    raise exception 'This released duty is no longer available.' using errcode = '40001';
  end if;
  if offer.deadline_at <= now() or offer.closes_at <= now()
     or offer.date_status <> 'open' or offer.term_status <> 'published' then
    raise exception 'This released duty has expired.' using errcode = '22023';
  end if;
  if offer.assignee_roster_id = actor.roster_id then
    raise exception 'You cannot claim your own released duty.' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.sim_clinic_duty_slots other
    where other.duty_date_id = offer.duty_date_id
      and other.assignee_roster_id = actor.roster_id
  ) then
    raise exception 'You already have a duty assignment on this date.' using errcode = '23505';
  end if;
  if exists (
    select 1 from public.sim_clinic_duty_submissions sub
    where sub.duty_date_id = offer.duty_date_id and sub.status = 'completed'
  ) then
    raise exception 'Completed duties cannot be claimed.' using errcode = '22023';
  end if;

  previous_roster_id := offer.assignee_roster_id;
  update public.sim_clinic_duty_slots
  set assignee_roster_id = actor.roster_id
  where id = offer.offered_slot_id;

  update public.sim_clinic_duty_exchanges
  set status = 'accepted', responded_by_profile_id = actor.profile_id, responded_at = now()
  where id = offer.id;

  update public.sim_clinic_duty_exchanges
  set status = 'cancelled', responded_at = now()
  where id <> offer.id
    and status = 'open'
    and (offered_slot_id = offer.offered_slot_id or requested_slot_id = offer.offered_slot_id);

  perform private.record_sim_clinic_duty_event(
    'exchange.release_claimed', offer.term_id, offer.duty_date_id, offer.offered_slot_id,
    offer.id, null, null,
    jsonb_build_object('fromRosterId', previous_roster_id, 'toRosterId', actor.roster_id)
  );
end;
$$;

create or replace function public.offer_sim_clinic_duty_trade(
  p_offered_slot_id uuid,
  p_requested_slot_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor record;
  offered record;
  requested record;
  exchange_id uuid;
begin
  select * into actor from private.sim_clinic_duty_actor();
  if actor.roster_id is null then
    raise exception 'An approved linked D2 roster identity is required.' using errcode = '42501';
  end if;
  if p_offered_slot_id = p_requested_slot_id then
    raise exception 'Choose two different duty slots.' using errcode = '22023';
  end if;

  select s.*, d.duty_date, d.opens_at, d.closes_at, d.status as date_status,
         t.id as term_id, t.status as term_status
  into offered
  from public.sim_clinic_duty_slots s
  join public.sim_clinic_duty_dates d on d.id = s.duty_date_id
  join public.sim_clinic_duty_terms t on t.id = d.term_id
  where s.id = p_offered_slot_id
  for update of s, d;

  select s.*, d.duty_date, d.opens_at, d.closes_at, d.status as date_status,
         t.id as term_id, t.status as term_status
  into requested
  from public.sim_clinic_duty_slots s
  join public.sim_clinic_duty_dates d on d.id = s.duty_date_id
  join public.sim_clinic_duty_terms t on t.id = d.term_id
  where s.id = p_requested_slot_id
  for update of s, d;

  if offered.id is null or requested.id is null then
    raise exception 'Duty slot not found.' using errcode = '22023';
  end if;
  if offered.assignee_roster_id <> actor.roster_id then
    raise exception 'You can offer only your current assignment.' using errcode = '42501';
  end if;
  if requested.assignee_roster_id = actor.roster_id then
    raise exception 'You cannot trade with yourself.' using errcode = '22023';
  end if;
  if offered.term_id <> requested.term_id or offered.duty_date = requested.duty_date then
    raise exception 'Trades must use two different future dates in the same term.' using errcode = '22023';
  end if;
  if offered.term_status <> 'published' or requested.term_status <> 'published'
     or offered.date_status <> 'open' or requested.date_status <> 'open'
     or offered.opens_at <= now() or requested.opens_at <= now() then
    raise exception 'Only future open duties can be traded.' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.sim_clinic_duty_submissions sub
    where sub.duty_date_id in (offered.duty_date_id, requested.duty_date_id)
      and sub.status = 'completed'
  ) then
    raise exception 'Completed duties cannot be traded.' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.sim_clinic_duty_slots s
    where s.duty_date_id = requested.duty_date_id
      and s.assignee_roster_id = actor.roster_id
  ) then
    raise exception 'The trade would give you two assignments on one date.' using errcode = '23505';
  end if;
  if exists (
    select 1 from public.sim_clinic_duty_slots s
    where s.duty_date_id = offered.duty_date_id
      and s.assignee_roster_id = requested.assignee_roster_id
  ) then
    raise exception 'The trade would give the other student two assignments on one date.' using errcode = '23505';
  end if;

  insert into public.sim_clinic_duty_exchanges (
    kind, offered_slot_id, requested_slot_id, created_by_profile_id,
    created_by_roster_id, counterparty_roster_id, deadline_at
  ) values (
    'trade', offered.id, requested.id, actor.profile_id,
    actor.roster_id, requested.assignee_roster_id,
    least(offered.opens_at, requested.opens_at)
  ) returning id into exchange_id;

  perform private.record_sim_clinic_duty_event(
    'exchange.trade_created', offered.term_id, offered.duty_date_id, offered.id,
    exchange_id, null, null,
    jsonb_build_object('requestedSlotId', requested.id)
  );
  return exchange_id;
end;
$$;

create or replace function public.respond_sim_clinic_duty_exchange(
  p_exchange_id uuid,
  p_response text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor record;
  exchange_row record;
  offered record;
  requested record;
begin
  select * into actor from private.sim_clinic_duty_actor();
  if actor.profile_id is null then
    raise exception 'Approved D2 access is required.' using errcode = '42501';
  end if;
  if p_response not in ('accepted', 'rejected', 'cancelled') then
    raise exception 'Invalid exchange response.' using errcode = '22023';
  end if;

  select * into exchange_row
  from public.sim_clinic_duty_exchanges
  where id = p_exchange_id
  for update;

  if exchange_row.id is null or exchange_row.status <> 'open' then
    raise exception 'This exchange is no longer open.' using errcode = '40001';
  end if;
  if exchange_row.deadline_at <= now() then
    raise exception 'This exchange has expired.' using errcode = '22023';
  end if;

  if p_response = 'cancelled' then
    if exchange_row.created_by_profile_id <> actor.profile_id and not actor.is_manager then
      raise exception 'Only the creator or a coordinator can cancel this exchange.' using errcode = '42501';
    end if;
    update public.sim_clinic_duty_exchanges
    set status = 'cancelled', responded_by_profile_id = actor.profile_id, responded_at = now()
    where id = exchange_row.id;
    perform private.record_sim_clinic_duty_event(
      'exchange.cancelled', null, null, exchange_row.offered_slot_id,
      exchange_row.id, null, null, '{}'::jsonb
    );
    return;
  end if;

  if exchange_row.kind <> 'trade' or exchange_row.counterparty_roster_id <> actor.roster_id then
    raise exception 'Only the requested student can respond to this trade.' using errcode = '42501';
  end if;

  if p_response = 'rejected' then
    update public.sim_clinic_duty_exchanges
    set status = 'rejected', responded_by_profile_id = actor.profile_id, responded_at = now()
    where id = exchange_row.id;
    perform private.record_sim_clinic_duty_event(
      'exchange.trade_rejected', null, null, exchange_row.offered_slot_id,
      exchange_row.id, null, null, '{}'::jsonb
    );
    return;
  end if;

  select s.*, d.duty_date, d.opens_at, d.status as date_status,
         t.id as term_id, t.status as term_status
  into offered
  from public.sim_clinic_duty_slots s
  join public.sim_clinic_duty_dates d on d.id = s.duty_date_id
  join public.sim_clinic_duty_terms t on t.id = d.term_id
  where s.id = exchange_row.offered_slot_id
  for update of s, d;

  select s.*, d.duty_date, d.opens_at, d.status as date_status,
         t.id as term_id, t.status as term_status
  into requested
  from public.sim_clinic_duty_slots s
  join public.sim_clinic_duty_dates d on d.id = s.duty_date_id
  join public.sim_clinic_duty_terms t on t.id = d.term_id
  where s.id = exchange_row.requested_slot_id
  for update of s, d;

  if offered.assignee_roster_id <> exchange_row.created_by_roster_id
     or requested.assignee_roster_id <> exchange_row.counterparty_roster_id then
    raise exception 'One of these assignments changed before the trade was accepted.' using errcode = '40001';
  end if;
  if offered.term_status <> 'published' or requested.term_status <> 'published'
     or offered.date_status <> 'open' or requested.date_status <> 'open'
     or offered.opens_at <= now() or requested.opens_at <= now() then
    raise exception 'Only future open duties can be traded.' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.sim_clinic_duty_slots s
    where s.duty_date_id = requested.duty_date_id
      and s.assignee_roster_id = exchange_row.created_by_roster_id
  ) or exists (
    select 1 from public.sim_clinic_duty_slots s
    where s.duty_date_id = offered.duty_date_id
      and s.assignee_roster_id = exchange_row.counterparty_roster_id
  ) then
    raise exception 'This trade would create a duplicate same-day assignment.' using errcode = '23505';
  end if;

  -- Temporary values are safe because the uniqueness constraint is per date.
  update public.sim_clinic_duty_slots
  set assignee_roster_id = exchange_row.counterparty_roster_id
  where id = offered.id;
  update public.sim_clinic_duty_slots
  set assignee_roster_id = exchange_row.created_by_roster_id
  where id = requested.id;

  update public.sim_clinic_duty_exchanges
  set status = 'accepted', responded_by_profile_id = actor.profile_id, responded_at = now()
  where id = exchange_row.id;

  update public.sim_clinic_duty_exchanges
  set status = 'cancelled', responded_at = now()
  where id <> exchange_row.id
    and status = 'open'
    and (
      offered_slot_id in (offered.id, requested.id)
      or requested_slot_id in (offered.id, requested.id)
    );

  perform private.record_sim_clinic_duty_event(
    'exchange.trade_accepted', offered.term_id, offered.duty_date_id, offered.id,
    exchange_row.id, null, null,
    jsonb_build_object('requestedSlotId', requested.id)
  );
end;
$$;

create or replace function public.register_sim_clinic_duty_photo(
  p_duty_date_id uuid,
  p_storage_path text,
  p_mime_type text,
  p_byte_size integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor record;
  target record;
  photo_id uuid;
begin
  select * into actor from private.sim_clinic_duty_actor();
  if actor.roster_id is null then
    raise exception 'An approved linked D2 roster identity is required.' using errcode = '42501';
  end if;

  select d.*, t.status as term_status
  into target
  from public.sim_clinic_duty_dates d
  join public.sim_clinic_duty_terms t on t.id = d.term_id
  where d.id = p_duty_date_id
  for update of d;

  if target.id is null or target.term_status <> 'published' or target.status <> 'open' then
    raise exception 'This duty is not open for photo evidence.' using errcode = '22023';
  end if;
  if now() < target.opens_at then
    raise exception 'Photos can be added only when the duty date begins.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.sim_clinic_duty_slots s
    where s.duty_date_id = target.id and s.assignee_roster_id = actor.roster_id
  ) then
    raise exception 'Only the current duty pair can add photos.' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.sim_clinic_duty_submissions sub
    where sub.duty_date_id = target.id and sub.status = 'completed'
  ) then
    raise exception 'Completed submissions are immutable.' using errcode = '22023';
  end if;
  if (select count(*) from public.sim_clinic_duty_photos p where p.duty_date_id = target.id) >= 4 then
    raise exception 'A duty submission can include at most four photos.' using errcode = '22023';
  end if;
  if p_storage_path !~ ('^duty/' || target.id::text || '/[0-9a-f-]{36}[.](jpg|webp)$') then
    raise exception 'Invalid photo storage path.' using errcode = '22023';
  end if;
  if p_mime_type not in ('image/jpeg', 'image/webp') or p_byte_size not between 1 and 5000000 then
    raise exception 'Invalid photo type or size.' using errcode = '22023';
  end if;

  insert into public.sim_clinic_duty_photos (
    duty_date_id, storage_path, mime_type, byte_size,
    uploaded_by_profile_id, uploaded_by_roster_id
  ) values (
    target.id, p_storage_path, p_mime_type, p_byte_size,
    actor.profile_id, actor.roster_id
  ) returning id into photo_id;

  perform private.record_sim_clinic_duty_event(
    'photo.upload_prepared', target.term_id, target.id, null, null, null, null,
    jsonb_build_object('photoId', photo_id)
  );
  return photo_id;
end;
$$;

create or replace function public.confirm_sim_clinic_duty_photo(p_photo_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.sim_clinic_duty_photos
  set status = 'ready', ready_at = now(), purge_after = now() + interval '60 days'
  where id = p_photo_id and status = 'pending';
  if not found then
    raise exception 'Pending photo not found.' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.complete_sim_clinic_duty(
  p_duty_date_id uuid,
  p_checklist jsonb,
  p_unsafe_issue_reported boolean default false,
  p_unsafe_issue_type text default null,
  p_unsafe_issue_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor record;
  target record;
  submission_row public.sim_clinic_duty_submissions%rowtype;
  required_key text;
  ready_photo_count integer;
begin
  select * into actor from private.sim_clinic_duty_actor();
  if actor.roster_id is null then
    raise exception 'An approved linked D2 roster identity is required.' using errcode = '42501';
  end if;

  select d.*, t.status as term_status
  into target
  from public.sim_clinic_duty_dates d
  join public.sim_clinic_duty_terms t on t.id = d.term_id
  where d.id = p_duty_date_id
  for update of d;

  if target.id is null or target.term_status <> 'published' or target.status <> 'open' then
    raise exception 'This duty is not open for completion.' using errcode = '22023';
  end if;
  if now() < target.opens_at then
    raise exception 'The checklist can be completed only when the duty date begins.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.sim_clinic_duty_slots s
    where s.duty_date_id = target.id and s.assignee_roster_id = actor.roster_id
  ) then
    raise exception 'Only the current duty pair can complete this checklist.' using errcode = '42501';
  end if;

  foreach required_key in array array[
    'shared_counters', 'work_surfaces', 'dispensing_areas', 'sinks_faucets',
    'floors', 'aisles', 'trash_recycling', 'shared_equipment',
    'stools_chairs', 'clear_pathways', 'supply_problems', 'final_walkthrough'
  ] loop
    if coalesce((p_checklist ->> required_key)::boolean, false) is not true then
      raise exception 'Complete every shared-space checklist item.' using errcode = '22023';
    end if;
  end loop;

  if p_unsafe_issue_reported
     and char_length(btrim(coalesce(p_unsafe_issue_note, ''))) not between 3 and 1000 then
    raise exception 'Describe the unsafe issue that was reported.' using errcode = '22023';
  end if;

  select count(*) into ready_photo_count
  from public.sim_clinic_duty_photos p
  where p.duty_date_id = target.id and p.status = 'ready';
  if target.photo_waived_at is null and ready_photo_count < 1 then
    raise exception 'At least one processed photo is required.' using errcode = '22023';
  end if;
  if ready_photo_count > 4 then
    raise exception 'A duty submission can include at most four photos.' using errcode = '22023';
  end if;

  select * into submission_row
  from public.sim_clinic_duty_submissions sub
  where sub.duty_date_id = target.id
  for update;

  if submission_row.id is not null and submission_row.status = 'completed' then
    raise exception 'This completed submission is immutable.' using errcode = '22023';
  end if;

  if submission_row.id is null then
    insert into public.sim_clinic_duty_submissions (
      duty_date_id, checklist, unsafe_issue_reported, unsafe_issue_type,
      unsafe_issue_note, submitted_by_profile_id, submitted_by_roster_id
    ) values (
      target.id, p_checklist, coalesce(p_unsafe_issue_reported, false),
      nullif(btrim(p_unsafe_issue_type), ''), nullif(btrim(p_unsafe_issue_note), ''),
      actor.profile_id, actor.roster_id
    ) returning * into submission_row;
  else
    update public.sim_clinic_duty_submissions
    set status = 'completed',
        checklist = p_checklist,
        unsafe_issue_reported = coalesce(p_unsafe_issue_reported, false),
        unsafe_issue_type = nullif(btrim(p_unsafe_issue_type), ''),
        unsafe_issue_note = nullif(btrim(p_unsafe_issue_note), ''),
        submitted_by_profile_id = actor.profile_id,
        submitted_by_roster_id = actor.roster_id,
        submitted_at = now()
    where id = submission_row.id
    returning * into submission_row;
  end if;

  update public.sim_clinic_duty_exchanges
  set status = 'cancelled', responded_at = now()
  where status = 'open'
    and (
      offered_slot_id in (select id from public.sim_clinic_duty_slots where duty_date_id = target.id)
      or requested_slot_id in (select id from public.sim_clinic_duty_slots where duty_date_id = target.id)
    );

  perform private.record_sim_clinic_duty_event(
    'submission.completed', target.term_id, target.id, null, null,
    submission_row.id, null,
    jsonb_build_object('photoCount', ready_photo_count, 'unsafeIssueReported', p_unsafe_issue_reported)
  );
  return submission_row.id;
end;
$$;

create or replace function public.get_sim_clinic_duty_admin()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor record;
  selected_term public.sim_clinic_duty_terms%rowtype;
begin
  perform private.expire_sim_clinic_duty_exchanges();
  select * into actor from private.sim_clinic_duty_actor();
  if actor.profile_id is null or not actor.is_manager then
    raise exception 'Sim Clinic Duty coordinator access is required.' using errcode = '42501';
  end if;

  select * into selected_term
  from public.sim_clinic_duty_terms
  order by starts_on desc
  limit 1;

  return jsonb_build_object(
    'term', case when selected_term.id is null then null else jsonb_build_object(
      'id', selected_term.id,
      'slug', selected_term.slug,
      'label', selected_term.label,
      'startsOn', selected_term.starts_on,
      'endsOn', selected_term.ends_on,
      'status', selected_term.status,
      'publishedAt', selected_term.published_at
    ) end,
    'summary', jsonb_build_object(
      'openDates', (
        select count(*) from public.sim_clinic_duty_dates d
        where d.term_id = selected_term.id and d.status = 'open'
      ),
      'closedDates', (
        select count(*) from public.sim_clinic_duty_dates d
        where d.term_id = selected_term.id and d.status = 'closed'
      ),
      'slots', (
        select count(*) from public.sim_clinic_duty_slots s
        join public.sim_clinic_duty_dates d on d.id = s.duty_date_id
        where d.term_id = selected_term.id and d.status = 'open'
      ),
      'completedDates', (
        select count(*) from public.sim_clinic_duty_submissions sub
        join public.sim_clinic_duty_dates d on d.id = sub.duty_date_id
        where d.term_id = selected_term.id and sub.status = 'completed'
      ),
      'overdueDates', (
        select count(*) from public.sim_clinic_duty_dates d
        where d.term_id = selected_term.id
          and d.status = 'open'
          and d.duty_date < (now() at time zone selected_term.timezone)::date
          and not exists (
            select 1 from public.sim_clinic_duty_submissions sub
            where sub.duty_date_id = d.id and sub.status = 'completed'
          )
      )
    ),
    'workload', coalesce((
      select jsonb_agg(jsonb_build_object(
        'rosterId', roster.id,
        'name', roster.full_name,
        'status', roster.status,
        'dutyCount', coalesce(work.duty_count, 0),
        'futureDutyCount', coalesce(work.future_count, 0)
      ) order by roster.full_name)
      from public.student_roster roster
      left join (
        select s.assignee_roster_id,
               count(*) as duty_count,
               count(*) filter (where d.closes_at > now() and d.status = 'open') as future_count
        from public.sim_clinic_duty_slots s
        join public.sim_clinic_duty_dates d on d.id = s.duty_date_id
        where d.term_id = selected_term.id
        group by s.assignee_roster_id
      ) work on work.assignee_roster_id = roster.id
      where roster.graduation_year = selected_term.graduation_year
        and roster.access_approved
    ), '[]'::jsonb),
    'dates', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', d.id,
        'date', d.duty_date,
        'opensAt', d.opens_at,
        'closesAt', d.closes_at,
        'status', d.status,
        'closureReason', d.closure_reason,
        'photoWaived', d.photo_waived_at is not null,
        'photoWaiverReason', d.photo_waiver_reason,
        'submissionStatus', sub.status,
        'unsafeIssueReported', coalesce(sub.unsafe_issue_reported, false),
        'slots', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', s.id,
            'position', s.position,
            'assigneeRosterId', s.assignee_roster_id,
            'assigneeName', r.full_name,
            'originalRosterId', s.original_roster_id
          ) order by s.position)
          from public.sim_clinic_duty_slots s
          join public.student_roster r on r.id = s.assignee_roster_id
          where s.duty_date_id = d.id
        ), '[]'::jsonb)
      ) order by d.duty_date)
      from public.sim_clinic_duty_dates d
      left join public.sim_clinic_duty_submissions sub on sub.duty_date_id = d.id
      where d.term_id = selected_term.id
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'eventType', e.event_type,
        'reason', e.reason,
        'metadata', e.metadata,
        'actorName', r.full_name,
        'dutyDate', d.duty_date,
        'createdAt', e.created_at
      ) order by e.created_at desc)
      from (
        select * from public.sim_clinic_duty_events
        where term_id = selected_term.id
        order by created_at desc
        limit 200
      ) e
      left join public.student_roster r on r.id = e.actor_roster_id
      left join public.sim_clinic_duty_dates d on d.id = e.duty_date_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.publish_sim_clinic_duty_term(p_term_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor record;
  open_date_count integer;
  slot_count integer;
begin
  select * into actor from private.sim_clinic_duty_actor();
  if actor.profile_id is null or not actor.is_manager then
    raise exception 'Sim Clinic Duty coordinator access is required.' using errcode = '42501';
  end if;

  select count(*) into open_date_count
  from public.sim_clinic_duty_dates
  where term_id = p_term_id and status = 'open';
  select count(*) into slot_count
  from public.sim_clinic_duty_slots s
  join public.sim_clinic_duty_dates d on d.id = s.duty_date_id
  where d.term_id = p_term_id and d.status = 'open';

  if open_date_count <> 104 or slot_count <> 208 or exists (
    select 1
    from public.sim_clinic_duty_dates d
    left join public.sim_clinic_duty_slots s on s.duty_date_id = d.id
    where d.term_id = p_term_id and d.status = 'open'
    group by d.id
    having count(s.id) <> 2 or count(distinct s.assignee_roster_id) <> 2
  ) then
    raise exception 'The Fall 2026 schedule must contain 104 open dates and two unique assignments per date.';
  end if;

  update public.sim_clinic_duty_terms
  set status = 'published', published_at = now(), published_by = actor.profile_id
  where id = p_term_id and status = 'draft';
  if not found then
    raise exception 'Only a draft term can be published.' using errcode = '22023';
  end if;

  perform private.record_sim_clinic_duty_event(
    'term.published', p_term_id, null, null, null, null, null, '{}'::jsonb
  );
end;
$$;

create or replace function public.set_sim_clinic_duty_date_closed(
  p_duty_date_id uuid,
  p_closed boolean,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor record;
  target public.sim_clinic_duty_dates%rowtype;
begin
  select * into actor from private.sim_clinic_duty_actor();
  if actor.profile_id is null or not actor.is_manager then
    raise exception 'Sim Clinic Duty coordinator access is required.' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) not between 3 and 500 then
    raise exception 'A reason is required.' using errcode = '22023';
  end if;

  select * into target from public.sim_clinic_duty_dates
  where id = p_duty_date_id for update;
  if target.id is null then
    raise exception 'Duty date not found.' using errcode = '22023';
  end if;

  update public.sim_clinic_duty_dates
  set status = case when p_closed then 'closed' else 'open' end,
      closure_reason = case when p_closed then btrim(p_reason) else null end
  where id = target.id;

  if p_closed then
    update public.sim_clinic_duty_exchanges
    set status = 'cancelled', responded_by_profile_id = actor.profile_id, responded_at = now()
    where status = 'open'
      and (
        offered_slot_id in (select id from public.sim_clinic_duty_slots where duty_date_id = target.id)
        or requested_slot_id in (select id from public.sim_clinic_duty_slots where duty_date_id = target.id)
      );
  end if;

  perform private.record_sim_clinic_duty_event(
    case when p_closed then 'date.closed' else 'date.reopened' end,
    target.term_id, target.id, null, null, null, p_reason, '{}'::jsonb
  );
end;
$$;

create or replace function public.override_sim_clinic_duty_slot(
  p_slot_id uuid,
  p_roster_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor record;
  target record;
  previous_roster_id uuid;
begin
  select * into actor from private.sim_clinic_duty_actor();
  if actor.profile_id is null or not actor.is_manager then
    raise exception 'Sim Clinic Duty coordinator access is required.' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) not between 3 and 500 then
    raise exception 'A reason is required.' using errcode = '22023';
  end if;

  select s.*, d.id as date_id, d.opens_at, d.status as date_status, t.id as term_id
  into target
  from public.sim_clinic_duty_slots s
  join public.sim_clinic_duty_dates d on d.id = s.duty_date_id
  join public.sim_clinic_duty_terms t on t.id = d.term_id
  where s.id = p_slot_id
  for update of s, d;

  if target.id is null or target.opens_at <= now() or target.date_status <> 'open' then
    raise exception 'Only future open assignments can be overridden.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.student_roster r
    where r.id = p_roster_id and r.graduation_year = 2029
      and r.access_approved and r.status <> 'withdrawn'
  ) then
    raise exception 'Choose an eligible D2 student.' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.sim_clinic_duty_slots s
    where s.duty_date_id = target.date_id
      and s.assignee_roster_id = p_roster_id and s.id <> target.id
  ) then
    raise exception 'That student already has duty on this date.' using errcode = '23505';
  end if;

  previous_roster_id := target.assignee_roster_id;
  update public.sim_clinic_duty_slots
  set assignee_roster_id = p_roster_id where id = target.id;
  update public.sim_clinic_duty_exchanges
  set status = 'cancelled', responded_by_profile_id = actor.profile_id, responded_at = now()
  where status = 'open'
    and (offered_slot_id = target.id or requested_slot_id = target.id);

  perform private.record_sim_clinic_duty_event(
    'assignment.overridden', target.term_id, target.date_id, target.id,
    null, null, p_reason,
    jsonb_build_object('fromRosterId', previous_roster_id, 'toRosterId', p_roster_id)
  );
end;
$$;

create or replace function public.waive_sim_clinic_duty_photo(
  p_duty_date_id uuid,
  p_waived boolean,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor record;
  target public.sim_clinic_duty_dates%rowtype;
begin
  select * into actor from private.sim_clinic_duty_actor();
  if actor.profile_id is null or not actor.is_manager then
    raise exception 'Sim Clinic Duty coordinator access is required.' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) not between 3 and 500 then
    raise exception 'A reason is required.' using errcode = '22023';
  end if;

  select * into target from public.sim_clinic_duty_dates
  where id = p_duty_date_id for update;
  if target.id is null then
    raise exception 'Duty date not found.' using errcode = '22023';
  end if;

  update public.sim_clinic_duty_dates
  set photo_waived_at = case when p_waived then now() else null end,
      photo_waived_by = case when p_waived then actor.profile_id else null end,
      photo_waiver_reason = case when p_waived then btrim(p_reason) else null end
  where id = target.id;

  perform private.record_sim_clinic_duty_event(
    case when p_waived then 'photo.waived' else 'photo.waiver_removed' end,
    target.term_id, target.id, null, null, null, p_reason, '{}'::jsonb
  );
end;
$$;

create or replace function public.reopen_sim_clinic_duty_submission(
  p_duty_date_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor record;
  target record;
begin
  select * into actor from private.sim_clinic_duty_actor();
  if actor.profile_id is null or not actor.is_manager then
    raise exception 'Sim Clinic Duty coordinator access is required.' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) not between 3 and 500 then
    raise exception 'A reason is required.' using errcode = '22023';
  end if;

  select sub.*, d.term_id
  into target
  from public.sim_clinic_duty_submissions sub
  join public.sim_clinic_duty_dates d on d.id = sub.duty_date_id
  where sub.duty_date_id = p_duty_date_id
  for update of sub;
  if target.id is null or target.status <> 'completed' then
    raise exception 'A completed submission is required.' using errcode = '22023';
  end if;

  perform set_config('app.sim_clinic_duty_reopen', 'on', true);
  update public.sim_clinic_duty_submissions
  set status = 'reopened', reopened_at = now(), reopened_by = actor.profile_id,
      reopen_reason = btrim(p_reason)
  where id = target.id;

  perform private.record_sim_clinic_duty_event(
    'submission.reopened', target.term_id, target.duty_date_id, null, null,
    target.id, p_reason, '{}'::jsonb
  );
end;
$$;

create or replace function public.get_sim_clinic_duty_calendar()
returns table (
  duty_date date,
  opens_at timestamptz,
  closes_at timestamptz,
  partner_name text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor record;
begin
  select * into actor from private.sim_clinic_duty_actor();
  if actor.roster_id is null then
    raise exception 'An approved linked D2 roster identity is required.' using errcode = '42501';
  end if;

  return query
  select d.duty_date, d.opens_at, d.closes_at,
         string_agg(partner.full_name, ', ' order by partner.full_name)
  from public.sim_clinic_duty_slots mine
  join public.sim_clinic_duty_dates d on d.id = mine.duty_date_id
  join public.sim_clinic_duty_terms t on t.id = d.term_id
  join public.sim_clinic_duty_slots other
    on other.duty_date_id = d.id and other.id <> mine.id
  join public.student_roster partner on partner.id = other.assignee_roster_id
  where mine.assignee_roster_id = actor.roster_id
    and t.status = 'published'
    and d.status = 'open'
  group by d.id
  order by d.duty_date;
end;
$$;

-- The roster seed uses preferred names and is idempotent. Existing roster
-- identities and spellings are preserved; only missing students are inserted.
create temporary table sim_clinic_duty_roster_seed (
  preferred_name text primary key
) on commit drop;

insert into sim_clinic_duty_roster_seed (preferred_name) values
  ('Aabid Syed'),
  ('Aamir Qadri'),
  ('Abby Siener'),
  ('Abhi Patel'),
  ('Adam Yusoff'),
  ('Adrian Kang'),
  ('Alisar Makki'),
  ('Amira Elfeel'),
  ('Anita Panatch'),
  ('Blossom Parkinson'),
  ('Callahan Cowles'),
  ('Carmen Barghouty'),
  ('Carson Colahan'),
  ('Chris Aerni'),
  ('Claire Proulx'),
  ('Clara Luisetti'),
  ('Colby Clavecilla'),
  ('Dai Ngo'),
  ('Danean Kim'),
  ('Daniella Sosonov'),
  ('Elise Whisman'),
  ('Elissa Aziz'),
  ('Emily Yang'),
  ('Emma Dalton'),
  ('Enzo Sugameli'),
  ('Florencia Hilburn'),
  ('George Labib'),
  ('Gokul Anirudhan'),
  ('Ian Loh'),
  ('Isaac Chavez'),
  ('Jacqueline Palusak'),
  ('Joe Eisentraut'),
  ('Jordan Sobe'),
  ('Julia Guidone'),
  ('Julia Kerns'),
  ('Kadyn Heising'),
  ('Karandeep Singh'),
  ('Keinaz Kadkhoda'),
  ('Kermina Banoub'),
  ('Kiana Beheshtian'),
  ('Lily Dorsch'),
  ('Lina Alsmoudi'),
  ('Luchen Yu'),
  ('Maja Jovanovic'),
  ('Mara Grieshop'),
  ('Mariam Wahba'),
  ('Marielle Parks'),
  ('Max Hardt'),
  ('Melanie Hribar'),
  ('Michael Raj'),
  ('Michelle Huang'),
  ('Natalie Melert'),
  ('Nate Dallmann'),
  ('Neil Desai'),
  ('Nikita Chhabra'),
  ('Olivia LaGrasta'),
  ('Paige Gaynier'),
  ('Paige Siener'),
  ('Pierson Hull'),
  ('Rania Latifi'),
  ('Raquel Putrus'),
  ('Reem Hayek'),
  ('Reese Dehen'),
  ('Rick Ahn'),
  ('Rosaly Romero'),
  ('Sanjula Reddy'),
  ('Sarah Klingerman'),
  ('Scott Herman'),
  ('Seth Lee'),
  ('Shani Hussain'),
  ('Sophia Li'),
  ('Suhani Nog'),
  ('Tanvi Mallya'),
  ('Tara Gairing'),
  ('Taylor Lordo'),
  ('Tyler Nguyen'),
  ('Ursula M. Pountou'),
  ('Xinlin Yang'),
  ('Za''Niya Walker'),
  ('Zain Shaikh'),
  ('Zakir Kassam'),
  ('Zuhair Rizvi');

insert into public.student_roster (
  full_name, email, cohort, status, graduation_year,
  access_approved, access_approved_at
)
select
  seed.preferred_name,
  null,
  'class-2029',
  'expected',
  2029,
  true,
  now()
from sim_clinic_duty_roster_seed seed
where not exists (
  select 1
  from public.student_roster existing
  where existing.graduation_year = 2029
    and lower(existing.full_name) = lower(seed.preferred_name)
);

update public.student_roster roster
set access_approved = true,
    access_approved_at = coalesce(roster.access_approved_at, now()),
    cohort = 'class-2029'
from sim_clinic_duty_roster_seed seed
where roster.graduation_year = 2029
  and lower(roster.full_name) = lower(seed.preferred_name);

do $$
declare
  matched_count integer;
begin
  select count(*) into matched_count
  from sim_clinic_duty_roster_seed seed
  join public.student_roster roster
    on roster.graduation_year = 2029
   and lower(roster.full_name) = lower(seed.preferred_name);

  if matched_count <> 82 or exists (
    select 1
    from sim_clinic_duty_roster_seed seed
    left join public.student_roster roster
      on roster.graduation_year = 2029
     and lower(roster.full_name) = lower(seed.preferred_name)
    group by seed.preferred_name
    having count(roster.id) <> 1
  ) then
    raise exception 'Sim Clinic Duty requires exactly one roster identity for each of 82 preferred names.';
  end if;
end $$;

insert into public.sim_clinic_duty_terms (
  slug, label, graduation_year, starts_on, ends_on, timezone, status, schedule_seed
)
values (
  'fall-2026', 'Fall 2026', 2029, date '2026-08-14', date '2026-12-16',
  'America/New_York', 'draft', 'fall-2026-d2-82-v1'
)
on conflict (slug) do nothing;

with term as (
  select id from public.sim_clinic_duty_terms where slug = 'fall-2026'
), calendar_days as (
  select day::date as duty_date
  from generate_series(date '2026-08-14', date '2026-12-16', interval '1 day') day
  where extract(isodow from day) between 1 and 6
)
insert into public.sim_clinic_duty_dates (
  term_id, duty_date, opens_at, closes_at, status, closure_reason
)
select
  term.id,
  calendar_days.duty_date,
  (calendar_days.duty_date + time '07:00') at time zone 'America/New_York',
  (
    calendar_days.duty_date
    + case
        when extract(isodow from calendar_days.duty_date) = 6 then time '19:00'
        else time '23:00'
      end
  ) at time zone 'America/New_York',
  case
    when calendar_days.duty_date in (date '2026-09-07', date '2026-11-26', date '2026-11-27')
      then 'closed'
    else 'open'
  end,
  case
    when calendar_days.duty_date = date '2026-09-07' then 'University holiday — Labor Day'
    when calendar_days.duty_date in (date '2026-11-26', date '2026-11-27')
      then 'University holiday — Thanksgiving recess'
    else null
  end
from term cross join calendar_days
on conflict (term_id, duty_date) do nothing;

with term as (
  select id from public.sim_clinic_duty_terms where slug = 'fall-2026'
), eligible as (
  select roster.id,
         row_number() over (order by lower(roster.full_name), roster.id) - 1 as roster_index
  from public.student_roster roster
  join sim_clinic_duty_roster_seed seed
    on lower(seed.preferred_name) = lower(roster.full_name)
  where roster.graduation_year = 2029
    and roster.access_approved
    and roster.status <> 'withdrawn'
), open_dates as (
  select d.id,
         row_number() over (order by d.duty_date) - 1 as date_index
  from public.sim_clinic_duty_dates d
  join term on term.id = d.term_id
  where d.status = 'open'
), planned as (
  select
    open_dates.id as duty_date_id,
    assignment.position,
    assignment.roster_index
  from open_dates
  cross join lateral (
    values
      (1::smallint, (open_dates.date_index % 82)::bigint),
      (
        2::smallint,
        case
          when open_dates.date_index < 82 then ((open_dates.date_index + 27) % 82)::bigint
          else (22 + ((open_dates.date_index - 82 + 1) % 22))::bigint
        end
      )
  ) assignment(position, roster_index)
)
insert into public.sim_clinic_duty_slots (
  duty_date_id, position, original_roster_id, assignee_roster_id
)
select planned.duty_date_id, planned.position, eligible.id, eligible.id
from planned
join eligible on eligible.roster_index = planned.roster_index
on conflict (duty_date_id, position) do nothing;

do $$
declare
  target_term_id uuid;
  open_date_count integer;
  slot_count integer;
  three_duty_count integer;
  two_duty_count integer;
begin
  select id into target_term_id from public.sim_clinic_duty_terms where slug = 'fall-2026';
  select count(*) into open_date_count
  from public.sim_clinic_duty_dates
  where sim_clinic_duty_dates.term_id = target_term_id and status = 'open';
  select count(*) into slot_count
  from public.sim_clinic_duty_slots s
  join public.sim_clinic_duty_dates d on d.id = s.duty_date_id
  where d.term_id = target_term_id and d.status = 'open';

  select
    count(*) filter (where duty_count = 3),
    count(*) filter (where duty_count = 2)
  into three_duty_count, two_duty_count
  from (
    select s.assignee_roster_id, count(*) as duty_count
    from public.sim_clinic_duty_slots s
    join public.sim_clinic_duty_dates d on d.id = s.duty_date_id
    where d.term_id = target_term_id and d.status = 'open'
    group by s.assignee_roster_id
  ) workload;

  if open_date_count <> 104 or slot_count <> 208
     or three_duty_count <> 44 or two_duty_count <> 38
     or exists (
       select 1
       from public.sim_clinic_duty_dates d
       left join public.sim_clinic_duty_slots s on s.duty_date_id = d.id
       where d.term_id = target_term_id and d.status = 'open'
       group by d.id
       having count(s.id) <> 2 or count(distinct s.assignee_roster_id) <> 2
     ) then
    raise exception 'Invalid Sim Clinic Duty seed schedule: expected 104 dates, 208 slots, and a 44/38 workload split.';
  end if;
end $$;

insert into public.sim_clinic_duty_events (term_id, event_type, metadata)
select id, 'term.schedule_seeded', jsonb_build_object(
  'openDates', 104,
  'slots', 208,
  'studentsWithThree', 44,
  'studentsWithTwo', 38,
  'seed', schedule_seed
)
from public.sim_clinic_duty_terms
where slug = 'fall-2026'
  and not exists (
    select 1 from public.sim_clinic_duty_events e
    where e.term_id = sim_clinic_duty_terms.id and e.event_type = 'term.schedule_seeded'
  );

revoke all on function private.sim_clinic_duty_actor()
  from public, anon, authenticated, service_role;
revoke all on function private.record_sim_clinic_duty_event(text, uuid, uuid, uuid, uuid, uuid, text, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function private.prevent_sim_clinic_duty_event_changes()
  from public, anon, authenticated, service_role;
revoke all on function private.prevent_completed_sim_clinic_submission_changes()
  from public, anon, authenticated, service_role;
revoke all on function private.touch_sim_clinic_duty_slot()
  from public, anon, authenticated, service_role;
revoke all on function private.expire_sim_clinic_duty_exchanges()
  from public, anon, authenticated, service_role;

revoke all on function public.get_sim_clinic_duty_portal()
  from public, anon, authenticated;
revoke all on function public.get_sim_clinic_duty_date(date)
  from public, anon, authenticated;
revoke all on function public.release_sim_clinic_duty_slot(uuid)
  from public, anon, authenticated;
revoke all on function public.claim_sim_clinic_duty_release(uuid)
  from public, anon, authenticated;
revoke all on function public.offer_sim_clinic_duty_trade(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.respond_sim_clinic_duty_exchange(uuid, text)
  from public, anon, authenticated;
revoke all on function public.register_sim_clinic_duty_photo(uuid, text, text, integer)
  from public, anon, authenticated;
revoke all on function public.confirm_sim_clinic_duty_photo(uuid)
  from public, anon, authenticated;
revoke all on function public.complete_sim_clinic_duty(uuid, jsonb, boolean, text, text)
  from public, anon, authenticated;
revoke all on function public.get_sim_clinic_duty_admin()
  from public, anon, authenticated;
revoke all on function public.publish_sim_clinic_duty_term(uuid)
  from public, anon, authenticated;
revoke all on function public.set_sim_clinic_duty_date_closed(uuid, boolean, text)
  from public, anon, authenticated;
revoke all on function public.override_sim_clinic_duty_slot(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.waive_sim_clinic_duty_photo(uuid, boolean, text)
  from public, anon, authenticated;
revoke all on function public.reopen_sim_clinic_duty_submission(uuid, text)
  from public, anon, authenticated;
revoke all on function public.get_sim_clinic_duty_calendar()
  from public, anon, authenticated;

grant execute on function public.get_sim_clinic_duty_portal() to authenticated;
grant execute on function public.get_sim_clinic_duty_date(date) to authenticated;
grant execute on function public.release_sim_clinic_duty_slot(uuid) to authenticated;
grant execute on function public.claim_sim_clinic_duty_release(uuid) to authenticated;
grant execute on function public.offer_sim_clinic_duty_trade(uuid, uuid) to authenticated;
grant execute on function public.respond_sim_clinic_duty_exchange(uuid, text) to authenticated;
grant execute on function public.register_sim_clinic_duty_photo(uuid, text, text, integer) to authenticated;
grant execute on function public.complete_sim_clinic_duty(uuid, jsonb, boolean, text, text) to authenticated;
grant execute on function public.get_sim_clinic_duty_admin() to authenticated;
grant execute on function public.publish_sim_clinic_duty_term(uuid) to authenticated;
grant execute on function public.set_sim_clinic_duty_date_closed(uuid, boolean, text) to authenticated;
grant execute on function public.override_sim_clinic_duty_slot(uuid, uuid, text) to authenticated;
grant execute on function public.waive_sim_clinic_duty_photo(uuid, boolean, text) to authenticated;
grant execute on function public.reopen_sim_clinic_duty_submission(uuid, text) to authenticated;
grant execute on function public.get_sim_clinic_duty_calendar() to authenticated;
grant execute on function public.confirm_sim_clinic_duty_photo(uuid) to service_role;

create or replace function public.update_sim_clinic_duty_date_hours(
  p_duty_date_id uuid,
  p_opens_local text,
  p_closes_local text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor record;
  target record;
  resolved_opens_at timestamptz;
  resolved_closes_at timestamptz;
begin
  select * into actor from private.sim_clinic_duty_actor();
  if actor.profile_id is null or not actor.is_manager then
    raise exception 'Sim Clinic Duty coordinator access is required.' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) not between 3 and 500 then
    raise exception 'A reason is required.' using errcode = '22023';
  end if;
  select d.*, t.timezone, t.id as selected_term_id
  into target
  from public.sim_clinic_duty_dates d
  join public.sim_clinic_duty_terms t on t.id = d.term_id
  where d.id = p_duty_date_id
  for update of d;
  if target.id is null then
    raise exception 'Duty date not found.' using errcode = '22023';
  end if;

  begin
    resolved_opens_at := p_opens_local::timestamp at time zone target.timezone;
    resolved_closes_at := p_closes_local::timestamp at time zone target.timezone;
  exception when others then
    raise exception 'Use valid local opening and closing times.' using errcode = '22023';
  end;
  if resolved_closes_at <= resolved_opens_at then
    raise exception 'Closing time must be after opening time.' using errcode = '22023';
  end if;
  if (resolved_opens_at at time zone target.timezone)::date <> target.duty_date
     or (resolved_closes_at at time zone target.timezone)::date <> target.duty_date then
    raise exception 'Opening and closing times must stay on the selected clinic date.' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.sim_clinic_duty_submissions sub
    where sub.duty_date_id = target.id and sub.status = 'completed'
  ) then
    raise exception 'Reopen the completed submission before correcting this date.' using errcode = '22023';
  end if;

  update public.sim_clinic_duty_dates
  set opens_at = resolved_opens_at, closes_at = resolved_closes_at
  where id = target.id;

  update public.sim_clinic_duty_exchanges
  set deadline_at = case
    when kind = 'release' and offered_slot_id in (
      select id from public.sim_clinic_duty_slots where duty_date_id = target.id
    ) then resolved_closes_at
    else deadline_at
  end
  where status = 'open';

  perform private.record_sim_clinic_duty_event(
    'date.hours_corrected', target.selected_term_id, target.id, null, null, null,
    p_reason,
    jsonb_build_object('opensAt', resolved_opens_at, 'closesAt', resolved_closes_at)
  );
end;
$$;

revoke all on function public.update_sim_clinic_duty_date_hours(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.update_sim_clinic_duty_date_hours(uuid, text, text, text)
  to authenticated;
