-- Server-only metadata for privately cached practice images. The files remain
-- in a private Storage bucket and are delivered only by short-lived signed URL.
create table if not exists public.practice_source_media (
  id text primary key,
  source_card_id text not null unique,
  variant_id text not null unique references public.practice_variants(id) on delete cascade,
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

alter table public.practice_source_media enable row level security;
revoke all on public.practice_source_media from anon, authenticated;

insert into public.practice_source_media (
  id, source_card_id, variant_id, source_url, storage_bucket, storage_path,
  sha256, mime_type, byte_size, cache_status, cache_error, created_at, updated_at
)
select
  media.id,
  media.source_card_id,
  'la-omar-da-l1-' || right(media.source_card_id, 3),
  media.source_url,
  media.storage_bucket,
  media.storage_path,
  media.sha256,
  media.mime_type,
  media.byte_size,
  media.cache_status,
  media.cache_error,
  media.created_at,
  media.updated_at
from private.living_atlas_source_media media
on conflict (id) do update set
  source_card_id = excluded.source_card_id,
  variant_id = excluded.variant_id,
  source_url = excluded.source_url,
  storage_bucket = excluded.storage_bucket,
  storage_path = excluded.storage_path,
  sha256 = excluded.sha256,
  mime_type = excluded.mime_type,
  byte_size = excluded.byte_size,
  cache_status = excluded.cache_status,
  cache_error = excluded.cache_error,
  updated_at = excluded.updated_at;

create index if not exists practice_source_media_cache_idx
  on public.practice_source_media (cache_status, variant_id);
