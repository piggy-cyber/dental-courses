-- Living Atlas founder practice runtime on the canonical shared practice tables.
--
-- Raw sources, generated variants, answer keys, feedback, and draft bank
-- membership are server-only. Browser roles receive only founder-owned run
-- state through RLS. This migration is additive and preserves the earlier
-- living_atlas_* review tables until migration parity has been verified.

create table if not exists public.practice_bank_versions (
  id text primary key,
  bank_id text not null references public.practice_banks(id) on delete cascade,
  version integer not null check (version > 0),
  status text not null check (status in ('draft', 'review_required', 'changes_requested', 'approved', 'rejected', 'retired')),
  source_version text not null,
  item_count integer not null default 0 check (item_count >= 0),
  content_sha256 text,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bank_id, version)
);

alter table public.practice_variants
  add column if not exists bank_version_id text references public.practice_bank_versions(id) on delete restrict,
  add column if not exists academic_year text,
  add column if not exists term text,
  add column if not exists course_code text,
  add column if not exists course_title text,
  add column if not exists set_title text,
  add column if not exists category_l1 text,
  add column if not exists category_l2 text,
  add column if not exists category_l3 text,
  add column if not exists learning_objective text,
  add column if not exists item_format text,
  add column if not exists stem_type text,
  add column if not exists cognitive_level text,
  add column if not exists assessment_image_placement text,
  add column if not exists review_status text,
  add column if not exists source_version text,
  add column if not exists bank_version integer;

create table if not exists public.practice_bank_version_questions (
  bank_version_id text not null references public.practice_bank_versions(id) on delete cascade,
  variant_id text not null references public.practice_variants(id) on delete restrict,
  position integer not null check (position > 0),
  created_at timestamptz not null default now(),
  primary key (bank_version_id, variant_id),
  unique (bank_version_id, position)
);

alter table public.practice_sessions
  add column if not exists bank_version_id text references public.practice_bank_versions(id) on delete restrict,
  add column if not exists filters jsonb not null default '{}'::jsonb,
  add column if not exists question_count integer not null default 0,
  add column if not exists visible_timer boolean not null default false,
  add column if not exists active_time_ms bigint not null default 0,
  add column if not exists paused_at timestamptz;

create table if not exists public.practice_session_items (
  session_id uuid not null references public.practice_sessions(id) on delete cascade,
  position integer not null check (position > 0),
  variant_id text not null references public.practice_variants(id) on delete restrict,
  choice_order jsonb not null check (jsonb_typeof(choice_order) = 'array'),
  selected_choice text check (selected_choice is null or selected_choice in ('a', 'b', 'c', 'd')),
  confidence smallint check (confidence is null or confidence between 1 and 3),
  active_time_ms bigint not null default 0 check (active_time_ms >= 0),
  committed_at timestamptz,
  finalized boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (session_id, position),
  unique (session_id, variant_id)
);

alter table public.practice_question_state
  add column if not exists manually_flagged boolean not null default false,
  add column if not exists active_echo boolean not null default false,
  add column if not exists knowledge_state text not null default 'unseen',
  add column if not exists total_active_time_ms bigint not null default 0,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.practice_concept_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  bank_version_id text not null references public.practice_bank_versions(id) on delete cascade,
  concept_id text not null,
  attempts integer not null default 0 check (attempts >= 0),
  correct_count integer not null default 0 check (correct_count >= 0),
  status text not null default 'unseen' check (status in ('unseen', 'learning', 'reviewing', 'mastered')),
  active_echoes integer not null default 0 check (active_echoes >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, bank_version_id, concept_id)
);

create table if not exists public.practice_flags (
  user_id uuid not null references auth.users(id) on delete cascade,
  variant_id text not null references public.practice_variants(id) on delete cascade,
  flagged boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, variant_id)
);

create table if not exists public.practice_saved_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bank_id text not null references public.practice_banks(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  config jsonb not null check (jsonb_typeof(config) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'practice_variants_academic_year_check') then
    alter table public.practice_variants add constraint practice_variants_academic_year_check
      check (academic_year is null or academic_year in ('D1', 'D2', 'D3', 'D4'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'practice_variants_term_check') then
    alter table public.practice_variants add constraint practice_variants_term_check
      check (term is null or term in ('Summer', 'Fall', 'Spring', 'Multiple'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'practice_variants_item_format_check') then
    alter table public.practice_variants add constraint practice_variants_item_format_check
      check (item_format is null or item_format in ('single_best_answer', 'multiple_response', 'true_false', 'image_identification'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'practice_variants_stem_type_check') then
    alter table public.practice_variants add constraint practice_variants_stem_type_check
      check (stem_type is null or stem_type in ('standard', 'cloze'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'practice_variants_cognitive_level_check') then
    alter table public.practice_variants add constraint practice_variants_cognitive_level_check
      check (cognitive_level is null or cognitive_level in ('recall', 'understanding', 'application', 'analysis'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'practice_variants_assessment_image_placement_check') then
    alter table public.practice_variants add constraint practice_variants_assessment_image_placement_check
      check (assessment_image_placement is null or assessment_image_placement in ('pre_commit', 'post_commit', 'review_only', 'none'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'practice_variants_review_status_check') then
    alter table public.practice_variants add constraint practice_variants_review_status_check
      check (review_status is null or review_status in ('source_only', 'generated', 'review_required', 'changes_requested', 'approved', 'rejected', 'stale'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'practice_question_state_knowledge_state_check') then
    alter table public.practice_question_state add constraint practice_question_state_knowledge_state_check
      check (knowledge_state in ('unseen', 'learning', 'reviewing', 'mastered'));
  end if;
end $$;

create index if not exists practice_bank_versions_bank_status_idx
  on public.practice_bank_versions (bank_id, status, version desc);
create index if not exists practice_variants_version_taxonomy_idx
  on public.practice_variants (bank_version_id, category_l1, category_l2, category_l3);
create index if not exists practice_sessions_owner_status_idx
  on public.practice_sessions (user_id, status, updated_at desc);
create index if not exists practice_session_items_session_status_idx
  on public.practice_session_items (session_id, finalized, position);
create index if not exists practice_responses_owner_variant_time_idx
  on public.practice_responses (user_id, variant_id, answered_at desc);
create unique index if not exists practice_responses_session_variant_uidx
  on public.practice_responses (session_id, variant_id);
create index if not exists practice_question_state_owner_state_idx
  on public.practice_question_state (user_id, knowledge_state, active_echo, manually_flagged);
create index if not exists practice_concept_progress_owner_status_idx
  on public.practice_concept_progress (user_id, bank_version_id, status);
create index if not exists practice_flags_owner_flagged_idx
  on public.practice_flags (user_id, flagged, updated_at desc);
create index if not exists practice_saved_sets_owner_bank_idx
  on public.practice_saved_sets (user_id, bank_id, updated_at desc);

-- Content remains server-only. Existing policies exposed original answers and
-- variant keys to every approved account, so remove both policy and grant.
drop policy if exists "approved read practice sources" on public.practice_sources;
drop policy if exists "approved read practice questions" on public.practice_questions;
drop policy if exists "approved read practice variants" on public.practice_variants;
drop policy if exists "approved read practice banks" on public.practice_banks;
drop policy if exists "approved read practice bank questions" on public.practice_bank_questions;

revoke all on public.practice_sources from anon, authenticated;
revoke all on public.practice_questions from anon, authenticated;
revoke all on public.practice_variants from anon, authenticated;
revoke all on public.practice_banks from anon, authenticated;
revoke all on public.practice_bank_questions from anon, authenticated;
revoke all on public.practice_bank_versions from anon, authenticated;
revoke all on public.practice_bank_version_questions from anon, authenticated;

alter table public.practice_bank_versions enable row level security;
alter table public.practice_bank_version_questions enable row level security;
alter table public.practice_session_items enable row level security;
alter table public.practice_concept_progress enable row level security;
alter table public.practice_flags enable row level security;
alter table public.practice_saved_sets enable row level security;

-- Tighten the pre-existing progress tables from approved-account access to the
-- founder-only draft boundary. Server actions independently repeat this check.
drop policy if exists "users create own practice sessions" on public.practice_sessions;
drop policy if exists "users read own practice sessions" on public.practice_sessions;
drop policy if exists "users update own practice sessions" on public.practice_sessions;
drop policy if exists "users create own practice responses" on public.practice_responses;
drop policy if exists "users read own practice responses" on public.practice_responses;
drop policy if exists "users create own practice state" on public.practice_question_state;
drop policy if exists "users read own practice state" on public.practice_question_state;
drop policy if exists "users update own practice state" on public.practice_question_state;

create policy "founder owns practice sessions" on public.practice_sessions
for all to authenticated
using (((select auth.uid()) = user_id) and (select private.is_owner()))
with check (((select auth.uid()) = user_id) and (select private.is_owner()));

create policy "founder owns practice responses" on public.practice_responses
for all to authenticated
using (((select auth.uid()) = user_id) and (select private.is_owner()))
with check (((select auth.uid()) = user_id) and (select private.is_owner()));

create policy "founder owns practice question state" on public.practice_question_state
for all to authenticated
using (((select auth.uid()) = user_id) and (select private.is_owner()))
with check (((select auth.uid()) = user_id) and (select private.is_owner()));

create policy "founder owns practice session items" on public.practice_session_items
for all to authenticated
using (
  (select private.is_owner()) and exists (
    select 1 from public.practice_sessions
    where practice_sessions.id = practice_session_items.session_id
      and practice_sessions.user_id = (select auth.uid())
  )
)
with check (
  (select private.is_owner()) and exists (
    select 1 from public.practice_sessions
    where practice_sessions.id = practice_session_items.session_id
      and practice_sessions.user_id = (select auth.uid())
  )
);

create policy "founder owns practice concept progress" on public.practice_concept_progress
for all to authenticated
using (((select auth.uid()) = user_id) and (select private.is_owner()))
with check (((select auth.uid()) = user_id) and (select private.is_owner()));

create policy "founder owns practice flags" on public.practice_flags
for all to authenticated
using (((select auth.uid()) = user_id) and (select private.is_owner()))
with check (((select auth.uid()) = user_id) and (select private.is_owner()));

create policy "founder owns practice saved sets" on public.practice_saved_sets
for all to authenticated
using (((select auth.uid()) = user_id) and (select private.is_owner()))
with check (((select auth.uid()) = user_id) and (select private.is_owner()));

grant select, insert, update on public.practice_sessions to authenticated;
grant select, insert on public.practice_responses to authenticated;
grant select, insert, update on public.practice_question_state to authenticated;
grant select, insert, update on public.practice_session_items to authenticated;
grant select, insert, update on public.practice_concept_progress to authenticated;
grant select, insert, update on public.practice_flags to authenticated;
grant select, insert, update, delete on public.practice_saved_sets to authenticated;
