-- Index foreign-key columns used by the Living Atlas canonical practice runtime.
-- Keep the pre-existing response uniqueness constraint as the canonical index.

drop index if exists public.practice_responses_session_variant_uidx;

create index if not exists practice_bank_version_questions_variant_idx
  on public.practice_bank_version_questions (variant_id);

create index if not exists practice_bank_versions_approved_by_idx
  on public.practice_bank_versions (approved_by)
  where approved_by is not null;

create index if not exists practice_concept_progress_bank_version_idx
  on public.practice_concept_progress (bank_version_id);

create index if not exists practice_flags_variant_idx
  on public.practice_flags (variant_id);

create index if not exists practice_saved_sets_bank_idx
  on public.practice_saved_sets (bank_id);

create index if not exists practice_session_items_variant_idx
  on public.practice_session_items (variant_id);

create index if not exists practice_sessions_bank_version_idx
  on public.practice_sessions (bank_version_id)
  where bank_version_id is not null;
