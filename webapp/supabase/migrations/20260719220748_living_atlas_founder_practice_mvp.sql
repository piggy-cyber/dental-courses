-- Living Atlas founder-only practice builder.
--
-- Authoritative source content, candidate bank versions, answer keys, and
-- original media stay in private tables. Browser-accessible tables contain
-- only player-owned practice state; server actions adjudicate answers.

create table if not exists private.living_atlas_source_sets (
  id text primary key,
  provider text not null,
  edition text not null check (edition in ('omar', 'founder', 'other')),
  author text not null,
  folder text not null,
  title text not null,
  external_id text not null,
  source_url text not null check (source_url ~ '^https://'),
  captured_at timestamptz not null,
  source_card_count integer not null check (source_card_count >= 0),
  source_sha256 text not null,
  rights_status text not null check (rights_status in ('private_review', 'approved', 'restricted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists private.living_atlas_source_cards (
  id text primary key,
  source_set_id text not null references private.living_atlas_source_sets(id) on delete cascade,
  source_order integer not null check (source_order > 0),
  original_question text not null,
  original_answer text not null,
  source_image_url text,
  image_placement text check (image_placement is null or image_placement in ('prompt', 'answer')),
  source_sha256 text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_set_id, source_order)
);

create table if not exists private.living_atlas_source_media (
  id text primary key,
  source_card_id text not null references private.living_atlas_source_cards(id) on delete cascade,
  source_url text not null check (source_url ~ '^https://'),
  storage_bucket text not null default 'living-atlas-review-assets',
  storage_path text unique,
  sha256 text,
  mime_type text,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  cache_status text not null default 'pending' check (cache_status in ('pending', 'cached', 'failed')),
  cache_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists private.living_atlas_bank_versions (
  id text primary key,
  source_set_id text not null references private.living_atlas_source_sets(id) on delete restrict,
  version integer not null check (version > 0),
  status text not null check (status in ('draft', 'review_required', 'changes_requested', 'approved', 'rejected', 'retired')),
  source_card_count integer not null check (source_card_count >= 0),
  item_count integer not null check (item_count >= 0),
  candidate_sha256 text not null,
  review_packet_path text not null,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_set_id, version)
);

create table if not exists private.living_atlas_bank_items (
  id text primary key,
  bank_version_id text not null references private.living_atlas_bank_versions(id) on delete cascade,
  source_card_id text not null references private.living_atlas_source_cards(id) on delete restrict,
  topic text not null,
  concept_id text not null,
  difficulty text not null check (difficulty in ('foundational', 'application', 'advanced')),
  stem text not null,
  teaching_feedback text not null,
  assessment_image_placement text not null check (assessment_image_placement in ('prompt', 'feedback', 'none')),
  review_status text not null check (review_status in ('draft', 'review_required', 'changes_requested', 'approved', 'rejected', 'stale')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bank_version_id, source_card_id)
);

create table if not exists private.living_atlas_bank_choices (
  item_id text not null references private.living_atlas_bank_items(id) on delete cascade,
  choice_id text not null check (choice_id in ('a', 'b', 'c', 'd')),
  choice_text text not null,
  feedback text not null,
  primary key (item_id, choice_id)
);

create table if not exists private.living_atlas_answer_keys (
  item_id text primary key references private.living_atlas_bank_items(id) on delete cascade,
  correct_choice_id text not null check (correct_choice_id in ('a', 'b', 'c', 'd')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table private.living_atlas_source_sets enable row level security;
alter table private.living_atlas_source_cards enable row level security;
alter table private.living_atlas_source_media enable row level security;
alter table private.living_atlas_bank_versions enable row level security;
alter table private.living_atlas_bank_items enable row level security;
alter table private.living_atlas_bank_choices enable row level security;
alter table private.living_atlas_answer_keys enable row level security;

revoke all on private.living_atlas_source_sets from anon, authenticated;
revoke all on private.living_atlas_source_cards from anon, authenticated;
revoke all on private.living_atlas_source_media from anon, authenticated;
revoke all on private.living_atlas_bank_versions from anon, authenticated;
revoke all on private.living_atlas_bank_items from anon, authenticated;
revoke all on private.living_atlas_bank_choices from anon, authenticated;
revoke all on private.living_atlas_answer_keys from anon, authenticated;

insert into storage.buckets (id, name, public)
values ('living-atlas-review-assets', 'living-atlas-review-assets', false)
on conflict (id) do update set public = false;

create table if not exists public.living_atlas_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bank_version_id text not null,
  mode text not null check (mode in ('study', 'mock')),
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  filters jsonb not null default '{}'::jsonb check (jsonb_typeof(filters) = 'object'),
  question_count integer not null check (question_count between 1 and 100),
  current_position integer not null default 1 check (current_position > 0),
  answered_count integer not null default 0 check (answered_count >= 0),
  correct_count integer not null default 0 check (correct_count >= 0 and correct_count <= answered_count),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.living_atlas_run_items (
  run_id uuid not null references public.living_atlas_runs(id) on delete cascade,
  position integer not null check (position > 0),
  question_id text not null,
  choice_order jsonb not null check (jsonb_typeof(choice_order) = 'array'),
  created_at timestamptz not null default now(),
  primary key (run_id, position),
  unique (run_id, question_id)
);

create table if not exists public.living_atlas_attempts (
  id bigint generated always as identity primary key,
  run_id uuid not null references public.living_atlas_runs(id) on delete cascade,
  position integer not null check (position > 0),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  selected_choice_id text not null check (selected_choice_id in ('a', 'b', 'c', 'd')),
  is_correct boolean not null,
  confidence smallint not null check (confidence between 1 and 3),
  answered_at timestamptz not null default now(),
  unique (run_id, position)
);

create table if not exists public.living_atlas_question_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  attempts integer not null default 0 check (attempts >= 0),
  correct_count integer not null default 0 check (correct_count >= 0),
  incorrect_count integer not null default 0 check (incorrect_count >= 0),
  consecutive_correct integer not null default 0 check (consecutive_correct >= 0),
  last_confidence smallint check (last_confidence between 1 and 3),
  manually_flagged boolean not null default false,
  needs_repair boolean not null default false,
  last_answered_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create table if not exists public.living_atlas_concept_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  concept_id text not null,
  attempts integer not null default 0 check (attempts >= 0),
  correct_count integer not null default 0 check (correct_count >= 0),
  status text not null default 'new' check (status in ('new', 'learning', 'mastered', 'needs_repair')),
  active_echoes integer not null default 0 check (active_echoes >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, concept_id)
);

create table if not exists public.living_atlas_saved_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  config jsonb not null check (jsonb_typeof(config) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists living_atlas_runs_owner_status_idx on public.living_atlas_runs (user_id, status, updated_at desc);
create index if not exists living_atlas_attempts_owner_question_idx on public.living_atlas_attempts (user_id, question_id, answered_at desc);
create index if not exists living_atlas_question_state_owner_repair_idx on public.living_atlas_question_state (user_id, needs_repair, manually_flagged);
create index if not exists living_atlas_source_cards_set_idx on private.living_atlas_source_cards (source_set_id, source_order);
create index if not exists living_atlas_source_media_card_idx on private.living_atlas_source_media (source_card_id);
create index if not exists living_atlas_bank_items_version_topic_idx on private.living_atlas_bank_items (bank_version_id, topic, concept_id);

alter table public.living_atlas_runs enable row level security;
alter table public.living_atlas_run_items enable row level security;
alter table public.living_atlas_attempts enable row level security;
alter table public.living_atlas_question_state enable row level security;
alter table public.living_atlas_concept_progress enable row level security;
alter table public.living_atlas_saved_sets enable row level security;

create policy "founder owns living atlas runs" on public.living_atlas_runs
for all to authenticated
using (((select auth.uid()) = user_id) and (select private.is_owner()))
with check (((select auth.uid()) = user_id) and (select private.is_owner()));

create policy "founder owns living atlas run items" on public.living_atlas_run_items
for select to authenticated
using (
  (select private.is_owner())
  and exists (
    select 1 from public.living_atlas_runs
    where living_atlas_runs.id = living_atlas_run_items.run_id
      and living_atlas_runs.user_id = (select auth.uid())
  )
);

create policy "founder owns living atlas attempts" on public.living_atlas_attempts
for all to authenticated
using (((select auth.uid()) = user_id) and (select private.is_owner()))
with check (((select auth.uid()) = user_id) and (select private.is_owner()));

create policy "founder owns living atlas question state" on public.living_atlas_question_state
for all to authenticated
using (((select auth.uid()) = user_id) and (select private.is_owner()))
with check (((select auth.uid()) = user_id) and (select private.is_owner()));

create policy "founder owns living atlas concept progress" on public.living_atlas_concept_progress
for all to authenticated
using (((select auth.uid()) = user_id) and (select private.is_owner()))
with check (((select auth.uid()) = user_id) and (select private.is_owner()));

create policy "founder owns living atlas saved sets" on public.living_atlas_saved_sets
for all to authenticated
using (((select auth.uid()) = user_id) and (select private.is_owner()))
with check (((select auth.uid()) = user_id) and (select private.is_owner()));
