-- Multiple source cards may intentionally reference the same deduplicated
-- file hash. Metadata rows remain unique by source card and variant.
alter table public.practice_source_media
  drop constraint if exists practice_source_media_storage_path_key;

create index if not exists practice_source_media_storage_path_idx
  on public.practice_source_media (storage_path)
  where storage_path is not null;
