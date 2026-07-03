-- Per-user Canvas calendar feed URL.
alter table public.profiles
  add column if not exists canvas_ics_url text;
