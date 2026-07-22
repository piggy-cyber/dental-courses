-- Founder review is append-only. The editable current candidate remains in the
-- server-only practice_variants table, while each saved review revision keeps
-- an immutable content snapshot for audit and frozen practice sessions.

alter table public.practice_variants
  add column if not exists content_revision integer not null default 1,
  add column if not exists review_note text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.profiles(id);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'practice_variants_content_revision_check') then
    alter table public.practice_variants add constraint practice_variants_content_revision_check
      check (content_revision > 0);
  end if;
end $$;

alter table public.practice_session_items
  add column if not exists variant_revision integer not null default 1;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'practice_session_items_variant_revision_check') then
    alter table public.practice_session_items add constraint practice_session_items_variant_revision_check
      check (variant_revision > 0);
  end if;
end $$;

create table if not exists private.practice_variant_revisions (
  id uuid primary key default gen_random_uuid(),
  variant_id text not null references public.practice_variants(id) on delete restrict,
  revision integer not null check (revision > 0),
  review_status text not null check (review_status in ('review_required', 'changes_requested', 'approved', 'rejected')),
  action text not null check (action in ('created', 'saved', 'approved', 'changes_requested', 'rejected')),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (variant_id, revision)
);

create table if not exists private.practice_variant_review_events (
  id uuid primary key default gen_random_uuid(),
  variant_id text not null references public.practice_variants(id) on delete restrict,
  revision integer not null check (revision > 0),
  action text not null check (action in ('created', 'saved', 'approved', 'changes_requested', 'rejected')),
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table private.practice_variant_revisions enable row level security;
alter table private.practice_variant_review_events enable row level security;

revoke all on private.practice_variant_revisions from anon, authenticated;
revoke all on private.practice_variant_review_events from anon, authenticated;

create index if not exists practice_variant_revisions_variant_revision_idx
  on private.practice_variant_revisions (variant_id, revision desc);
create index if not exists practice_variant_review_events_variant_created_idx
  on private.practice_variant_review_events (variant_id, created_at desc);
create index if not exists practice_session_items_variant_revision_idx
  on public.practice_session_items (variant_id, variant_revision);

-- Record a baseline immutable revision for the existing Lecture 1 founder
-- draft. The source cards themselves are untouched in practice_questions.
insert into private.practice_variant_revisions (
  variant_id,
  revision,
  review_status,
  action,
  snapshot,
  note
)
select
  variant.id,
  variant.content_revision,
  case
    when variant.review_status in ('changes_requested', 'approved', 'rejected') then variant.review_status
    else 'review_required'
  end,
  'created',
  jsonb_build_object(
    'stem', variant.stem,
    'choices', variant.choices,
    'correctChoice', variant.correct_choice,
    'teachingFeedback', variant.teaching_feedback,
    'choiceFeedback', variant.choice_feedback,
    'academicYear', variant.academic_year,
    'term', variant.term,
    'courseCode', variant.course_code,
    'courseTitle', variant.course_title,
    'unit', variant.set_title,
    'domain', variant.category_l1,
    'topic', variant.category_l2,
    'conceptId', variant.category_l3,
    'objective', variant.learning_objective,
    'itemFormat', variant.item_format,
    'stemType', variant.stem_type,
    'cognitiveLevel', variant.cognitive_level,
    'difficulty', variant.difficulty,
    'imagePlacement', case variant.assessment_image_placement
      when 'pre_commit' then 'prompt'
      when 'post_commit' then 'feedback'
      when 'review_only' then 'results'
      else 'none'
    end
  ),
  'Baseline candidate imported for founder review.'
from public.practice_variants variant
where variant.bank_version_id = 'living-atlas-omar-dental-anatomy-lecture-1-v1'
on conflict (variant_id, revision) do nothing;

insert into private.practice_variant_review_events (variant_id, revision, action, note)
select
  revision.variant_id,
  revision.revision,
  'created',
  'Baseline candidate imported for founder review.'
from private.practice_variant_revisions revision
where revision.variant_id like 'la-omar-da-l1-%'
  and revision.revision = 1
  and not exists (
    select 1
    from private.practice_variant_review_events event
    where event.variant_id = revision.variant_id
      and event.revision = revision.revision
      and event.action = 'created'
  );
