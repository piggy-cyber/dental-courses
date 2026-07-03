-- Resource problem reports from students. Run in Supabase SQL Editor.

create table if not exists public.resource_reports (
  id bigint generated always as identity primary key,
  resource_id bigint not null references public.resources (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists resource_reports_resource_idx on public.resource_reports (resource_id);

alter table public.resource_reports enable row level security;

drop policy if exists "users insert own reports" on public.resource_reports;
create policy "users insert own reports" on public.resource_reports
  for insert with check (user_id = auth.uid());

drop policy if exists "owner reads reports" on public.resource_reports;
create policy "owner reads reports" on public.resource_reports
  for select using (public.is_owner());
