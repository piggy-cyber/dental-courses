-- Content change audit log for admin and bot uploads.
-- Run once in Supabase SQL editor.

create table if not exists public.content_events (
  id bigint generated always as identity primary key,
  course_code text not null references public.courses (code) on delete cascade,
  collection_id text not null references public.resource_collections (id) on delete cascade,
  action text not null,
  summary text not null,
  actor_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists content_events_course_idx
  on public.content_events (course_code, collection_id, created_at desc);

alter table public.content_events enable row level security;

create policy "Owners read content events"
  on public.content_events for select
  using (public.is_owner());
