-- Public support reports are inserted only by the server route using the
-- service role. Existing signed-in resource reporting remains supported.

alter table public.resource_reports
  alter column user_id drop not null,
  add column if not exists reporter_name text,
  add column if not exists reporter_email text,
  add column if not exists source text not null default 'signed_in',
  add column if not exists page_path text,
  add column if not exists public_reference_id uuid,
  add column if not exists request_fingerprint text;

alter table public.resource_reports
  drop constraint if exists resource_reports_category_check,
  add constraint resource_reports_category_check
    check (category in (
      'file', 'missing', 'wrong_match', 'broken_link', 'site', 'account', 'accessibility',
      'content', 'privacy', 'copyright', 'security', 'other'
    )),
  add constraint resource_reports_source_check
    check (source in ('signed_in', 'public_support')),
  add constraint resource_reports_page_path_check
    check (page_path is null or (page_path like '/%' and page_path not like '//%'));

create unique index if not exists resource_reports_public_reference_id_key
  on public.resource_reports (public_reference_id)
  where public_reference_id is not null;
create index if not exists resource_reports_public_support_inbox_idx
  on public.resource_reports (status, created_at desc)
  where source = 'public_support';

-- Public clients do not receive direct report-table access. The existing
-- authenticated insert policy remains available for signed-in course reports.
revoke all on table public.resource_reports from anon;

create schema if not exists private;

create table if not exists private.public_support_rate_limits (
  request_fingerprint text primary key check (request_fingerprint ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null,
  accepted_count smallint not null check (accepted_count between 1 and 3),
  updated_at timestamptz not null default now()
);

alter table private.public_support_rate_limits enable row level security;
revoke all on table private.public_support_rate_limits from public, anon, authenticated;

-- This function is intentionally in public so the server's service-role client
-- can call it through PostgREST. It is not callable by anon or authenticated.
create or replace function public.accept_public_support_report(p_fingerprint text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  accepted boolean := false;
begin
  if p_fingerprint is null or p_fingerprint !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid support request fingerprint.' using errcode = '22023';
  end if;

  insert into private.public_support_rate_limits as current_limit (
    request_fingerprint,
    window_started_at,
    accepted_count,
    updated_at
  )
  values (p_fingerprint, now(), 1, now())
  on conflict (request_fingerprint) do update
  set
    window_started_at = case
      when current_limit.window_started_at <= now() - interval '1 hour' then now()
      else current_limit.window_started_at
    end,
    accepted_count = case
      when current_limit.window_started_at <= now() - interval '1 hour' then 1
      else current_limit.accepted_count + 1
    end,
    updated_at = now()
  where current_limit.window_started_at <= now() - interval '1 hour'
     or current_limit.accepted_count < 3
  returning true into accepted;

  return accepted;
end;
$$;

revoke all on function public.accept_public_support_report(text)
  from public, anon, authenticated;
grant execute on function public.accept_public_support_report(text) to service_role;
