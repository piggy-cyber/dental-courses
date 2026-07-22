-- A Quizlet external ID identifies a remote deck, not one immutable capture.
-- Keep historical captures alongside the approved D2 source edition rather than
-- overwriting an earlier card set when the same deck has changed.

alter table public.practice_sources
  drop constraint if exists practice_sources_platform_external_id_key;

create index if not exists practice_sources_platform_external_id_idx
  on public.practice_sources (platform, external_id);
