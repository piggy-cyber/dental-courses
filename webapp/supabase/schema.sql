-- Fourth Canal course workspace schema
-- Run this once in the Supabase SQL editor (paste the whole file and click Run).

-- ---------------------------------------------------------------------------
-- Profiles: one row per signed-in Google account. Everyone starts "pending".
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text,
  role text not null default 'student' check (role in ('student', 'owner')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'revoked')),
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

-- Auto-create a pending profile whenever someone signs in for the first time.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper checks used by the row-security policies below.
create or replace function public.is_approved()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'approved'
  );
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'owner' and status = 'approved'
  );
$$;

-- ---------------------------------------------------------------------------
-- Course content
-- ---------------------------------------------------------------------------
create table if not exists public.courses (
  code text primary key,
  title text not null,
  semester text,
  semester_id text,
  area text,
  sort_order integer not null default 0
);

create table if not exists public.lectures (
  id text primary key,
  course_code text not null references public.courses (code) on delete cascade,
  title text not null,
  lecture_date date,
  transcript_source text,
  youtube_id text,
  youtube_visibility text,
  synthetic boolean not null default false,
  sort_order integer not null default 0
);

create table if not exists public.transcripts (
  lecture_id text primary key references public.lectures (id) on delete cascade,
  content text not null,
  word_count integer,
  download_name text
);

create table if not exists public.resources (
  id bigint generated always as identity primary key,
  course_code text not null references public.courses (code) on delete cascade,
  name text not null,
  kind text,
  ext text,
  section text,
  use_label text,
  size_mb numeric,
  storage_path text,
  is_canonical_syllabus boolean not null default false
);

create index if not exists lectures_course_idx on public.lectures (course_code, sort_order);
create index if not exists resources_course_idx on public.resources (course_code);

-- ---------------------------------------------------------------------------
-- Row security: approved accounts see content; owner manages accounts.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.lectures enable row level security;
alter table public.transcripts enable row level security;
alter table public.resources enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select using (id = auth.uid() or public.is_owner());

drop policy if exists "owner updates profiles" on public.profiles;
create policy "owner updates profiles" on public.profiles
  for update using (public.is_owner()) with check (public.is_owner());

drop policy if exists "approved read courses" on public.courses;
create policy "approved read courses" on public.courses
  for select using (public.is_approved());

drop policy if exists "approved read lectures" on public.lectures;
create policy "approved read lectures" on public.lectures
  for select using (public.is_approved());

drop policy if exists "approved read transcripts" on public.transcripts;
create policy "approved read transcripts" on public.transcripts
  for select using (public.is_approved());

drop policy if exists "approved read resources" on public.resources;
create policy "approved read resources" on public.resources
  for select using (public.is_approved());

-- ---------------------------------------------------------------------------
-- Private file bucket. Files are served through short-lived signed URLs only.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('course-files', 'course-files', false)
on conflict (id) do nothing;
