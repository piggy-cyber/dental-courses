-- Catalog every immutable source set under its course, even before it has a
-- playable delivery bank. This keeps captured Omar sets organized without
-- pretending that ungenerated content is ready to study.

create table if not exists public.practice_course_sources (
  course_code text not null references public.practice_course_catalog(course_code) on delete cascade,
  source_id text not null references public.practice_sources(id) on delete restrict,
  status text not null default 'captured'
    check (status in ('captured', 'generated', 'review', 'released', 'retired')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (course_code, source_id)
);

insert into public.practice_course_sources (course_code, source_id, status, sort_order)
select
  'REHE 151',
  source.id,
  case when source.id = 'quizlet-932842633' then 'review' else 'captured' end,
  row_number() over (order by source.deck)
from public.practice_sources source
where source.platform = 'quizlet'
  and source.folder = 'Dental Anatomy'
on conflict (course_code, source_id) do update
set status = excluded.status,
    sort_order = excluded.sort_order,
    updated_at = now();

alter table public.practice_course_sources enable row level security;
revoke all on public.practice_course_sources from anon, authenticated;

create index if not exists practice_course_sources_course_status_idx
  on public.practice_course_sources (course_code, status, sort_order, source_id);
