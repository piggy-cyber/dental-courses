-- The first course package gets controlled concept and objective nodes. Future
-- packages use this same hierarchy instead of inventing free-form tags.

with lecture_one_variants as (
  select distinct on (variant.category_l3)
    variant.category_l1,
    variant.category_l2,
    variant.category_l3,
    variant.learning_objective
  from public.practice_variants variant
  join public.practice_questions question on question.id = variant.question_id
  where question.source_id = 'quizlet-932842633'
    and variant.category_l3 is not null
  order by variant.category_l3, variant.id
), concept_nodes as (
  select
    'REHE 151'::text as course_code,
    category_l3 as node_id,
    case lower(category_l2)
      when 'foundations' then 'foundations-topic'
      else trim(both '-' from regexp_replace(lower(category_l2), '[^a-z0-9]+', '-', 'g'))
    end as parent_node_id,
    'concept'::text as node_type,
    initcap(replace(category_l3, '-', ' ')) as label,
    learning_objective as objective_text,
    row_number() over (partition by category_l2 order by category_l3)::integer as sort_order
  from lecture_one_variants
)
insert into public.practice_taxonomy_nodes (
  course_code,
  node_id,
  parent_node_id,
  node_type,
  label,
  objective_text,
  sort_order
)
select course_code, node_id, parent_node_id, node_type, label, objective_text, sort_order
from concept_nodes
on conflict (course_code, node_id) do update
set parent_node_id = excluded.parent_node_id,
    node_type = excluded.node_type,
    label = excluded.label,
    objective_text = excluded.objective_text,
    sort_order = excluded.sort_order,
    updated_at = now();

with lecture_one_variants as (
  select distinct on (variant.category_l3)
    variant.category_l3,
    variant.learning_objective
  from public.practice_variants variant
  join public.practice_questions question on question.id = variant.question_id
  where question.source_id = 'quizlet-932842633'
    and variant.category_l3 is not null
  order by variant.category_l3, variant.id
)
insert into public.practice_taxonomy_nodes (
  course_code,
  node_id,
  parent_node_id,
  node_type,
  label,
  objective_text,
  sort_order
)
select
  'REHE 151',
  category_l3 || '-objective',
  category_l3,
  'objective',
  'Objective: ' || initcap(replace(category_l3, '-', ' ')),
  learning_objective,
  1
from lecture_one_variants
on conflict (course_code, node_id) do update
set parent_node_id = excluded.parent_node_id,
    node_type = excluded.node_type,
    label = excluded.label,
    objective_text = excluded.objective_text,
    sort_order = excluded.sort_order,
    updated_at = now();
