-- Transactional, restart-safe importer for founder-authorized source-derived
-- practice banks. The function is callable only with the server secret. It
-- never exposes source answers, answer keys, or revision snapshots to browser
-- roles.

create or replace function public.living_atlas_import_approved_source_bank(
  p_bank jsonb,
  p_items jsonb,
  p_approved_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_bank_id text := p_bank->>'bankId';
  v_bank_version_id text := p_bank->>'bankVersionId';
  v_source_id text := p_bank->>'sourceId';
  v_course_code text := p_bank->>'courseCode';
  v_course_slug text := p_bank->>'courseSlug';
  v_item_count integer := jsonb_array_length(p_items);
  v_expected_count integer := (p_bank->>'itemCount')::integer;
  v_content_sha256 text := p_bank->>'contentSha256';
  v_existing_status text;
  v_existing_sha256 text;
  v_item jsonb;
  v_variant_id text;
  v_question_id bigint;
  v_revision integer;
  v_snapshot jsonb;
begin
  if jsonb_typeof(p_bank) <> 'object' or jsonb_typeof(p_items) <> 'array' then
    raise exception 'living_atlas_import_payload_invalid';
  end if;
  if v_bank_id is null or v_bank_version_id is null or v_source_id is null
     or v_course_code is null or v_course_slug is null or v_content_sha256 is null then
    raise exception 'living_atlas_import_bank_metadata_incomplete';
  end if;
  if v_item_count < 1 or v_item_count > 1000 or v_item_count <> v_expected_count then
    raise exception 'living_atlas_import_item_count_mismatch';
  end if;
  if not exists (
    select 1 from public.practice_course_catalog course
    where course.course_code = v_course_code and course.slug = v_course_slug
  ) then
    raise exception 'living_atlas_import_course_missing';
  end if;
  if not exists (
    select 1 from public.practice_sources source
    where source.id = v_source_id and source.source_card_count = v_expected_count
  ) then
    raise exception 'living_atlas_import_source_mismatch';
  end if;

  select version.status, version.content_sha256
  into v_existing_status, v_existing_sha256
  from public.practice_bank_versions version
  where version.id = v_bank_version_id;

  if v_existing_status = 'approved' then
    if v_existing_sha256 = v_content_sha256 then
      return jsonb_build_object(
        'status', 'unchanged',
        'bankId', v_bank_id,
        'bankVersionId', v_bank_version_id,
        'itemCount', v_item_count
      );
    end if;
    raise exception 'living_atlas_import_approved_version_is_immutable';
  end if;

  insert into public.practice_banks (
    id, source_id, course_code, course_slug, title, description, default_mode,
    status, source_card_count, question_count, bank_kind, provenance,
    content_contract_version, updated_at
  ) values (
    v_bank_id,
    v_source_id,
    v_course_code,
    v_course_slug,
    p_bank->>'title',
    p_bank->>'description',
    'tutor',
    'review',
    v_expected_count,
    v_item_count,
    'practice_problem',
    'source_derived',
    'course-package-v1',
    now()
  )
  on conflict (id) do update set
    course_code = excluded.course_code,
    course_slug = excluded.course_slug,
    title = excluded.title,
    description = excluded.description,
    source_card_count = excluded.source_card_count,
    question_count = excluded.question_count,
    bank_kind = excluded.bank_kind,
    provenance = excluded.provenance,
    content_contract_version = excluded.content_contract_version,
    updated_at = now();

  insert into public.practice_bank_sources (bank_id, source_id, source_role)
  values (v_bank_id, v_source_id, 'included')
  on conflict (bank_id, source_id) do update set source_role = excluded.source_role;

  insert into public.practice_bank_versions (
    id, bank_id, version, status, source_version, item_count,
    content_sha256, approved_at, approved_by, updated_at
  ) values (
    v_bank_version_id,
    v_bank_id,
    (p_bank->>'version')::integer,
    'review_required',
    p_bank->>'sourceVersion',
    v_item_count,
    v_content_sha256,
    null,
    null,
    now()
  )
  on conflict (id) do update set
    source_version = excluded.source_version,
    item_count = excluded.item_count,
    content_sha256 = excluded.content_sha256,
    status = 'review_required',
    approved_at = null,
    approved_by = null,
    updated_at = now();

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_variant_id := v_item->>'id';
    v_question_id := (v_item->>'questionId')::bigint;

    if v_variant_id is null
       or jsonb_typeof(v_item->'choices') <> 'array'
       or jsonb_array_length(v_item->'choices') <> 4
       or not ((v_item->'choices') ? (v_item->>'correctChoice'))
       or not exists (
         select 1 from public.practice_questions question
         where question.id = v_question_id and question.source_id = v_source_id
       ) then
      raise exception 'living_atlas_import_item_invalid:%', coalesce(v_variant_id, 'missing-id');
    end if;

    insert into public.practice_variants (
      id, question_id, stem, choices, correct_choice, teaching_feedback,
      choice_feedback, topic, difficulty, status, bank_version_id,
      academic_year, term, course_code, course_title, set_title,
      category_l1, category_l2, category_l3, learning_objective,
      item_format, stem_type, cognitive_level, assessment_image_placement,
      review_status, source_version, bank_version, content_revision,
      review_note, reviewed_at, reviewed_by, updated_at
    ) values (
      v_variant_id,
      v_question_id,
      v_item->>'stem',
      v_item->'choices',
      v_item->>'correctChoice',
      v_item->>'teachingFeedback',
      v_item->'choiceFeedback',
      v_item->>'topic',
      v_item->>'difficulty',
      'approved',
      v_bank_version_id,
      v_item->>'academicYear',
      v_item->>'term',
      v_course_code,
      v_item->>'courseTitle',
      v_item->>'unit',
      v_item->>'domain',
      v_item->>'topic',
      v_item->>'conceptId',
      v_item->>'objective',
      v_item->>'itemFormat',
      v_item->>'stemType',
      v_item->>'cognitiveLevel',
      v_item->>'imagePlacement',
      'approved',
      p_bank->>'sourceVersion',
      (p_bank->>'version')::integer,
      1,
      'Founder-authorized automated conversion; source fidelity and structural checks passed.',
      now(),
      p_approved_by,
      now()
    )
    on conflict (id) do update set
      question_id = excluded.question_id,
      stem = excluded.stem,
      choices = excluded.choices,
      correct_choice = excluded.correct_choice,
      teaching_feedback = excluded.teaching_feedback,
      choice_feedback = excluded.choice_feedback,
      topic = excluded.topic,
      difficulty = excluded.difficulty,
      status = 'approved',
      bank_version_id = excluded.bank_version_id,
      academic_year = excluded.academic_year,
      term = excluded.term,
      course_code = excluded.course_code,
      course_title = excluded.course_title,
      set_title = excluded.set_title,
      category_l1 = excluded.category_l1,
      category_l2 = excluded.category_l2,
      category_l3 = excluded.category_l3,
      learning_objective = excluded.learning_objective,
      item_format = excluded.item_format,
      stem_type = excluded.stem_type,
      cognitive_level = excluded.cognitive_level,
      assessment_image_placement = excluded.assessment_image_placement,
      review_status = 'approved',
      source_version = excluded.source_version,
      bank_version = excluded.bank_version,
      review_note = excluded.review_note,
      reviewed_at = now(),
      reviewed_by = excluded.reviewed_by,
      updated_at = now();

    select variant.content_revision into v_revision
    from public.practice_variants variant
    where variant.id = v_variant_id;

    v_snapshot := jsonb_build_object(
      'stem', v_item->>'stem',
      'choices', v_item->'choices',
      'correctChoice', v_item->>'correctChoice',
      'teachingFeedback', v_item->>'teachingFeedback',
      'choiceFeedback', v_item->'choiceFeedback',
      'academicYear', v_item->>'academicYear',
      'term', v_item->>'term',
      'courseCode', v_course_code,
      'courseTitle', v_item->>'courseTitle',
      'unit', v_item->>'unit',
      'domain', v_item->>'domain',
      'topic', v_item->>'topic',
      'conceptId', v_item->>'conceptId',
      'objective', v_item->>'objective',
      'itemFormat', v_item->>'itemFormat',
      'stemType', v_item->>'stemType',
      'cognitiveLevel', v_item->>'cognitiveLevel',
      'difficulty', v_item->>'difficulty',
      'imagePlacement', case v_item->>'imagePlacement'
        when 'pre_commit' then 'prompt'
        when 'post_commit' then 'feedback'
        when 'review_only' then 'results'
        else 'none'
      end
    );

    if exists (
      select 1 from private.practice_variant_revisions revision
      where revision.variant_id = v_variant_id and revision.revision = v_revision
    ) then
      update public.practice_variants
      set content_revision = content_revision + 1, updated_at = now()
      where id = v_variant_id
      returning content_revision into v_revision;
    end if;

    insert into private.practice_variant_revisions (
      variant_id, revision, review_status, action, snapshot, note, created_by
    ) values (
      v_variant_id,
      v_revision,
      'approved',
      'approved',
      v_snapshot,
      'Founder-authorized automated conversion; source fidelity and structural checks passed.',
      p_approved_by
    );

    insert into private.practice_variant_review_events (
      variant_id, revision, action, note, created_by
    ) values (
      v_variant_id,
      v_revision,
      'approved',
      'Founder-authorized automated conversion; source fidelity and structural checks passed.',
      p_approved_by
    );

    insert into public.practice_bank_questions (bank_id, variant_id, position)
    values (v_bank_id, v_variant_id, (v_item->>'position')::integer)
    on conflict (bank_id, variant_id) do update set position = excluded.position;

    insert into public.practice_bank_version_questions (
      bank_version_id, variant_id, position, variant_revision
    ) values (
      v_bank_version_id,
      v_variant_id,
      (v_item->>'position')::integer,
      v_revision
    )
    on conflict (bank_version_id, variant_id) do update set
      position = excluded.position,
      variant_revision = excluded.variant_revision;
  end loop;

  if (select count(*) from public.practice_bank_version_questions membership
      where membership.bank_version_id = v_bank_version_id) <> v_item_count then
    raise exception 'living_atlas_import_membership_count_mismatch';
  end if;

  update public.practice_bank_versions
  set status = 'approved', approved_at = now(), approved_by = p_approved_by, updated_at = now()
  where id = v_bank_version_id;

  update public.practice_banks
  set status = 'published', question_count = v_item_count, updated_at = now()
  where id = v_bank_id;

  update public.practice_course_sources
  set status = 'released', updated_at = now()
  where course_code = v_course_code and source_id = v_source_id;

  return jsonb_build_object(
    'status', 'imported',
    'bankId', v_bank_id,
    'bankVersionId', v_bank_version_id,
    'itemCount', v_item_count
  );
end;
$$;

revoke all on function public.living_atlas_import_approved_source_bank(jsonb, jsonb, uuid)
from public, anon, authenticated;
grant execute on function public.living_atlas_import_approved_source_bank(jsonb, jsonb, uuid)
to service_role;
