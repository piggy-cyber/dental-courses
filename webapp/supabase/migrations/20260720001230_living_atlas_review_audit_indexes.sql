-- Founder review queries are by question and by reviewer. These indexes cover
-- the foreign keys surfaced by the database performance advisor without
-- changing learner-facing data or access policy.

create index if not exists practice_variant_revisions_created_by_idx
  on private.practice_variant_revisions (created_by);

create index if not exists practice_variant_review_events_created_by_idx
  on private.practice_variant_review_events (created_by);

create index if not exists practice_variants_reviewed_by_idx
  on public.practice_variants (reviewed_by);
