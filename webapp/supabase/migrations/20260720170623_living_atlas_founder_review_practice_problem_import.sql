-- Founder-review importer for source-linked practice problems.
--
-- This is deliberately separate from the retired automatic Quizlet conversion.
-- It accepts only a bounded review payload through the service role, verifies
-- its immutable source links in the database, and writes candidates as review
-- material. It never publishes a bank or makes it Test Mode eligible.

create or replace function public.living_atlas_import_founder_review_practice_problem_bank(
  p_bank jsonb,
  p_items jsonb,
  p_content_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_bank_id text := p_bank->>'id';
  v_bank_version_id text := p_bank->>'versionId';
  v_source_id text := p_bank->>'sourceId';
  v_course_code text := p_bank->>'courseCode';
  v_course_slug text := p_bank->>'courseSlug';
  v_item_count integer := jsonb_array_length(p_items);
  v_expected_count integer := (p_bank->>'itemCount')::integer;
  v_existing_status text;
  v_existing_sha256 text;
  v_item jsonb;
  v_position integer := 0;
  v_variant_id text;
  v_question_id bigint;
  v_source_order integer;
  v_choice_count integer;
  v_expected_choice_count integer;
  v_item_format text;
  v_correct_choice_id text;
  v_correct_choice text;
  v_choices jsonb;
  v_choice_id text;
  v_image_placement text;
  v_media_sha256 text;
  v_media_asset_id text;
  v_image_linked_count integer := 0;
begin
  if jsonb_typeof(p_bank) <> 'object' or jsonb_typeof(p_items) <> 'array'
     or nullif(trim(coalesce(p_content_sha256, '')), '') is null then
    raise exception 'living_atlas_review_import_payload_invalid';
  end if;

  if v_bank_id is null or v_bank_version_id is null or v_source_id is null
     or v_course_code is null or v_course_slug is null
     or p_bank->>'bankKind' <> 'practice_problem'
     or p_bank->>'provenance' <> 'source_derived'
     or p_bank->>'status' <> 'review_required' then
    raise exception 'living_atlas_review_import_bank_metadata_invalid';
  end if;

  if v_item_count < 1 or v_item_count > 1000 or v_item_count <> v_expected_count then
    raise exception 'living_atlas_review_import_item_count_mismatch';
  end if;

  if not exists (
    select 1 from public.practice_course_catalog course
    where course.course_code = v_course_code and course.slug = v_course_slug
  ) then
    raise exception 'living_atlas_review_import_course_missing';
  end if;

  if not exists (
    select 1 from public.practice_sources source
    where source.id = v_source_id
      and source.source_card_count = (p_bank->>'sourceCardCount')::integer
  ) then
    raise exception 'living_atlas_review_import_source_mismatch';
  end if;

  select version.status, version.content_sha256
  into v_existing_status, v_existing_sha256
  from public.practice_bank_versions version
  where version.id = v_bank_version_id;

  if v_existing_status is not null then
    if v_existing_sha256 = p_content_sha256 then
      return jsonb_build_object(
        'status', 'unchanged',
        'bankId', v_bank_id,
        'bankVersionId', v_bank_version_id,
        'itemCount', v_item_count
      );
    end if;
    raise exception 'living_atlas_review_import_version_is_immutable';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) item
    group by item->>'id'
    having count(*) > 1
  ) or exists (
    select 1
    from jsonb_array_elements(p_items) item
    group by item->>'sourceQuestionId'
    having count(*) > 1
  ) then
    raise exception 'living_atlas_review_import_duplicate_item_or_source';
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
    (p_bank->>'sourceCardCount')::integer,
    v_item_count,
    'practice_problem',
    'source_derived',
    coalesce(p_bank->>'contractVersion', 'omar-derived-practice-problem-candidate-v1'),
    now()
  )
  on conflict (id) do update set
    source_id = excluded.source_id,
    course_code = excluded.course_code,
    course_slug = excluded.course_slug,
    title = excluded.title,
    description = excluded.description,
    default_mode = 'tutor',
    status = 'review',
    source_card_count = excluded.source_card_count,
    question_count = excluded.question_count,
    bank_kind = 'practice_problem',
    provenance = 'source_derived',
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
    p_content_sha256,
    null,
    null,
    now()
  );

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_position := v_position + 1;
    v_variant_id := v_item->>'id';
    v_question_id := (v_item->>'sourceQuestionId')::bigint;
    v_item_format := v_item->'taxonomy'->>'itemFormat';
    v_correct_choice_id := v_item->>'correctChoiceId';
    v_image_placement := v_item->>'imagePlacement';

    if nullif(trim(coalesce(v_variant_id, '')), '') is null
       or nullif(trim(coalesce(v_item->>'stem', '')), '') is null
       or nullif(trim(coalesce(v_item->>'teachingFeedback', '')), '') is null
       or jsonb_typeof(v_item->'choices') <> 'array'
       or jsonb_typeof(v_item->'choiceFeedback') <> 'object'
       or v_item_format not in ('single_best_answer', 'true_false', 'image_identification')
       or v_image_placement not in ('none', 'prompt', 'feedback', 'results') then
      raise exception 'living_atlas_review_import_item_invalid:%', coalesce(v_variant_id, 'missing-id');
    end if;

    v_choice_count := jsonb_array_length(v_item->'choices');
    v_expected_choice_count := case when v_item_format = 'true_false' then 2 else 4 end;
    if v_choice_count <> v_expected_choice_count then
      raise exception 'living_atlas_review_import_choice_count_invalid:%', v_variant_id;
    end if;

    select jsonb_agg(choice.value->>'text' order by choice.value->>'id')
    into v_choices
    from jsonb_array_elements(v_item->'choices') choice;

    if jsonb_array_length(v_choices) <> v_expected_choice_count
       or exists (
         select 1
         from jsonb_array_elements(v_item->'choices') choice
         where nullif(trim(coalesce(choice.value->>'id', '')), '') is null
            or nullif(trim(coalesce(choice.value->>'text', '')), '') is null
       ) then
      raise exception 'living_atlas_review_import_choice_text_invalid:%', v_variant_id;
    end if;

    if v_item_format = 'true_false'
       and (v_choices->>0 <> 'True' or v_choices->>1 <> 'False') then
      raise exception 'living_atlas_review_import_true_false_invalid:%', v_variant_id;
    end if;

    select choice.value->>'text'
    into v_correct_choice
    from jsonb_array_elements(v_item->'choices') choice
    where choice.value->>'id' = v_correct_choice_id;
    if v_correct_choice is null then
      raise exception 'living_atlas_review_import_correct_choice_invalid:%', v_variant_id;
    end if;

    for v_choice_id in select choice.value->>'id' from jsonb_array_elements(v_item->'choices') choice
    loop
      if nullif(trim(coalesce(v_item->'choiceFeedback'->>v_choice_id, '')), '') is null then
        raise exception 'living_atlas_review_import_choice_feedback_missing:%', v_variant_id;
      end if;
    end loop;

    select question.source_order
    into v_source_order
    from public.practice_questions question
    where question.id = v_question_id and question.source_id = v_source_id;
    if not found or v_source_order <> (v_item->>'sourceOrder')::integer then
      raise exception 'living_atlas_review_import_source_link_invalid:%', v_variant_id;
    end if;

    if exists (select 1 from public.practice_variants variant where variant.id = v_variant_id) then
      raise exception 'living_atlas_review_import_variant_id_exists:%', v_variant_id;
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
      v_choices,
      v_correct_choice,
      v_item->>'teachingFeedback',
      v_item->'choiceFeedback',
      v_item->'taxonomy'->>'topic',
      v_item->'taxonomy'->>'difficulty',
      'review',
      v_bank_version_id,
      p_bank->>'academicYear',
      p_bank->>'term',
      v_course_code,
      p_bank->>'courseTitle',
      p_bank->>'unit',
      v_item->'taxonomy'->>'domain',
      v_item->'taxonomy'->>'topic',
      v_item->'taxonomy'->>'conceptId',
      v_item->'taxonomy'->>'objective',
      v_item_format,
      v_item->'taxonomy'->>'stemType',
      v_item->'taxonomy'->>'cognitiveLevel',
      case v_image_placement
        when 'prompt' then 'pre_commit'
        when 'feedback' then 'post_commit'
        when 'results' then 'review_only'
        else 'none'
      end,
      'review_required',
      p_bank->>'sourceVersion',
      (p_bank->>'version')::integer,
      1,
      coalesce(p_bank->>'reviewNote', 'Source-linked candidate; founder review required before any release.'),
      null,
      null,
      now()
    );

    insert into private.practice_variant_revisions (
      variant_id, revision, review_status, action, snapshot, note, created_by
    ) values (
      v_variant_id,
      1,
      'review_required',
      'created',
      jsonb_build_object(
        'sourceQuestionId', v_question_id,
        'sourceOrder', v_source_order,
        'sourceCardId', v_item->>'sourceCardId',
        'stem', v_item->>'stem',
        'choices', v_item->'choices',
        'correctChoiceId', v_correct_choice_id,
        'teachingFeedback', v_item->>'teachingFeedback',
        'choiceFeedback', v_item->'choiceFeedback',
        'taxonomy', v_item->'taxonomy',
        'imagePlacement', v_image_placement
      ),
      'Created as a source-linked founder-review candidate. The immutable Omar source card remains the reference.',
      null
    );

    insert into private.practice_variant_review_events (
      variant_id, revision, action, note, created_by
    ) values (
      v_variant_id,
      1,
      'created',
      'Created as a source-linked founder-review candidate.',
      null
    );

    insert into public.practice_bank_questions (bank_id, variant_id, position)
    values (v_bank_id, v_variant_id, v_position);

    insert into public.practice_bank_version_questions (
      bank_version_id, variant_id, position, variant_revision
    ) values (
      v_bank_version_id,
      v_variant_id,
      v_position,
      1
    );

    if v_image_placement <> 'none' then
      select source_media.sha256
      into v_media_sha256
      from public.practice_source_media source_media
      where source_media.source_card_id = v_item->>'sourceCardId'
        and source_media.cache_status = 'cached'
      order by source_media.updated_at desc
      limit 1;

      select asset.id
      into v_media_asset_id
      from public.practice_media_assets asset
      where asset.sha256 = v_media_sha256 and asset.cache_status = 'cached'
      order by asset.updated_at desc
      limit 1;

      if v_media_asset_id is null then
        raise exception 'living_atlas_review_import_image_missing:%', v_variant_id;
      end if;

      insert into public.practice_variant_media (
        variant_id, media_asset_id, placement, display_order, alt_text, caption
      ) values (
        v_variant_id,
        v_media_asset_id,
        v_image_placement,
        1,
        'Private source-linked REHE 151 reference image.',
        'Private source-linked reference image · Founder Review only.'
      );
      v_image_linked_count := v_image_linked_count + 1;
    end if;
  end loop;

  if (select count(*) from public.practice_bank_version_questions membership where membership.bank_version_id = v_bank_version_id) <> v_item_count then
    raise exception 'living_atlas_review_import_membership_count_mismatch';
  end if;

  return jsonb_build_object(
    'status', 'imported',
    'bankId', v_bank_id,
    'bankVersionId', v_bank_version_id,
    'itemCount', v_item_count,
    'imageLinkedItems', v_image_linked_count
  );
end;
$$;

revoke all on function public.living_atlas_import_founder_review_practice_problem_bank(jsonb, jsonb, text)
from public, anon, authenticated;

grant execute on function public.living_atlas_import_founder_review_practice_problem_bank(jsonb, jsonb, text)
to service_role;
