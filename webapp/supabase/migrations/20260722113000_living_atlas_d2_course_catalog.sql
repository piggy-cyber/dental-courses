-- D2 Living Atlas source edition.
--
-- These rows define the founder-only D2 course shelf. Omar's source cards are
-- loaded separately by the idempotent source-edition importer and are delivered
-- only through Recall Practice. Paired lecture/lab codes deliberately resolve
-- to one catalog page, avoiding duplicated decks and progress.

create table if not exists public.practice_course_aliases (
  course_code text not null references public.practice_course_catalog(course_code) on delete cascade,
  related_course_code text not null references public.courses(code) on delete restrict,
  relationship text not null default 'paired_lab'
    check (relationship in ('paired_lab', 'related_course')),
  created_at timestamptz not null default now(),
  primary key (course_code, related_course_code),
  check (course_code <> related_course_code)
);

alter table public.practice_course_aliases enable row level security;
revoke all on public.practice_course_aliases from anon, authenticated;

create index if not exists practice_course_aliases_related_idx
  on public.practice_course_aliases (related_course_code, course_code);

create table if not exists public.practice_source_imports (
  source_id text primary key references public.practice_sources(id) on delete cascade,
  dataset_version text not null,
  content_sha256 text not null check (content_sha256 ~ '^[a-f0-9]{64}$'),
  source_path text not null,
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.practice_source_imports enable row level security;
revoke all on public.practice_source_imports from anon, authenticated;

create or replace function public.living_atlas_register_source_media(p_media jsonb)
returns integer
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_count integer;
begin
  if jsonb_typeof(p_media) <> 'array' or jsonb_array_length(p_media) > 1000 then
    raise exception 'living_atlas_source_media_payload_invalid';
  end if;

  with source_media as (
    select *
    from jsonb_to_recordset(p_media) as media(
      source_id text,
      source_order integer,
      source_url text,
      storage_bucket text,
      storage_path text,
      sha256 text,
      mime_type text,
      byte_size bigint,
      cache_status text,
      cache_error text
    )
  ), validated as (
    select * from source_media
    where source_id is not null
      and source_order > 0
      and source_url is not null
      and storage_bucket is not null
      and sha256 ~ '^[a-f0-9]{64}$'
      and cache_status in ('cached', 'failed')
      and (cache_status <> 'cached' or (storage_path is not null and mime_type like 'image/%' and byte_size > 0))
  )
  insert into public.practice_media_assets (
    id, storage_bucket, storage_path, source_url, sha256, mime_type,
    byte_size, cache_status, cache_error, rights_note, updated_at
  )
  select
    'media:' || sha256,
    storage_bucket,
    storage_path,
    source_url,
    sha256,
    mime_type,
    byte_size,
    cache_status,
    cache_error,
    'Private founder-authorized Omar source image. Preserve provenance; do not hotlink.',
    now()
  from (
    select distinct on (sha256) *
    from validated
    order by sha256, source_id, source_order
  ) as unique_assets
  on conflict (id) do update set
    storage_bucket = case when practice_media_assets.cache_status = 'cached' then practice_media_assets.storage_bucket else excluded.storage_bucket end,
    storage_path = case when practice_media_assets.cache_status = 'cached' then practice_media_assets.storage_path else excluded.storage_path end,
    mime_type = case when practice_media_assets.cache_status = 'cached' then practice_media_assets.mime_type else excluded.mime_type end,
    byte_size = case when practice_media_assets.cache_status = 'cached' then practice_media_assets.byte_size else excluded.byte_size end,
    cache_status = case when practice_media_assets.cache_status = 'cached' then practice_media_assets.cache_status else excluded.cache_status end,
    cache_error = case when practice_media_assets.cache_status = 'cached' then practice_media_assets.cache_error else excluded.cache_error end,
    updated_at = now();

  with source_media as (
    select *
    from jsonb_to_recordset(p_media) as media(
      source_id text,
      source_order integer,
      source_url text,
      storage_bucket text,
      storage_path text,
      sha256 text,
      mime_type text,
      byte_size bigint,
      cache_status text,
      cache_error text
    )
  ), validated as (
    select * from source_media
    where source_id is not null
      and source_order > 0
      and source_url is not null
      and sha256 ~ '^[a-f0-9]{64}$'
      and cache_status in ('cached', 'failed')
  )
  update public.practice_questions question
  set image_storage_path = case
    when media.cache_status = 'cached' then coalesce(asset.storage_path, media.storage_path)
    else null
  end,
  updated_at = now()
  from validated media
  left join public.practice_media_assets asset on asset.id = 'media:' || media.sha256
  where question.source_id = media.source_id
    and question.source_order = media.source_order
    and question.source_image_url = media.source_url;

  get diagnostics v_count = row_count;
  if v_count <> jsonb_array_length(p_media) then
    raise exception 'living_atlas_source_media_question_mismatch:%', v_count;
  end if;
  return v_count;
end;
$$;

revoke all on function public.living_atlas_register_source_media(jsonb) from public, anon, authenticated;
grant execute on function public.living_atlas_register_source_media(jsonb) to service_role;

insert into public.courses (
  code, title, semester, area, sort_order, library_tier, resource_collection_id
) values
  ('HWDP 232', 'Renal and Hematologic Systems in Health and Disease', 'Fall', 'D2', 10, 'd2', 'd2-2025-2026'),
  ('HWDP 243', 'Endocrine and Reproductive Systems in Health and Disease', 'Fall', 'D2', 20, 'd2', 'd2-2025-2026'),
  ('HWDP 245', 'Musculoskeletal System in Health and Disease', 'Fall', 'D2', 30, 'd2', 'd2-2025-2026'),
  ('HWDP 246', 'Neuroscience in Health and Disease', 'Fall', 'D2', 40, 'd2', 'd2-2025-2026'),
  ('MAHE 241', 'Preventive Periodontics', 'Fall', 'D2', 50, 'd2', 'd2-2025-2026'),
  ('REHE 257', 'Prosthodontic Technology', 'Fall', 'D2', 60, 'd2', 'd2-2025-2026'),
  ('REHE 267', 'Prosthodontic Technology Laboratory', 'Fall', 'D2', 61, 'd2', 'd2-2025-2026'),
  ('REHE 259', 'Basic Procedures in Fixed Prosthodontics II', 'Fall', 'D2', 70, 'd2', 'd2-2025-2026'),
  ('REHE 269', 'Basic Procedures in Fixed Prosthodontics II Laboratory', 'Fall', 'D2', 71, 'd2', 'd2-2025-2026'),
  ('REHE 262', 'Basic Procedures in Restorative Dentistry II', 'Fall', 'D2', 80, 'd2', 'd2-2025-2026'),
  ('REHE 272', 'Basic Procedures in Restorative Dentistry II Laboratory', 'Fall', 'D2', 81, 'd2', 'd2-2025-2026'),
  ('REHE 264', 'Endodontics', 'Fall', 'D2', 90, 'd2', 'd2-2025-2026'),
  ('DSPR 232', 'Periodontics', 'Spring', 'D2', 110, 'd2', 'd2-2025-2026'),
  ('DSPR 234', 'Oral and Maxillofacial Pathology', 'Spring', 'D2', 120, 'd2', 'd2-2025-2026'),
  ('INQU 202', 'Introduction to Medicine: Patient Assessment', 'Spring', 'D2', 130, 'd2', 'd2-2025-2026'),
  ('REHE 252', 'Pain Control', 'Spring', 'D2', 140, 'd2', 'd2-2025-2026'),
  ('REHE 253', 'Basic Procedures in Esthetics', 'Spring', 'D2', 150, 'd2', 'd2-2025-2026'),
  ('REHE 254', 'Pharmacology', 'Spring', 'D2', 160, 'd2', 'd2-2025-2026'),
  ('REHE 260', 'Basic Procedures in Fixed Prosthodontics III', 'Spring', 'D2', 170, 'd2', 'd2-2025-2026'),
  ('REHE 270', 'Basic Procedures in Fixed Prosthodontics III Laboratory', 'Spring', 'D2', 171, 'd2', 'd2-2025-2026'),
  ('REHE 266', 'Partial Denture Design', 'Spring', 'D2', 180, 'd2', 'd2-2025-2026')
on conflict (code) do update set
  title = excluded.title,
  semester = excluded.semester,
  area = excluded.area,
  sort_order = excluded.sort_order,
  library_tier = excluded.library_tier,
  resource_collection_id = excluded.resource_collection_id;

insert into public.practice_course_catalog (
  course_code, slug, academic_year, term, status, description, sort_order
) values
  ('HWDP 232', 'd2-fall-hwdp-232-renal-and-hematologic-systems', 'D2', 'Fall', 'review', 'Omar source edition · Recall Practice only.', 10),
  ('HWDP 243', 'd2-fall-hwdp-243-endocrine-and-reproductive-systems', 'D2', 'Fall', 'review', 'Omar source edition · Recall Practice only.', 20),
  ('HWDP 245', 'd2-fall-hwdp-245-musculoskeletal-system', 'D2', 'Fall', 'review', 'Omar source edition · Recall Practice only.', 30),
  ('HWDP 246', 'd2-fall-hwdp-246-neuroscience', 'D2', 'Fall', 'review', 'Omar source edition · Recall Practice only.', 40),
  ('MAHE 241', 'd2-fall-mahe-241-preventive-periodontics', 'D2', 'Fall', 'review', 'Omar source edition · Recall Practice only.', 50),
  ('REHE 257', 'd2-fall-rehe-257-prosthodontic-technology', 'D2', 'Fall', 'review', 'Omar source edition · Recall Practice only.', 60),
  ('REHE 259', 'd2-fall-rehe-259-basic-procedures-fixed-prosthodontics-ii', 'D2', 'Fall', 'review', 'Omar source edition · Recall Practice only.', 70),
  ('REHE 262', 'd2-fall-rehe-262-basic-procedures-restorative-dentistry-ii', 'D2', 'Fall', 'review', 'Omar source edition · Recall Practice only.', 80),
  ('REHE 264', 'd2-fall-rehe-264-endodontics', 'D2', 'Fall', 'review', 'Omar source edition · Recall Practice only.', 90),
  ('DSPR 232', 'd2-spring-dspr-232-periodontics', 'D2', 'Spring', 'review', 'Omar source edition · Recall Practice only.', 110),
  ('DSPR 234', 'd2-spring-dspr-234-oral-and-maxillofacial-pathology', 'D2', 'Spring', 'review', 'Omar source edition · Recall Practice only.', 120),
  ('INQU 202', 'd2-spring-inqu-202-introduction-to-medicine', 'D2', 'Spring', 'review', 'Omar source edition · Recall Practice only.', 130),
  ('REHE 252', 'd2-spring-rehe-252-pain-control', 'D2', 'Spring', 'review', 'Omar source edition · Recall Practice only.', 140),
  ('REHE 253', 'd2-spring-rehe-253-basic-procedures-esthetics', 'D2', 'Spring', 'review', 'Omar source edition · Recall Practice only.', 150),
  ('REHE 254', 'd2-spring-rehe-254-pharmacology', 'D2', 'Spring', 'review', 'Omar source edition · Recall Practice only.', 160),
  ('REHE 260', 'd2-spring-rehe-260-basic-procedures-fixed-prosthodontics-iii', 'D2', 'Spring', 'review', 'Omar source edition · Recall Practice only.', 170),
  ('REHE 266', 'd2-spring-rehe-266-partial-denture-design', 'D2', 'Spring', 'review', 'Omar source edition · Recall Practice only.', 180)
on conflict (course_code) do update set
  slug = excluded.slug,
  academic_year = excluded.academic_year,
  term = excluded.term,
  status = excluded.status,
  description = excluded.description,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.practice_course_aliases (course_code, related_course_code, relationship)
values
  ('REHE 257', 'REHE 267', 'paired_lab'),
  ('REHE 259', 'REHE 269', 'paired_lab'),
  ('REHE 262', 'REHE 272', 'paired_lab'),
  ('REHE 260', 'REHE 270', 'paired_lab')
on conflict (course_code, related_course_code) do update
set relationship = excluded.relationship;
