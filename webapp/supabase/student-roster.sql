-- Student roster foundation. Run before access-tiers.sql.

create table if not exists public.student_roster (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  cohort text not null,
  status text not null default 'expected'
    check (status in ('expected', 'signed_in', 'withdrawn')),
  profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists student_roster_email_unique
  on public.student_roster (lower(email))
  where email is not null and btrim(email) <> '';

create unique index if not exists student_roster_name_cohort_email_empty_unique
  on public.student_roster (lower(full_name), cohort)
  where email is null or btrim(email) = '';

create index if not exists student_roster_profile_idx
  on public.student_roster (profile_id);

create index if not exists student_roster_cohort_idx
  on public.student_roster (cohort);

create or replace function public.touch_student_roster_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists student_roster_touch_updated_at on public.student_roster;
create trigger student_roster_touch_updated_at
  before update on public.student_roster
  for each row execute function public.touch_student_roster_updated_at();

alter table public.student_roster enable row level security;

drop policy if exists "owner reads student roster" on public.student_roster;
create policy "owner reads student roster" on public.student_roster
  for select using (public.is_owner());

drop policy if exists "owner inserts student roster" on public.student_roster;
create policy "owner inserts student roster" on public.student_roster
  for insert with check (public.is_owner());

drop policy if exists "owner updates student roster" on public.student_roster;
create policy "owner updates student roster" on public.student_roster
  for update using (public.is_owner()) with check (public.is_owner());

drop policy if exists "owner deletes student roster" on public.student_roster;
create policy "owner deletes student roster" on public.student_roster
  for delete using (public.is_owner());
