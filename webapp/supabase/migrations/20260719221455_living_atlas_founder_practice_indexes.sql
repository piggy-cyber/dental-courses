-- Cover the foreign keys introduced by the founder-practice schema and the
-- owner-ordered saved-set query used by the practice builder.

create index if not exists living_atlas_bank_items_source_card_idx
  on private.living_atlas_bank_items (source_card_id);

create index if not exists living_atlas_bank_versions_approved_by_idx
  on private.living_atlas_bank_versions (approved_by);

create index if not exists living_atlas_saved_sets_owner_created_idx
  on public.living_atlas_saved_sets (user_id, created_at desc);
