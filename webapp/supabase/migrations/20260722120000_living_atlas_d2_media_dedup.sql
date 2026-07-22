-- One cached file may be referenced by several captured cards. Insert one
-- media-asset record per hash, then attach that record to every source card.

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
    select * from jsonb_to_recordset(p_media) as media(
      source_id text, source_order integer, source_url text, storage_bucket text,
      storage_path text, sha256 text, mime_type text, byte_size bigint,
      cache_status text, cache_error text
    )
  ), validated as (
    select * from source_media
    where source_id is not null and source_order > 0 and source_url is not null
      and storage_bucket is not null and sha256 ~ '^[a-f0-9]{64}$'
      and cache_status in ('cached', 'failed')
      and (cache_status <> 'cached' or (storage_path is not null and mime_type like 'image/%' and byte_size > 0))
  ), unique_assets as (
    select distinct on (sha256) * from validated order by sha256, source_id, source_order
  )
  insert into public.practice_media_assets (
    id, storage_bucket, storage_path, source_url, sha256, mime_type,
    byte_size, cache_status, cache_error, rights_note, updated_at
  )
  select
    'media:' || sha256, storage_bucket, storage_path, source_url, sha256,
    mime_type, byte_size, cache_status, cache_error,
    'Private founder-authorized Omar source image. Preserve provenance; do not hotlink.', now()
  from unique_assets
  on conflict (id) do update set
    storage_bucket = case when practice_media_assets.cache_status = 'cached' then practice_media_assets.storage_bucket else excluded.storage_bucket end,
    storage_path = case when practice_media_assets.cache_status = 'cached' then practice_media_assets.storage_path else excluded.storage_path end,
    mime_type = case when practice_media_assets.cache_status = 'cached' then practice_media_assets.mime_type else excluded.mime_type end,
    byte_size = case when practice_media_assets.cache_status = 'cached' then practice_media_assets.byte_size else excluded.byte_size end,
    cache_status = case when practice_media_assets.cache_status = 'cached' then practice_media_assets.cache_status else excluded.cache_status end,
    cache_error = case when practice_media_assets.cache_status = 'cached' then practice_media_assets.cache_error else excluded.cache_error end,
    updated_at = now();

  with source_media as (
    select * from jsonb_to_recordset(p_media) as media(
      source_id text, source_order integer, source_url text, storage_bucket text,
      storage_path text, sha256 text, mime_type text, byte_size bigint,
      cache_status text, cache_error text
    )
  ), validated as (
    select * from source_media
    where source_id is not null and source_order > 0 and source_url is not null
      and sha256 ~ '^[a-f0-9]{64}$' and cache_status in ('cached', 'failed')
  )
  update public.practice_questions question
  set image_storage_path = case when media.cache_status = 'cached' then coalesce(asset.storage_path, media.storage_path) else null end,
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
