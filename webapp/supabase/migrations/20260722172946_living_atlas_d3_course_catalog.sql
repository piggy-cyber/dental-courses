-- D3 Living Atlas source edition. Omar's captured source cards remain
-- immutable and are delivered only through Recall Practice.

insert into public.resource_collections (
  id, label, short_label, description, source_tier, source_cohort,
  default_for_tier, is_active, sort_order, cumulative_access
) values (
  'd3-2025-2026',
  'D3 · 2025–26 · Founder Preview',
  'D3 Founder Preview',
  'Founder-only D3 source edition for Living Atlas Recall Practice.',
  'd3',
  'd3-2025',
  false,
  true,
  30,
  false
)
on conflict (id) do update set
  label = excluded.label,
  short_label = excluded.short_label,
  description = excluded.description,
  source_tier = excluded.source_tier,
  source_cohort = excluded.source_cohort,
  default_for_tier = excluded.default_for_tier,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  cumulative_access = excluded.cumulative_access;

insert into public.courses (
  code, title, semester, area, sort_order, library_tier, resource_collection_id
) values
  ('DSRE 335', 'Clinical Pharmacology', 'Summer', 'D3', 10, 'd3', 'd3-2025-2026'),
  ('REHE 358', 'Dental Materials II', 'Summer', 'D3', 20, 'd3', 'd3-2025-2026'),
  ('HEWB 349', 'Dentofacial Morphology', 'Summer', 'D3', 30, 'd3', 'd3-2025-2026'),
  ('DSPR 333', 'Management of Medical Emergencies', 'Summer', 'D3', 40, 'd3', 'd3-2025-2026'),
  ('DSRE 396', 'Temporomandibular Disorders and Occlusion', 'Summer', 'D3', 50, 'd3', 'd3-2025-2026')
on conflict (code) do update set
  title = excluded.title,
  semester = excluded.semester,
  area = excluded.area,
  sort_order = excluded.sort_order,
  library_tier = excluded.library_tier,
  resource_collection_id = excluded.resource_collection_id;

insert into public.practice_course_catalog (
  course_code, slug, academic_year, term, status, description, sort_order
) values
  ('DSRE 335', 'd3-summer-dsre-335-clinical-pharmacology', 'D3', 'Summer', 'review', 'Omar source edition · Recall Practice only.', 10),
  ('REHE 358', 'd3-summer-rehe-358-dental-materials-ii', 'D3', 'Summer', 'review', 'Omar source edition · Recall Practice only.', 20),
  ('HEWB 349', 'd3-summer-hewb-349-dentofacial-morphology', 'D3', 'Summer', 'review', 'Omar source edition · Recall Practice only.', 30),
  ('DSPR 333', 'd3-summer-dspr-333-management-medical-emergencies', 'D3', 'Summer', 'review', 'Omar source edition · Recall Practice only.', 40),
  ('DSRE 396', 'd3-summer-dsre-396-temporomandibular-disorders-occlusion', 'D3', 'Summer', 'review', 'Omar source edition · Recall Practice only.', 50)
on conflict (course_code) do update set
  slug = excluded.slug,
  academic_year = excluded.academic_year,
  term = excluded.term,
  status = excluded.status,
  description = excluded.description,
  sort_order = excluded.sort_order,
  updated_at = now();
