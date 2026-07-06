-- Resource organization: taxonomy lookup, course sections, resource FKs.
-- Run once in Supabase SQL editor after resource-collections.sql.
-- Re-run the INSERT section after editing webapp/data/resource-taxonomy.md
-- and running: node webapp/scripts/generate-resource-taxonomy.mjs

-- ---------------------------------------------------------------------------
-- Global taxonomy (mirrors webapp/data/resource-taxonomy.md)
-- ---------------------------------------------------------------------------
create table if not exists public.resource_roles (
  id text primary key,
  label text not null,
  group_type text not null check (
    group_type in ('essential', 'lecture', 'supplemental', 'inbox', 'archive')
  ),
  kind text not null,
  default_section text not null,
  is_canonical_syllabus boolean not null default false,
  sort_order integer not null default 0,
  description text
);

insert into public.resource_roles (id, label, group_type, kind, default_section, is_canonical_syllabus, sort_order)
values
  ('essential_syllabus', 'Syllabus', 'essential', 'Syllabus', 'Syllabus', true, 10),
  ('essential_mastery', 'Mastery guide', 'essential', 'Course Mastery Guide', 'Mastery guide', false, 20),
  ('essential_companion', 'Textbook companion', 'essential', 'Textbook Companion', 'Textbook companion', false, 30),
  ('lecture_slides', 'Slides', 'lecture', 'Slides', 'Lecture', false, 40),
  ('lecture_transcript_file', 'Transcript file', 'lecture', 'Document', 'Lecture', false, 50),
  ('lecture_other', 'Other file', 'lecture', 'Document', 'Lecture', false, 60),
  ('supplemental_lab_guide', 'Lab guide', 'supplemental', 'Lab Guide', 'Lab guide', false, 70),
  ('supplemental_flashcards', 'Flashcards', 'supplemental', 'Flashcards', 'Flashcards', false, 80),
  ('supplemental_document', 'Document', 'supplemental', 'Document', 'Documents', false, 90),
  ('supplemental_local_media', 'Supplemental video', 'supplemental', 'Local Media Source', 'Videos', false, 100),
  ('supplemental_other', 'Other', 'supplemental', 'Document', 'Other', false, 110),
  ('inbox', 'Inbox (unassigned)', 'inbox', 'Document', 'Inbox', false, 1000)
on conflict (id) do update set
  label = excluded.label,
  group_type = excluded.group_type,
  kind = excluded.kind,
  default_section = excluded.default_section,
  is_canonical_syllabus = excluded.is_canonical_syllabus,
  sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- Per-course display sections (student page + admin organizer)
-- ---------------------------------------------------------------------------
create table if not exists public.course_sections (
  id text primary key,
  course_code text not null references public.courses (code) on delete cascade,
  resource_collection_id text not null references public.resource_collections (id) on delete cascade,
  label text not null,
  section_type text not null check (
    section_type in ('lectures', 'labs', 'extras', 'archive', 'custom')
  ),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (course_code, resource_collection_id, label)
);

create index if not exists course_sections_course_idx
  on public.course_sections (course_code, resource_collection_id, sort_order);

-- ---------------------------------------------------------------------------
-- Resource organization columns
-- ---------------------------------------------------------------------------
alter table public.resources
  add column if not exists resource_role text references public.resource_roles (id),
  add column if not exists lecture_id text references public.lectures (id) on delete set null,
  add column if not exists section_id text references public.course_sections (id) on delete set null,
  add column if not exists sort_order integer not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists resources_lecture_idx on public.resources (lecture_id);
create index if not exists resources_role_idx on public.resources (resource_role);
create index if not exists resources_section_idx on public.resources (section_id);

-- Backfill resource_role from legacy kind / use_label patterns
update public.resources r
set resource_role = case
  when r.is_canonical_syllabus or r.kind = 'Syllabus' then 'essential_syllabus'
  when r.kind = 'Course Mastery Guide' then 'essential_mastery'
  when r.kind = 'Textbook Companion' then 'essential_companion'
  when r.section = 'Inbox' or r.use_label = 'unassigned' then 'inbox'
  when r.use_label like '%-slides' then 'lecture_slides'
  when r.use_label like '%-transcript-file' then 'lecture_transcript_file'
  when r.use_label like 'lecture-%' or r.use_label like '%-other' then 'lecture_other'
  when r.use_label like 'supplemental-lab_guide' or r.kind = 'Lab Guide' then 'supplemental_lab_guide'
  when r.use_label like 'supplemental-flashcards' or r.kind = 'Flashcards' then 'supplemental_flashcards'
  when r.use_label like 'supplemental-local_media' or r.kind = 'Local Media Source' then 'supplemental_local_media'
  when r.use_label like 'supplemental-document' then 'supplemental_document'
  when r.use_label like 'supplemental-other' then 'supplemental_other'
  when r.use_label like 'supplemental-%' then 'supplemental_other'
  else null
end
where r.resource_role is null;

-- Link lecture resources via use_label prefix (collection-scoped lecture ids)
update public.resources r
set lecture_id = l.id
from public.lectures l
where r.lecture_id is null
  and r.use_label is not null
  and r.use_label like l.id || '-%'
  and r.course_code = l.course_code
  and r.resource_collection_id = l.resource_collection_id;

-- ---------------------------------------------------------------------------
-- Row security for course_sections
-- ---------------------------------------------------------------------------
alter table public.course_sections enable row level security;
alter table public.resource_roles enable row level security;

drop policy if exists "approved read resource_roles" on public.resource_roles;
create policy "approved read resource_roles" on public.resource_roles
  for select using (public.is_approved());

drop policy if exists "approved read course_sections" on public.course_sections;
create policy "approved read course_sections" on public.course_sections
  for select using (public.is_approved());

drop policy if exists "owner manage course_sections" on public.course_sections;
create policy "owner manage course_sections" on public.course_sections
  for all using (public.is_owner()) with check (public.is_owner());
