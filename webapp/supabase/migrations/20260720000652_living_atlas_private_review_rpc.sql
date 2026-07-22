-- The private schema is intentionally not exposed through PostgREST. These
-- server-role-only RPCs provide the narrow bridge the web runtime needs for
-- frozen session snapshots and founder audit history without exposing answer
-- keys or revision snapshots to browser clients.

create or replace function public.living_atlas_get_variant_revisions(p_variant_ids text[])
returns table (
  variant_id text,
  revision integer,
  review_status text,
  snapshot jsonb
)
language sql
security definer
set search_path = public, private
as $$
  select revision.variant_id, revision.revision, revision.review_status, revision.snapshot
  from private.practice_variant_revisions revision
  where revision.variant_id = any(p_variant_ids);
$$;

create or replace function public.living_atlas_get_variant_review_events(p_variant_ids text[])
returns table (
  id uuid,
  variant_id text,
  revision integer,
  action text,
  note text,
  created_at timestamptz
)
language sql
security definer
set search_path = public, private
as $$
  select event.id, event.variant_id, event.revision, event.action, event.note, event.created_at
  from private.practice_variant_review_events event
  where event.variant_id = any(p_variant_ids)
  order by event.created_at desc;
$$;

create or replace function public.living_atlas_save_founder_variant_review(
  p_variant_id text,
  p_expected_revision integer,
  p_review_status text,
  p_action text,
  p_snapshot jsonb,
  p_note text,
  p_user_id uuid,
  p_stem text,
  p_choices jsonb,
  p_correct_choice text,
  p_teaching_feedback text,
  p_choice_feedback jsonb,
  p_difficulty text,
  p_academic_year text,
  p_term text,
  p_course_code text,
  p_course_title text,
  p_unit text,
  p_domain text,
  p_topic text,
  p_concept_id text,
  p_objective text,
  p_item_format text,
  p_stem_type text,
  p_cognitive_level text,
  p_image_placement text,
  p_bank_version_id text
)
returns integer
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_revision integer;
begin
  update public.practice_variants
  set
    stem = p_stem,
    choices = p_choices,
    correct_choice = p_correct_choice,
    teaching_feedback = p_teaching_feedback,
    choice_feedback = p_choice_feedback,
    difficulty = p_difficulty,
    academic_year = p_academic_year,
    term = p_term,
    course_code = p_course_code,
    course_title = p_course_title,
    set_title = p_unit,
    category_l1 = p_domain,
    category_l2 = p_topic,
    category_l3 = p_concept_id,
    learning_objective = p_objective,
    item_format = p_item_format,
    stem_type = p_stem_type,
    cognitive_level = p_cognitive_level,
    assessment_image_placement = p_image_placement,
    review_status = p_review_status,
    review_note = p_note,
    reviewed_at = now(),
    reviewed_by = p_user_id,
    content_revision = content_revision + 1,
    updated_at = now()
  where id = p_variant_id
    and content_revision = p_expected_revision
  returning content_revision into v_revision;

  if not found then
    raise exception 'living_atlas_variant_revision_conflict';
  end if;

  insert into private.practice_variant_revisions (
    variant_id, revision, review_status, action, snapshot, note, created_by
  ) values (
    p_variant_id, v_revision, p_review_status, p_action, p_snapshot, p_note, p_user_id
  );

  insert into private.practice_variant_review_events (
    variant_id, revision, action, note, created_by
  ) values (
    p_variant_id, v_revision, p_action, p_note, p_user_id
  );

  update public.practice_bank_versions
  set
    status = case when p_action = 'changes_requested' then 'changes_requested' else 'review_required' end,
    approved_at = null,
    approved_by = null,
    updated_at = now()
  where id = p_bank_version_id;

  return v_revision;
end;
$$;

revoke all on function public.living_atlas_get_variant_revisions(text[]) from public, anon, authenticated;
revoke all on function public.living_atlas_get_variant_review_events(text[]) from public, anon, authenticated;
revoke all on function public.living_atlas_save_founder_variant_review(
  text, integer, text, text, jsonb, text, uuid, text, jsonb, text, text, jsonb,
  text, text, text, text, text, text, text, text, text, text, text, text, text,
  text, text
) from public, anon, authenticated;

grant execute on function public.living_atlas_get_variant_revisions(text[]) to service_role;
grant execute on function public.living_atlas_get_variant_review_events(text[]) to service_role;
grant execute on function public.living_atlas_save_founder_variant_review(
  text, integer, text, text, jsonb, text, uuid, text, jsonb, text, text, jsonb,
  text, text, text, text, text, text, text, text, text, text, text, text, text,
  text, text
) to service_role;
