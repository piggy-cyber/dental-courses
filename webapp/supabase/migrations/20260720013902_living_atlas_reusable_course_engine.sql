-- Reusable Living Atlas course engine.
--
-- This is additive. It keeps the current founder-only Dental Anatomy Lecture 1
-- bank running while giving every future course the same catalog, taxonomy,
-- source, media, versioning, and progress contracts.

create table if not exists public.practice_course_catalog (
  course_code text primary key references public.courses(code) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  academic_year text not null check (academic_year in ('D1', 'D2', 'D3', 'D4')),
  term text not null check (term in ('Summer', 'Fall', 'Spring', 'Multiple')),
  status text not null default 'draft'
    check (status in ('draft', 'review', 'released', 'retired')),
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.practice_taxonomy_nodes (
  course_code text not null references public.practice_course_catalog(course_code) on delete cascade,
  node_id text not null check (node_id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  parent_node_id text,
  node_type text not null
    check (node_type in ('unit', 'domain', 'topic', 'concept', 'objective')),
  label text not null check (char_length(trim(label)) between 1 and 180),
  objective_text text,
  sort_order integer not null default 0,
  released boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (course_code, node_id),
  foreign key (course_code, parent_node_id)
    references public.practice_taxonomy_nodes(course_code, node_id)
    on delete restrict,
  check (
    (node_type = 'unit' and parent_node_id is null)
    or (node_type <> 'unit' and parent_node_id is not null)
  )
);

alter table public.practice_banks
  add column if not exists bank_kind text not null default 'practice_problem'
    check (bank_kind in ('practice_problem', 'practice_test')),
  add column if not exists provenance text not null default 'source_derived'
    check (provenance in ('source_derived', 'fourth_canal_original')),
  add column if not exists course_slug text,
  add column if not exists content_contract_version text not null default 'course-package-v1';

alter table public.practice_banks
  drop constraint if exists practice_banks_course_code_fkey;

alter table public.practice_banks
  add constraint practice_banks_course_code_fkey
  foreign key (course_code) references public.practice_course_catalog(course_code)
  on delete restrict not valid;

create table if not exists public.practice_bank_sources (
  bank_id text not null references public.practice_banks(id) on delete cascade,
  source_id text not null references public.practice_sources(id) on delete restrict,
  source_role text not null default 'included'
    check (source_role in ('included', 'supporting', 'excluded')),
  created_at timestamptz not null default now(),
  primary key (bank_id, source_id)
);

insert into public.practice_bank_sources (bank_id, source_id, source_role)
select id, source_id, 'included'
from public.practice_banks
on conflict (bank_id, source_id) do nothing;

create table if not exists public.practice_media_assets (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9._:-]*$'),
  storage_bucket text not null,
  storage_path text,
  source_url text,
  sha256 text,
  mime_type text,
  byte_size bigint check (byte_size is null or byte_size > 0),
  cache_status text not null default 'pending'
    check (cache_status in ('pending', 'cached', 'unavailable', 'failed')),
  cache_error text,
  rights_note text not null default 'Founder review only.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (storage_bucket, storage_path),
  check (cache_status <> 'cached' or (storage_path is not null and mime_type like 'image/%'))
);

create table if not exists public.practice_variant_media (
  variant_id text not null references public.practice_variants(id) on delete restrict,
  media_asset_id text not null references public.practice_media_assets(id) on delete restrict,
  placement text not null
    check (placement in ('prompt', 'feedback', 'results')),
  display_order integer not null default 1 check (display_order > 0),
  alt_text text,
  caption text,
  created_at timestamptz not null default now(),
  primary key (variant_id, media_asset_id, placement),
  unique (variant_id, placement, display_order)
);

insert into public.practice_media_assets (
  id,
  storage_bucket,
  storage_path,
  source_url,
  sha256,
  mime_type,
  byte_size,
  cache_status,
  cache_error,
  rights_note
)
select
  'media:' || coalesce(media.sha256, media.id),
  media.storage_bucket,
  media.storage_path,
  media.source_url,
  media.sha256,
  media.mime_type,
  media.byte_size,
  case media.cache_status
    when 'cached' then 'cached'
    when 'failed' then 'failed'
    else 'pending'
  end,
  media.cache_error,
  'Private founder review source image. Do not hotlink or publish.'
from (
  select distinct on (coalesce(sha256, id)) *
  from public.practice_source_media
  order by coalesce(sha256, id), updated_at desc
) media
on conflict (id) do update
set updated_at = now();

insert into public.practice_variant_media (
  variant_id,
  media_asset_id,
  placement,
  display_order,
  alt_text,
  caption
)
select
  media.variant_id,
  'media:' || coalesce(media.sha256, media.id),
  case variant.assessment_image_placement
    when 'pre_commit' then 'prompt'
    when 'post_commit' then 'feedback'
    when 'review_only' then 'results'
    else 'feedback'
  end,
  1,
  null,
  null
from public.practice_source_media media
join public.practice_variants variant on variant.id = media.variant_id
on conflict (variant_id, media_asset_id, placement) do nothing;

alter table public.practice_bank_version_questions
  add column if not exists variant_revision integer not null default 1;

update public.practice_bank_version_questions membership
set variant_revision = variant.content_revision
from public.practice_variants variant
where membership.variant_id = variant.id
  and membership.variant_revision = 1;

create table if not exists public.practice_course_concept_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_code text not null references public.practice_course_catalog(course_code) on delete cascade,
  concept_id text not null,
  attempts integer not null default 0 check (attempts >= 0),
  correct_count integer not null default 0 check (correct_count >= 0),
  status text not null default 'unseen'
    check (status in ('unseen', 'learning', 'reviewing', 'mastered')),
  active_echoes integer not null default 0 check (active_echoes >= 0),
  last_miss_at timestamptz,
  last_mastered_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, course_code, concept_id)
);

insert into public.practice_course_catalog (
  course_code,
  slug,
  academic_year,
  term,
  status,
  description,
  sort_order
)
values (
  'REHE 151',
  'd1-fall-rehe-151-dental-anatomy',
  'D1',
  'Fall',
  'review',
  'Dental Anatomy course engine reference implementation.',
  5
)
on conflict (course_code) do update
set slug = excluded.slug,
    academic_year = excluded.academic_year,
    term = excluded.term,
    description = excluded.description,
    updated_at = now();

update public.practice_banks
set course_slug = 'd1-fall-rehe-151-dental-anatomy',
    bank_kind = case
      when id = 'living-atlas-dental-anatomy-lecture-1' then 'practice_problem'
      else bank_kind
    end,
    provenance = case
      when id = 'living-atlas-dental-anatomy-lecture-1' then 'source_derived'
      else provenance
    end
where course_code = 'REHE 151';

insert into public.practice_taxonomy_nodes (
  course_code,
  node_id,
  parent_node_id,
  node_type,
  label,
  objective_text,
  sort_order
)
values
  ('REHE 151', 'lecture-1', null, 'unit', 'Lecture 1', null, 1),
  ('REHE 151', 'foundations', 'lecture-1', 'domain', 'Foundations', null, 1),
  ('REHE 151', 'dental-orientation', 'lecture-1', 'domain', 'Dental Orientation', null, 2),
  ('REHE 151', 'tooth-structure', 'lecture-1', 'domain', 'Tooth Structure', null, 3),
  ('REHE 151', 'foundations-topic', 'foundations', 'topic', 'Foundations', null, 1),
  ('REHE 151', 'dentition', 'foundations', 'topic', 'Dentition', null, 2),
  ('REHE 151', 'universal-numbering', 'dental-orientation', 'topic', 'Universal Numbering', null, 1),
  ('REHE 151', 'arch-navigation', 'dental-orientation', 'topic', 'Arch Navigation', null, 2),
  ('REHE 151', 'tooth-surfaces', 'dental-orientation', 'topic', 'Tooth Surfaces', null, 3),
  ('REHE 151', 'tooth-landmarks', 'tooth-structure', 'topic', 'Tooth Landmarks', null, 1),
  ('REHE 151', 'tooth-tissues', 'tooth-structure', 'topic', 'Tooth Tissues', null, 2),
  ('REHE 151', 'pulp-anatomy', 'tooth-structure', 'topic', 'Pulp Anatomy', null, 3)
on conflict (course_code, node_id) do update
set parent_node_id = excluded.parent_node_id,
    node_type = excluded.node_type,
    label = excluded.label,
    objective_text = excluded.objective_text,
    sort_order = excluded.sort_order,
    updated_at = now();

create or replace function private.enforce_practice_session_context()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  if new.bank_version_id is not null and not exists (
    select 1
    from public.practice_bank_versions version
    where version.id = new.bank_version_id
      and version.bank_id = new.bank_id
  ) then
    raise exception 'practice_session_bank_version_mismatch';
  end if;
  return new;
end;
$$;

drop trigger if exists practice_session_context_guard on public.practice_sessions;
create trigger practice_session_context_guard
before insert or update of bank_id, bank_version_id on public.practice_sessions
for each row execute function private.enforce_practice_session_context();

create or replace function private.enforce_practice_bank_membership_integrity()
returns trigger
language plpgsql
set search_path = public, private
as $$
declare
  v_bank_version_id text := coalesce(new.bank_version_id, old.bank_version_id);
  v_status text;
  v_variant_id text := coalesce(new.variant_id, old.variant_id);
  v_revision integer := coalesce(new.variant_revision, old.variant_revision);
begin
  select status into v_status
  from public.practice_bank_versions
  where id = v_bank_version_id
  for update;

  if v_status is null then
    raise exception 'practice_bank_version_missing';
  end if;

  if v_status in ('approved', 'retired') then
    raise exception 'practice_bank_version_is_immutable';
  end if;

  if tg_op <> 'DELETE' and not exists (
    select 1
    from private.practice_variant_revisions revision
    where revision.variant_id = v_variant_id
      and revision.revision = v_revision
  ) then
    raise exception 'practice_bank_membership_requires_frozen_variant_revision';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists practice_bank_membership_integrity_guard on public.practice_bank_version_questions;
create trigger practice_bank_membership_integrity_guard
before insert or update or delete on public.practice_bank_version_questions
for each row execute function private.enforce_practice_bank_membership_integrity();

create or replace function private.enforce_practice_session_item_membership()
returns trigger
language plpgsql
set search_path = public, private
as $$
declare
  v_bank_version_id text;
begin
  select bank_version_id into v_bank_version_id
  from public.practice_sessions
  where id = new.session_id;

  if v_bank_version_id is not null and not exists (
    select 1
    from public.practice_bank_version_questions membership
    where membership.bank_version_id = v_bank_version_id
      and membership.variant_id = new.variant_id
      and membership.variant_revision = new.variant_revision
  ) then
    raise exception 'practice_session_item_not_in_frozen_bank_version';
  end if;
  return new;
end;
$$;

drop trigger if exists practice_session_item_membership_guard on public.practice_session_items;
create trigger practice_session_item_membership_guard
before insert or update of variant_id, variant_revision on public.practice_session_items
for each row execute function private.enforce_practice_session_item_membership();

create or replace function private.enforce_practice_bank_version_immutability()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  if old.status in ('approved', 'retired') and (
    new.bank_id is distinct from old.bank_id
    or new.version is distinct from old.version
    or new.source_version is distinct from old.source_version
    or new.item_count is distinct from old.item_count
    or new.content_sha256 is distinct from old.content_sha256
    or new.approved_at is distinct from old.approved_at
    or new.approved_by is distinct from old.approved_by
    or (old.status = 'retired' and new.status is distinct from old.status)
    or (old.status = 'approved' and new.status not in ('approved', 'retired'))
  ) then
    raise exception 'practice_bank_version_is_immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists practice_bank_version_immutability_guard on public.practice_bank_versions;
create trigger practice_bank_version_immutability_guard
before update on public.practice_bank_versions
for each row execute function private.enforce_practice_bank_version_immutability();

alter table public.practice_course_catalog enable row level security;
alter table public.practice_taxonomy_nodes enable row level security;
alter table public.practice_bank_sources enable row level security;
alter table public.practice_media_assets enable row level security;
alter table public.practice_variant_media enable row level security;
alter table public.practice_course_concept_progress enable row level security;

revoke all on public.practice_course_catalog from anon, authenticated;
revoke all on public.practice_taxonomy_nodes from anon, authenticated;
revoke all on public.practice_bank_sources from anon, authenticated;
revoke all on public.practice_media_assets from anon, authenticated;
revoke all on public.practice_variant_media from anon, authenticated;
revoke all on public.practice_course_concept_progress from anon, authenticated;

create policy "founder owns course concept progress" on public.practice_course_concept_progress
for all to authenticated
using (((select auth.uid()) = user_id) and (select private.is_owner()))
with check (((select auth.uid()) = user_id) and (select private.is_owner()));

grant select, insert, update on public.practice_course_concept_progress to authenticated;

create index if not exists practice_course_catalog_status_idx
  on public.practice_course_catalog (status, sort_order, course_code);
create index if not exists practice_taxonomy_nodes_course_parent_idx
  on public.practice_taxonomy_nodes (course_code, parent_node_id, sort_order, node_id);
create index if not exists practice_bank_sources_source_idx
  on public.practice_bank_sources (source_id, source_role, bank_id);
create index if not exists practice_variant_media_variant_placement_idx
  on public.practice_variant_media (variant_id, placement, display_order);
create index if not exists practice_course_concept_progress_owner_course_status_idx
  on public.practice_course_concept_progress (user_id, course_code, status);
