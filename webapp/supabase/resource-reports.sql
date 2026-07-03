-- Resource and site problem reports from students.

create table if not exists public.resource_reports (
  id bigint generated always as identity primary key,
  resource_id bigint references public.resources (id) on delete set null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_code text references public.courses (code) on delete set null,
  category text not null default 'file'
    check (category in ('file', 'missing', 'wrong_match', 'broken_link', 'site', 'account', 'other')),
  message text not null,
  status text not null default 'open'
    check (status in ('open', 'resolved', 'dismissed')),
  admin_note text,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.resource_reports
  alter column resource_id drop not null,
  add column if not exists course_code text references public.courses (code) on delete set null,
  add column if not exists category text not null default 'file',
  add column if not exists status text not null default 'open',
  add column if not exists admin_note text,
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by uuid references public.profiles (id) on delete set null;

alter table public.resource_reports
  drop constraint if exists resource_reports_category_check,
  drop constraint if exists resource_reports_status_check;

alter table public.resource_reports
  add constraint resource_reports_category_check
    check (category in ('file', 'missing', 'wrong_match', 'broken_link', 'site', 'account', 'other')),
  add constraint resource_reports_status_check
    check (status in ('open', 'resolved', 'dismissed'));

create index if not exists resource_reports_resource_idx on public.resource_reports (resource_id);
create index if not exists resource_reports_status_idx on public.resource_reports (status, created_at desc);
create index if not exists resource_reports_course_idx on public.resource_reports (course_code);

alter table public.resource_reports enable row level security;

drop policy if exists "users insert own reports" on public.resource_reports;
create policy "users insert own reports" on public.resource_reports
  for insert with check (user_id = auth.uid());

drop policy if exists "owner reads reports" on public.resource_reports;
create policy "owner reads reports" on public.resource_reports
  for select using (public.is_owner());

drop policy if exists "owner updates reports" on public.resource_reports;
create policy "owner updates reports" on public.resource_reports
  for update using (public.is_owner()) with check (public.is_owner());
