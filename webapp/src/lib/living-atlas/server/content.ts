import "server-only";

import type { LivingAtlasAssessmentImagePlacement, LivingAtlasChoice, LivingAtlasDifficulty, LivingAtlasQuestionFormat, LivingAtlasReviewStatus, LivingAtlasTaxonomy } from "@/lib/living-atlas/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { LIVING_ATLAS_REFERENCE_BANK_ID, resolveLivingAtlasBankContext } from "@/lib/living-atlas/server/course-catalog";

// Temporary compatibility exports. Runtime callers resolve their bank and
// version through the course catalog instead of using these literals.
export const LIVING_ATLAS_BANK_ID = LIVING_ATLAS_REFERENCE_BANK_ID;
export const LIVING_ATLAS_BANK_VERSION_ID = "living-atlas-omar-dental-anatomy-lecture-1-v1";

type AdminClient = ReturnType<typeof createAdminClient>;

type VariantRow = {
  id: string;
  question_id: number;
  stem: string;
  choices: unknown;
  correct_choice: string;
  teaching_feedback: string;
  choice_feedback: unknown;
  difficulty: string;
  academic_year: string | null;
  term: string | null;
  course_code: string | null;
  course_title: string | null;
  set_title: string | null;
  category_l1: string | null;
  category_l2: string | null;
  category_l3: string | null;
  learning_objective: string | null;
  item_format: string | null;
  stem_type: string | null;
  cognitive_level: string | null;
  assessment_image_placement: string | null;
  review_status: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  content_revision: number;
};

type MembershipRow = { variant_id: string; position: number };

type MediaRow = {
  id: string;
  variant_id: string;
  placement: Exclude<LivingAtlasAssessmentImagePlacement, "none">;
  display_order: number;
  alt_text: string | null;
  caption: string | null;
  storage_bucket: string;
  storage_path: string | null;
  cache_status: string;
  mime_type: string | null;
};

type RevisionRow = {
  variant_id: string;
  revision: number;
  review_status: string;
  snapshot: unknown;
};

export type LivingAtlasRuntimeQuestion = {
  id: string;
  sourceOrder: number;
  revision: number;
  reviewStatus: LivingAtlasReviewStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  stem: string;
  choices: LivingAtlasChoice[];
  correctChoiceId: LivingAtlasChoice["id"];
  teachingFeedback: string;
  choiceFeedback: Record<LivingAtlasChoice["id"], string>;
  taxonomy: LivingAtlasTaxonomy;
  imagePlacement: LivingAtlasAssessmentImagePlacement;
  media: MediaRow[];
};

const choiceIds: LivingAtlasChoice["id"][] = ["a", "b", "c", "d"];
const reviewStatuses = new Set<LivingAtlasReviewStatus>(["review_required", "changes_requested", "approved", "rejected"]);
const difficultyValues = new Set<LivingAtlasDifficulty>(["foundational", "application", "advanced"]);

function asText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function normalizeItemFormat(value: unknown): LivingAtlasQuestionFormat {
  if (value === "true_false" || value === "image_identification") return value;
  return "single_best_answer";
}

function normalizeChoices(value: unknown, itemFormat: LivingAtlasQuestionFormat): LivingAtlasChoice[] {
  const texts = Array.isArray(value) ? value.map((entry) => asText(entry).trim()) : [];
  const expectedCount = itemFormat === "true_false" ? 2 : 4;
  if (texts.length !== expectedCount || texts.some((entry) => !entry)) {
    throw new Error(itemFormat === "true_false"
      ? "A true/false question must have exactly two choices."
      : "A reviewed Test Mode question must have exactly four non-empty choices.");
  }
  if (itemFormat === "true_false" && (texts[0]?.toLowerCase() !== "true" || texts[1]?.toLowerCase() !== "false")) {
    throw new Error("A true/false question must use the choices True and False in that order.");
  }
  return choiceIds.slice(0, expectedCount).map((id, index) => ({ id, text: texts[index] ?? "" }));
}

function normalizeChoiceFeedback(value: unknown): Record<LivingAtlasChoice["id"], string> {
  const source = asObject(value);
  return Object.fromEntries(choiceIds.map((id) => [id, asText(source[id])])) as Record<LivingAtlasChoice["id"], string>;
}

function normalizeDifficulty(value: unknown): LivingAtlasDifficulty {
  return difficultyValues.has(value as LivingAtlasDifficulty) ? value as LivingAtlasDifficulty : "foundational";
}

function normalizeReviewStatus(value: unknown): LivingAtlasReviewStatus {
  return reviewStatuses.has(value as LivingAtlasReviewStatus) ? value as LivingAtlasReviewStatus : "review_required";
}

function normalizeImagePlacement(value: unknown): LivingAtlasAssessmentImagePlacement {
  if (value === "pre_commit" || value === "prompt") return "prompt";
  if (value === "post_commit" || value === "feedback") return "feedback";
  if (value === "review_only" || value === "results") return "results";
  return "none";
}

function taxonomies(source: Record<string, unknown>): LivingAtlasTaxonomy {
  return {
    academicYear: asText(source.academicYear ?? source.academic_year, "D1"),
    term: asText(source.term, "Fall"),
    courseCode: asText(source.courseCode ?? source.course_code, "REHE 151"),
    courseTitle: asText(source.courseTitle ?? source.course_title, "Dental Anatomy"),
    unit: asText(source.unit ?? source.set_title, "Lecture 1"),
    domain: asText(source.domain ?? source.category_l1, "Dental Anatomy"),
    topic: asText(source.topic ?? source.category_l2),
    conceptId: asText(source.conceptId ?? source.category_l3),
    objective: asText(source.objective ?? source.learning_objective),
    itemFormat: asText(source.itemFormat ?? source.item_format, "single_best_answer"),
    stemType: asText(source.stemType ?? source.stem_type, "standard"),
    cognitiveLevel: asText(source.cognitiveLevel ?? source.cognitive_level, "recall"),
    difficulty: normalizeDifficulty(source.difficulty),
  };
}

function withMedia(question: Omit<LivingAtlasRuntimeQuestion, "media">, mediaByVariant: Map<string, MediaRow[]>) {
  return { ...question, media: mediaByVariant.get(question.id) ?? [] };
}

function currentQuestion(row: VariantRow, sourceOrder: number, mediaByVariant: Map<string, MediaRow[]>): LivingAtlasRuntimeQuestion {
  const itemFormat = normalizeItemFormat(row.item_format);
  const choices = normalizeChoices(row.choices, itemFormat);
  const correctIndex = choices.findIndex((choice) => choice.text === row.correct_choice);
  if (correctIndex < 0) throw new Error(`Question ${row.id} has a correct answer that is not one of its choices.`);
  return withMedia({
    id: row.id,
    sourceOrder,
    revision: row.content_revision,
    reviewStatus: normalizeReviewStatus(row.review_status),
    reviewNote: row.review_note,
    reviewedAt: row.reviewed_at,
    stem: row.stem,
    choices,
    correctChoiceId: choices[correctIndex]?.id ?? "a",
    teachingFeedback: row.teaching_feedback,
    choiceFeedback: normalizeChoiceFeedback(row.choice_feedback),
    taxonomy: { ...taxonomies(row as unknown as Record<string, unknown>), itemFormat },
    imagePlacement: normalizeImagePlacement(row.assessment_image_placement),
  }, mediaByVariant);
}

function revisionQuestion(row: RevisionRow, sourceOrder: number, mediaByVariant: Map<string, MediaRow[]>): LivingAtlasRuntimeQuestion {
  const snapshot = asObject(row.snapshot);
  const itemFormat = normalizeItemFormat(snapshot.itemFormat);
  const choices = normalizeChoices(snapshot.choices, itemFormat);
  const correctIndex = choices.findIndex((choice) => choice.text === asText(snapshot.correctChoice));
  if (correctIndex < 0) throw new Error(`Frozen question ${row.variant_id} revision ${row.revision} has an invalid correct answer.`);
  return withMedia({
    id: row.variant_id,
    sourceOrder,
    revision: row.revision,
    reviewStatus: normalizeReviewStatus(row.review_status),
    reviewNote: null,
    reviewedAt: null,
    stem: asText(snapshot.stem),
    choices,
    correctChoiceId: choices[correctIndex]?.id ?? "a",
    teachingFeedback: asText(snapshot.teachingFeedback),
    choiceFeedback: normalizeChoiceFeedback(snapshot.choiceFeedback),
    taxonomy: { ...taxonomies(snapshot), itemFormat },
    imagePlacement: normalizeImagePlacement(snapshot.imagePlacement),
  }, mediaByVariant);
}

async function mediaFor(admin: AdminClient, variantIds: string[]) {
  if (!variantIds.length) return new Map<string, MediaRow[]>();
  const { data: links, error: linkError } = await admin
    .from("practice_variant_media")
    .select("variant_id, media_asset_id, placement, display_order, alt_text, caption")
    .in("variant_id", variantIds)
    .order("display_order");
  if (linkError) throw new Error("Registered question-image links could not be loaded.");
  const assetIds = (links ?? []).map((link) => link.media_asset_id);
  if (!assetIds.length) return new Map<string, MediaRow[]>();
  const { data: assets, error: assetError } = await admin
    .from("practice_media_assets")
    .select("id, storage_bucket, storage_path, cache_status, mime_type")
    .in("id", assetIds);
  if (assetError) throw new Error("Registered source images could not be loaded.");
  const assetsById = new Map((assets ?? []).map((asset) => [asset.id, asset]));
  const mediaByVariant = new Map<string, MediaRow[]>();
  for (const link of links ?? []) {
    const asset = assetsById.get(link.media_asset_id);
    if (!asset) continue;
    const media: MediaRow = {
      id: asset.id,
      variant_id: link.variant_id,
      placement: normalizeImagePlacement(link.placement) as Exclude<LivingAtlasAssessmentImagePlacement, "none">,
      display_order: Number(link.display_order) || 1,
      alt_text: typeof link.alt_text === "string" ? link.alt_text : null,
      caption: typeof link.caption === "string" ? link.caption : null,
      storage_bucket: asset.storage_bucket,
      storage_path: asset.storage_path,
      cache_status: asset.cache_status,
      mime_type: asset.mime_type,
    };
    const entries = mediaByVariant.get(link.variant_id) ?? [];
    entries.push(media);
    mediaByVariant.set(link.variant_id, entries);
  }
  return mediaByVariant;
}

async function membershipFor(bankVersionId: string, admin: AdminClient) {
  const { data, error } = await admin
    .from("practice_bank_version_questions")
    .select("variant_id, position")
    .eq("bank_version_id", bankVersionId)
    .order("position");
  if (error) throw new Error("Question-bank membership could not be loaded.");
  return (data ?? []) as MembershipRow[];
}

export async function getBankQuestions(bankVersionId: string, admin = createAdminClient()) {
  const membership = await membershipFor(bankVersionId, admin);
  const ids = membership.map((item) => item.variant_id);
  const [{ data, error }, mediaByVariant] = await Promise.all([
    admin
      .from("practice_variants")
      .select("id, question_id, stem, choices, correct_choice, teaching_feedback, choice_feedback, difficulty, academic_year, term, course_code, course_title, set_title, category_l1, category_l2, category_l3, learning_objective, item_format, stem_type, cognitive_level, assessment_image_placement, review_status, review_note, reviewed_at, content_revision")
      .in("id", ids),
    mediaFor(admin, ids),
  ]);
  if (error) throw new Error("Founder-review question content could not be loaded.");
  const rows = new Map((data ?? []).map((row) => [row.id, row as VariantRow]));
  return membership.flatMap((item) => {
    const row = rows.get(item.variant_id);
    return row ? [currentQuestion(row, item.position, mediaByVariant)] : [];
  });
}

export async function getCurrentBankQuestions(admin = createAdminClient()) {
  const context = await resolveLivingAtlasBankContext(LIVING_ATLAS_REFERENCE_BANK_ID, admin);
  return getBankQuestions(context.bankVersionId, admin);
}

export async function getFrozenBankQuestions(
  items: Array<{ variant_id: string; variant_revision: number; position: number }>,
  admin = createAdminClient(),
) {
  if (!items.length) return new Map<string, LivingAtlasRuntimeQuestion>();
  const ids = Array.from(new Set(items.map((item) => item.variant_id)));
  const [{ data, error }, mediaByVariant] = await Promise.all([
    admin.rpc("living_atlas_get_variant_revisions", { p_variant_ids: ids }),
    mediaFor(admin, ids),
  ]);
  if (error) throw new Error("Frozen question content could not be loaded.");
  const revisionData = (data ?? []) as RevisionRow[];
  const revisionRows = new Map(revisionData.map((revision) => {
    return [`${revision.variant_id}:${revision.revision}`, revision];
  }));
  return new Map(items.map((item) => {
    const row = revisionRows.get(`${item.variant_id}:${item.variant_revision}`);
    if (!row) throw new Error(`Frozen revision ${item.variant_id} r${item.variant_revision} is unavailable.`);
    return [item.variant_id, revisionQuestion(row, item.position, mediaByVariant)];
  }));
}

export async function signQuestionImages(
  admin: AdminClient,
  question: LivingAtlasRuntimeQuestion,
  placement?: Exclude<LivingAtlasAssessmentImagePlacement, "none">,
) {
  const selectedMedia = question.media.filter((media) => !placement || media.placement === placement);
  return Promise.all(selectedMedia.map(async (media) => {
    const alt = media.alt_text ?? `Clinical image for ${question.taxonomy.topic || "this question"}`;
    const caption = media.caption ?? `Private source diagram · ${question.taxonomy.topic || "Living Atlas"}`;
    if (media.cache_status !== "cached" || !media.storage_path) {
      return { id: media.id, placement: media.placement, available: false, url: null, alt, caption };
    }
    const { data, error } = await admin.storage
      .from(media.storage_bucket)
      .createSignedUrl(media.storage_path, 60 * 10);
    if (error || !data?.signedUrl) return { id: media.id, placement: media.placement, available: false, url: null, alt, caption };
    return { id: media.id, placement: media.placement, available: true, url: data.signedUrl, alt, caption };
  }));
}

export async function signQuestionImage(admin: AdminClient, question: LivingAtlasRuntimeQuestion) {
  const placement = question.imagePlacement === "none" ? undefined : question.imagePlacement;
  const images = await signQuestionImages(admin, question, placement);
  const image = images.find((candidate) => candidate.available) ?? images[0];
  if (!image) {
    return { imageAvailable: false, imageUrl: null, imageCaption: null };
  }
  return {
    imageAvailable: image.available,
    imageUrl: image.url,
    imageCaption: image.caption,
  };
}

export function countReviewStatuses(
  questions: LivingAtlasRuntimeQuestion[],
  context: { bankVersionId: string; bankStatus: string; bankVersion: number },
) {
  return {
    bankVersionId: context.bankVersionId,
    bankVersion: context.bankVersion,
    bankStatus: normalizeReviewStatus(context.bankStatus),
    total: questions.length,
    reviewRequired: questions.filter((question) => question.reviewStatus === "review_required").length,
    changesRequested: questions.filter((question) => question.reviewStatus === "changes_requested").length,
    approved: questions.filter((question) => question.reviewStatus === "approved").length,
    rejected: questions.filter((question) => question.reviewStatus === "rejected").length,
    imageSupported: questions.filter((question) => question.media.length > 0).length,
  };
}
