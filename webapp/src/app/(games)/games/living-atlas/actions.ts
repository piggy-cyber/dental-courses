"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/access";
import { LIVING_ATLAS_COLLECTIBLES, LIVING_ATLAS_DEFAULT_COMPANION_ID } from "@/lib/living-atlas/companion";
import {
  countReviewStatuses,
  getBankQuestions,
  getFrozenBankQuestions,
  type LivingAtlasRuntimeQuestion,
  signQuestionImage,
  signQuestionImages,
} from "@/lib/living-atlas/server/content";
import {
  LIVING_ATLAS_OMAR_DERIVED_PILOT_BANK_ID,
  LIVING_ATLAS_REFERENCE_BANK_ID,
  getLivingAtlasCourseBySlug,
  listLivingAtlasCourses,
  resolveLivingAtlasBankContext,
  resolveLivingAtlasBankContextByVersion,
  resolveLivingAtlasFounderReviewContext,
  resolveLivingAtlasRecallBankContext,
  type LivingAtlasBankContext,
} from "@/lib/living-atlas/server/course-catalog";
import type {
  LivingAtlasAssessmentImagePlacement,
  LivingAtlasAidOutcome,
  LivingAtlasAidType,
  LivingAtlasBankOverview,
  LivingAtlasCachedRunItem,
  LivingAtlasChoice,
  LivingAtlasCommittedAnswer,
  LivingAtlasCompanionProfile,
  LivingAtlasConfidence,
  LivingAtlasCollectible,
  LivingAtlasDashboard,
  LivingAtlasDifficulty,
  LivingAtlasFeedback,
  LivingAtlasLegacySession,
  LivingAtlasFounderQuestion,
  LivingAtlasFounderQuestionPatch,
  LivingAtlasFounderReview,
  LivingAtlasMode,
  LivingAtlasProgress,
  LivingAtlasRecallNavigatorItem,
  LivingAtlasRecallRating,
  LivingAtlasRecallRunView,
  LivingAtlasRecallSessionSummary,
  LivingAtlasRecallSyncPatch,
  LivingAtlasPerformance,
  LivingAtlasResults,
  LivingAtlasRunConfig,
  LivingAtlasRunSummary,
  LivingAtlasRunView,
  LivingAtlasSafeQuestion,
  LivingAtlasSavedSet,
} from "@/lib/living-atlas/types";
import { createAdminClient } from "@/lib/supabase/admin";

export type LivingAtlasActionResult<T> = { ok: true; value: T } | { ok: false; error: string };

type PracticeSessionRow = {
  id: string;
  user_id: string;
  bank_id: string;
  bank_version_id: string | null;
  mode: "tutor" | "exam";
  status: "active" | "completed" | "abandoned";
  current_position: number;
  answered_count: number;
  correct_count: number;
  question_count: number;
  visible_timer: boolean;
  active_time_ms: number;
  filters: unknown;
  started_at: string;
};

type SessionItemRow = {
  session_id: string;
  position: number;
  variant_id: string;
  choice_order: unknown;
  selected_choice: LivingAtlasChoice["id"] | null;
  confidence: LivingAtlasConfidence | null;
  active_time_ms: number;
  committed_at: string | null;
  finalized: boolean;
  variant_revision: number;
};

type QuestionStateRow = {
  variant_id: string;
  attempts: number;
  correct_count: number;
  incorrect_count: number;
  consecutive_correct: number;
  confidence_total: number;
  confidence_count: number;
  last_confidence: LivingAtlasConfidence | null;
  needs_review: boolean;
  manually_flagged: boolean;
  active_echo: boolean;
  knowledge_state: "unseen" | "learning" | "reviewing" | "mastered";
  total_active_time_ms: number;
  echo_repairs: number;
  last_answered_at: string | null;
};

type ResponseRow = {
  session_id: string;
  variant_id: string;
  selected_choice: LivingAtlasChoice["id"];
  is_correct: boolean;
  confidence: LivingAtlasConfidence;
  response_time_ms: number | null;
  answered_at: string;
};

type AidUseRow = {
  id: string;
  session_id: string;
  user_id: string;
  position: number;
  aid_type: LivingAtlasAidType;
  outcome: unknown;
  created_at: string;
};

type RecallSessionRow = {
  id: string;
  user_id: string;
  bank_id: string;
  source_id: string;
  status: "active" | "completed" | "abandoned";
  current_position: number;
  card_count: number;
  rated_count: number;
  visible_timer: boolean;
  active_time_ms: number;
  started_at: string;
};

type RecallSessionItemRow = {
  session_id: string;
  position: number;
  question_id: number;
  revealed_at: string | null;
  rating: LivingAtlasRecallRating | null;
  active_time_ms: number;
};

type RecallStateRow = {
  question_id: number;
  needs_recall: boolean;
  current_state: "new" | "again" | "learning" | "know_it";
};

type RecallSourceQuestionRow = {
  id: number;
  source_id: string;
  source_order: number;
  original_question: string;
  original_answer: string;
  source_image_url: string | null;
  image_placement: string | null;
};

type CompanionProfileRow = {
  user_id: string;
  companion_id: "white-holland-lop";
  chorus_opt_in: boolean;
  equipped_head: string | null;
  equipped_collar: string | null;
  equipped_body: string | null;
  equipped_accessory: string | null;
};

const VALID_CHOICE_IDS = new Set<LivingAtlasChoice["id"]>(["a", "b", "c", "d"]);
const VALID_DIFFICULTIES = new Set<LivingAtlasDifficulty>(["foundational", "application", "advanced"]);
const STUDY_AID_LIMIT = 3;
const CHORUS_MINIMUM_SAMPLE = 20;
const VALID_AID_TYPES = new Set<LivingAtlasAidType>(["prism_split", "atlas_chorus", "rift_turn"]);
const VALID_RECALL_RATINGS = new Set<LivingAtlasRecallRating>(["again", "learning", "know_it"]);

function asError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function isMissingClientRevisionColumn(error: unknown) {
  const candidate = error as { code?: unknown; message?: unknown } | null;
  return candidate?.code === "42703" && typeof candidate.message === "string" && candidate.message.includes("client_revision");
}

function clampInt(value: unknown, fallback: number, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.round(parsed)));
}

async function requireFounder() {
  const { profile, userId } = await getSessionProfile();
  if (!userId || !profile || profile.id !== userId) {
    throw new Error("Sign in with the founder account to access Living Atlas review.");
  }
  if (profile.role !== "owner" || profile.status !== "approved") {
    throw new Error("Living Atlas review is limited to the founder account.");
  }
  return userId;
}

function shuffled<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [result[index], result[swap]] = [result[swap] as T, result[index] as T];
  }
  return result;
}

function normalizeChoiceOrder(value: unknown, question: LivingAtlasRuntimeQuestion) {
  if (Array.isArray(value)) {
    const candidate = value.filter((id): id is LivingAtlasChoice["id"] =>
      typeof id === "string" && VALID_CHOICE_IDS.has(id as LivingAtlasChoice["id"]),
    );
    if (candidate.length === question.choices.length && new Set(candidate).size === question.choices.length) return candidate;
  }
  return question.choices.map((choice) => choice.id);
}

function normalizeConfig(input: LivingAtlasRunConfig): LivingAtlasRunConfig {
  const topics = Array.from(new Set(input.topics.filter((topic) => typeof topic === "string" && topic.length <= 120)));
  const difficulties = Array.from(new Set(input.difficulties.filter((difficulty) => VALID_DIFFICULTIES.has(difficulty))));
  return {
    mode: input.mode === "review" ? "review" : "study",
    length: clampInt(input.length, 5, 1, 1000),
    topics,
    difficulties,
    imageOnly: Boolean(input.imageOnly),
    flaggedOnly: Boolean(input.flaggedOnly),
    repairOnly: Boolean(input.repairOnly),
    unseenOnly: Boolean(input.unseenOnly),
    visibleTimer: Boolean(input.visibleTimer),
  };
}

async function toSafeQuestion(
  question: LivingAtlasRuntimeQuestion,
  choiceOrder: unknown,
  revealImage = false,
  eliminatedChoiceIds: LivingAtlasChoice["id"][] = [],
  signImages = true,
): Promise<LivingAtlasSafeQuestion> {
  const order = normalizeChoiceOrder(choiceOrder, question);
  const choices = order
    .map((id) => question.choices.find((choice) => choice.id === id))
    .filter((choice): choice is LivingAtlasChoice => Boolean(choice))
    .filter((choice) => !eliminatedChoiceIds.includes(choice.id));
  const imagePlacement = question.imagePlacement === "results" ? "none" : question.imagePlacement;
  const images = signImages && (revealImage || imagePlacement === "prompt") && imagePlacement !== "none"
    ? await signQuestionImages(createAdminClient(), question, imagePlacement)
    : [];
  const primaryImage = images.find((image) => image.available) ?? images[0];
  return {
    id: question.id,
    topic: question.taxonomy.topic,
    conceptId: question.taxonomy.conceptId,
    domain: question.taxonomy.domain,
    objective: question.taxonomy.objective,
    difficulty: question.taxonomy.difficulty,
    itemFormat: question.taxonomy.itemFormat as LivingAtlasSafeQuestion["itemFormat"],
    stem: question.stem,
    choices,
    assessmentImagePlacement: imagePlacement,
    choiceOrder: order,
    hasSourceImage: question.media.length > 0,
    imageAvailable: primaryImage?.available ?? false,
    imageUrl: primaryImage?.url ?? null,
    imageCaption: primaryImage?.caption ?? null,
    imagePending: !signImages && question.media.length > 0 && imagePlacement === "prompt",
    images,
  };
}

async function feedbackFor(question: LivingAtlasRuntimeQuestion, selected: LivingAtlasChoice["id"]): Promise<LivingAtlasFeedback> {
  const images = question.imagePlacement === "feedback"
    ? await signQuestionImages(createAdminClient(), question, "feedback")
    : [];
  const primaryImage = images.find((image) => image.available) ?? images[0];
  const learnerFeedback = learnerFacingFeedback(question);
  return {
    correct: selected === question.correctChoiceId,
    selectedChoiceId: selected,
    correctChoiceId: question.correctChoiceId,
    teachingFeedback: learnerFeedback.teachingFeedback,
    choiceFeedback: learnerFeedback.choiceFeedback,
    imageAvailable: primaryImage?.available ?? false,
    imageUrl: primaryImage?.url ?? null,
    imageCaption: primaryImage?.caption ?? null,
    images,
  };
}

function learnerFacingFeedback(question: LivingAtlasRuntimeQuestion) {
  const correctChoice = question.choices.find((choice) => choice.id === question.correctChoiceId);
  const correctText = correctChoice?.text ?? "the keyed answer";
  const sourceProcessLanguage = /source card|keyed response|surrounding .* material|source answer/i;
  const teachingFeedback = sourceProcessLanguage.test(question.teachingFeedback)
    ? /\b(list|some|which of the following|identify)\b/i.test(question.stem) && /[,;]/.test(correctText)
      ? `This is a grouped-recall item. Learn “${correctText}” as one cluster, then practice recognizing each member of that cluster when ${question.taxonomy.topic.toLowerCase()} appears in a new question.`
      : `Build the recall pair: “${question.stem}” → “${correctText}.” Before moving on, say the connection once in your own words so you can recognize the same concept in a differently written question.`
    : question.teachingFeedback;
  const choiceFeedback = Object.fromEntries(question.choices.map((choice) => {
    const original = question.choiceFeedback[choice.id] ?? "";
    if (!sourceProcessLanguage.test(original)) return [choice.id, original];
    return [choice.id, choice.id === question.correctChoiceId
      ? `“${choice.text}” completes the required recall pair for this prompt.`
      : `“${choice.text}” does not answer the relationship being tested here. Contrast it with “${correctText},” then explain why the prompt points to the latter.`];
  })) as Record<LivingAtlasChoice["id"], string>;
  return { teachingFeedback, choiceFeedback };
}

function asRunSummary(row: PracticeSessionRow): LivingAtlasRunSummary {
  return {
    id: row.id,
    bankId: row.bank_id,
    mode: row.mode === "exam" ? "review" : "study",
    status: row.status,
    questionCount: clampInt(row.question_count, 0),
    answeredCount: clampInt(row.answered_count, 0),
    correctCount: clampInt(row.correct_count, 0),
    currentPosition: clampInt(row.current_position, 1, 1),
    activeTimeMs: clampInt(row.active_time_ms, 0),
    visibleTimer: Boolean(row.visible_timer),
    createdAt: row.started_at,
  };
}

async function getSession(userId: string, sessionId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("practice_sessions")
    .select("id, user_id, bank_id, bank_version_id, mode, status, current_position, answered_count, correct_count, question_count, visible_timer, active_time_ms, filters, started_at")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) throw new Error("That Living Atlas study session is unavailable.");
  return data as PracticeSessionRow;
}

async function getQuestionStates(userId: string, variantIds?: string[]) {
  const admin = createAdminClient();
  let query = admin
    .from("practice_question_state")
    .select("variant_id, attempts, correct_count, incorrect_count, consecutive_correct, confidence_total, confidence_count, last_confidence, needs_review, manually_flagged, active_echo, knowledge_state, total_active_time_ms, echo_repairs, last_answered_at")
    .eq("user_id", userId);
  if (variantIds?.length) query = query.in("variant_id", variantIds);
  const { data, error } = await query;
  if (error) throw new Error("Living Atlas progress could not be read.");
  return new Map((data ?? []).map((row) => [row.variant_id, row as QuestionStateRow]));
}

async function refreshProgress(
  userId: string,
  suppliedQuestions?: LivingAtlasRuntimeQuestion[],
  suppliedContext?: LivingAtlasBankContext,
): Promise<LivingAtlasProgress> {
  const admin = createAdminClient();
  const context = suppliedContext ?? await resolveLivingAtlasBankContext(LIVING_ATLAS_REFERENCE_BANK_ID, admin);
  const questions = suppliedQuestions ?? await getBankQuestions(context.bankVersionId, admin);
  const questionById = new Map(questions.map((question) => [question.id, question]));
  const questionIds = questions.map((question) => question.id);
  const [states, responsesResult] = await Promise.all([
    getQuestionStates(userId, questionIds),
    admin
      .from("practice_responses")
      .select("variant_id, is_correct, answered_at")
      .eq("user_id", userId)
      .in("variant_id", questionIds)
      .order("answered_at", { ascending: false })
      .limit(10),
  ]);
  if (responsesResult.error) throw new Error("Living Atlas response history could not be read.");
  const stateValues = Array.from(states.values());
  const attemptedConcepts = new Set(
    stateValues.filter((state) => state.attempts > 0).map((state) => questionById.get(state.variant_id)?.taxonomy.conceptId).filter(Boolean),
  ).size;
  const masteredConcepts = new Set(
    stateValues.filter((state) => state.knowledge_state === "mastered").map((state) => questionById.get(state.variant_id)?.taxonomy.conceptId).filter(Boolean),
  ).size;
  const conceptIds = Array.from(new Set(questions.map((question) => question.taxonomy.conceptId)));
  const recent = responsesResult.data ?? [];
  const recentAccuracy = recent.length ? Math.round((recent.filter((row) => row.is_correct).length / recent.length) * 100) : 0;
  const now = new Date().toISOString();
  const conceptRows = conceptIds.map((conceptId) => {
    const conceptStates = stateValues.filter((state) => questionById.get(state.variant_id)?.taxonomy.conceptId === conceptId);
    const attempts = conceptStates.reduce((sum, state) => sum + state.attempts, 0);
    const correctCount = conceptStates.reduce((sum, state) => sum + state.correct_count, 0);
    const activeEchoes = conceptStates.filter((state) => state.active_echo).length;
    const status = conceptStates.some((state) => state.knowledge_state === "mastered")
      ? "mastered"
      : activeEchoes || conceptStates.some((state) => state.manually_flagged)
        ? "reviewing"
        : attempts
          ? "learning"
          : "unseen";
    return {
      user_id: userId,
      bank_version_id: context.bankVersionId,
      concept_id: conceptId,
      attempts,
      correct_count: correctCount,
      status,
      active_echoes: activeEchoes,
      updated_at: now,
    };
  });
  const { error: conceptError } = await admin
    .from("practice_concept_progress")
    .upsert(conceptRows, { onConflict: "user_id,bank_version_id,concept_id" });
  if (conceptError) throw new Error("Living Atlas concept progress could not be refreshed.");
  const { error: courseConceptError } = await admin
    .from("practice_course_concept_progress")
    .upsert(conceptRows.map((row) => ({
      user_id: row.user_id,
      course_code: context.courseCode,
      concept_id: row.concept_id,
      attempts: row.attempts,
      correct_count: row.correct_count,
      status: row.status,
      active_echoes: row.active_echoes,
      last_miss_at: row.status === "reviewing" ? now : null,
      last_mastered_at: row.status === "mastered" ? now : null,
      updated_at: now,
    })), { onConflict: "user_id,course_code,concept_id" });
  if (courseConceptError) throw new Error("Course-level concept progress could not be refreshed.");
  return {
    coverage: conceptIds.length ? Math.round((attemptedConcepts / conceptIds.length) * 100) : 0,
    recentAccuracy,
    mastery: conceptIds.length ? Math.round((masteredConcepts / conceptIds.length) * 100) : 0,
    activeEchoes: stateValues.filter((state) => state.active_echo).length,
    echoRepairs: stateValues.reduce((sum, state) => sum + state.echo_repairs, 0),
    flaggedQuestions: stateValues.filter((state) => state.manually_flagged).length,
    masteredConcepts,
    attemptedConcepts,
    totalConcepts: conceptIds.length,
  };
}

async function listSessionItems(sessionId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("practice_session_items")
    .select("session_id, position, variant_id, variant_revision, choice_order, selected_choice, confidence, active_time_ms, committed_at, finalized")
    .eq("session_id", sessionId)
    .order("position");
  if (error) throw new Error("The frozen questions for this session could not be restored.");
  return (data ?? []) as SessionItemRow[];
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asAidOutcome(row: AidUseRow): LivingAtlasAidOutcome {
  const outcome = asRecord(row.outcome);
  const eliminatedChoiceIds = Array.isArray(outcome.eliminatedChoiceIds)
    ? outcome.eliminatedChoiceIds.filter((value): value is LivingAtlasChoice["id"] => typeof value === "string" && VALID_CHOICE_IDS.has(value as LivingAtlasChoice["id"]))
    : undefined;
  const chorusSource = asRecord(outcome.chorus);
  const chorus = outcome.chorus && typeof chorusSource.available === "boolean"
    ? {
        available: chorusSource.available,
        sampleSize: clampInt(chorusSource.sampleSize, 0),
        minimumSampleSize: clampInt(chorusSource.minimumSampleSize, CHORUS_MINIMUM_SAMPLE),
        choices: Array.isArray(chorusSource.choices)
          ? chorusSource.choices.flatMap((choice) => {
              const candidate = asRecord(choice);
              const choiceId = candidate.choiceId;
              return typeof choiceId === "string" && VALID_CHOICE_IDS.has(choiceId as LivingAtlasChoice["id"])
                ? [{ choiceId: choiceId as LivingAtlasChoice["id"], percent: clampInt(candidate.percent, 0, 0, 100) }]
                : [];
            })
          : [],
      }
    : undefined;
  return {
    aidType: row.aid_type,
    position: row.position,
    createdAt: row.created_at,
    note: typeof outcome.note === "string" ? outcome.note : "Study aid used.",
    ...(eliminatedChoiceIds?.length ? { eliminatedChoiceIds } : {}),
    ...(typeof outcome.hint === "string" ? { hint: outcome.hint } : {}),
    ...(chorus ? { chorus } : {}),
    ...(typeof outcome.replacedQuestionId === "string" ? { replacedQuestionId: outcome.replacedQuestionId } : {}),
  };
}

async function listSessionAidUses(sessionId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("practice_session_aid_uses")
    .select("id, session_id, user_id, position, aid_type, outcome, created_at")
    .eq("session_id", sessionId)
    .order("created_at");
  if (error) throw new Error("Study aid state could not be restored.");
  return (data ?? []).map((row) => asAidOutcome(row as AidUseRow));
}

function studyAidState(outcomes: LivingAtlasAidOutcome[]) {
  return {
    limit: STUDY_AID_LIMIT,
    used: outcomes.length,
    remaining: Math.max(0, STUDY_AID_LIMIT - outcomes.length),
    outcomes,
  };
}

async function getOrCreateCompanionProfile(userId: string): Promise<CompanionProfileRow> {
  const admin = createAdminClient();
  const { error: createError } = await admin
    .from("practice_companion_profiles")
    .upsert({ user_id: userId, companion_id: LIVING_ATLAS_DEFAULT_COMPANION_ID }, { onConflict: "user_id", ignoreDuplicates: true });
  if (createError) throw new Error("Your companion profile could not be prepared.");
  const { data, error } = await admin
    .from("practice_companion_profiles")
    .select("user_id, companion_id, chorus_opt_in, equipped_head, equipped_collar, equipped_body, equipped_accessory")
    .eq("user_id", userId)
    .single();
  if (error || !data) throw new Error("Your companion profile could not be loaded.");
  return data as CompanionProfileRow;
}

function companionMood(progress: LivingAtlasProgress): LivingAtlasCompanionProfile["mood"] {
  if (progress.activeEchoes > 0) return "concerned";
  if (progress.mastery >= 75) return "celebrating";
  if (progress.attemptedConcepts > 0) return "steady";
  return "curious";
}

function presentCompanion(profile: CompanionProfileRow, progress: LivingAtlasProgress): LivingAtlasCompanionProfile {
  return {
    companionId: LIVING_ATLAS_DEFAULT_COMPANION_ID,
    name: "Lop",
    species: "White Holland Lop",
    mood: companionMood(progress),
    chorusOptIn: profile.chorus_opt_in,
    equipped: {
      head: profile.equipped_head,
      collar: profile.equipped_collar,
      body: profile.equipped_body,
      accessory: profile.equipped_accessory,
    },
  };
}

async function syncLivingAtlasCollectibles(userId: string, questions: LivingAtlasRuntimeQuestion[], suppliedStates?: Map<string, QuestionStateRow>) {
  const admin = createAdminClient();
  const states = suppliedStates ?? await getQuestionStates(userId, questions.map((question) => question.id));
  const stateValues = Array.from(states.values());
  const attempted = stateValues.filter((state) => state.attempts > 0);
  const mastered = stateValues.filter((state) => state.knowledge_state === "mastered");
  const totalDomains = new Set(questions.map((question) => question.taxonomy.domain));
  const attemptedDomains = new Set(attempted.map((state) => questions.find((question) => question.id === state.variant_id)?.taxonomy.domain).filter(Boolean));
  const totalConcepts = new Set(questions.map((question) => question.taxonomy.conceptId));
  const attemptedConcepts = new Set(attempted.map((state) => questions.find((question) => question.id === state.variant_id)?.taxonomy.conceptId).filter(Boolean));
  const awards = [
    attempted.length ? { collectible_id: "first-survey", source_event: "first_concept_attempt" } : null,
    mastered.length ? { collectible_id: "first-insight", source_event: "first_mastered_concept" } : null,
    stateValues.some((state) => state.echo_repairs > 0) ? { collectible_id: "echo-gardener", source_event: "first_echo_repair" } : null,
    totalDomains.size > 0 && attemptedDomains.size === totalDomains.size ? { collectible_id: "domain-cartographer", source_event: "all_released_domains_surveyed" } : null,
    totalConcepts.size > 0 && attemptedConcepts.size === totalConcepts.size ? { collectible_id: "archive-keeper", source_event: "all_released_concepts_attempted" } : null,
  ].filter(Boolean).map((award) => ({ user_id: userId, ...award!, metadata: {} }));
  if (!awards.length) return;
  const { error } = await admin
    .from("practice_collectible_unlocks")
    .upsert(awards, { onConflict: "user_id,collectible_id", ignoreDuplicates: true });
  if (error) throw new Error("Your collectible cabinet could not be updated.");
}

async function presentRun(userId: string, session: PracticeSessionRow, includeCache = false): Promise<LivingAtlasRunView> {
  if (!session.bank_version_id) throw new Error("This study session is missing its frozen bank version.");
  const context = await resolveLivingAtlasBankContextByVersion(session.bank_version_id, createAdminClient());
  const items = await listSessionItems(session.id);
  const frozenQuestions = await getFrozenBankQuestions(items, createAdminClient());
  const currentQuestions = await getBankQuestions(context.bankVersionId, createAdminClient());
  const [states, progress, aidOutcomes] = await Promise.all([
    getQuestionStates(userId, currentQuestions.map((question) => question.id)),
    refreshProgress(userId, currentQuestions, context),
    listSessionAidUses(session.id),
  ]);
  const current = items.find((item) => item.position === session.current_position) ?? null;
  const question = current ? frozenQuestions.get(current.variant_id) ?? null : null;
  const currentAidOutcomes = current ? aidOutcomes.filter((outcome) => outcome.position === current.position) : [];
  const eliminatedChoiceIds = currentAidOutcomes.flatMap((outcome) => outcome.eliminatedChoiceIds ?? []);
  const feedback = question && current?.finalized && session.mode === "tutor" && current.selected_choice
    ? await feedbackFor(question, current.selected_choice)
    : null;
  const navigator = items.map((item) => ({
    position: item.position,
    questionId: item.variant_id,
    answered: Boolean(item.selected_choice),
    committed: item.finalized,
    flagged: states.get(item.variant_id)?.manually_flagged ?? false,
    activeEcho: states.get(item.variant_id)?.active_echo ?? false,
  }));
  const cachedItems: LivingAtlasCachedRunItem[] = includeCache
    ? await Promise.all(items.map(async (item) => {
        const cachedQuestion = frozenQuestions.get(item.variant_id);
        if (!cachedQuestion) throw new Error("A frozen practice problem could not be cached.");
        const itemAidOutcomes = aidOutcomes.filter((outcome) => outcome.position === item.position);
        const cachedEliminatedChoiceIds = itemAidOutcomes.flatMap((outcome) => outcome.eliminatedChoiceIds ?? []);
        const navigation = navigator.find((candidate) => candidate.position === item.position)!;
        return {
          ...navigation,
          question: await toSafeQuestion(cachedQuestion, item.choice_order, false, cachedEliminatedChoiceIds, false),
          selectedChoiceId: item.selected_choice,
          confidence: item.confidence,
          activeTimeMs: clampInt(item.active_time_ms, 0),
        };
      }))
    : [];
  return {
    run: asRunSummary(session),
    courseTitle: context.courseTitle,
    bankTitle: context.bankTitle,
    question: question && current ? await toSafeQuestion(question, current.choice_order, Boolean(feedback), eliminatedChoiceIds) : null,
    selectedChoiceId: current?.selected_choice ?? null,
    confidence: current?.confidence ?? null,
    itemActiveTimeMs: clampInt(current?.active_time_ms, 0),
    alreadyCommitted: Boolean(current?.finalized),
    manuallyFlagged: current ? states.get(current.variant_id)?.manually_flagged ?? false : false,
    activeEcho: current ? states.get(current.variant_id)?.active_echo ?? false : false,
    feedback,
    aids: studyAidState(aidOutcomes),
    navigator,
    cachedItems,
    progress,
  };
}

async function activeSessionFor(userId: string, bankId: string, bankVersionId?: string) {
  const admin = createAdminClient();
  let query = admin
    .from("practice_sessions")
    .select("id, user_id, bank_id, bank_version_id, mode, status, current_position, answered_count, correct_count, question_count, visible_timer, active_time_ms, filters, started_at")
    .eq("user_id", userId)
    .eq("bank_id", bankId)
    .eq("status", "active")
    .order("updated_at", { ascending: false });
  if (bankVersionId) query = query.eq("bank_version_id", bankVersionId);
  const { data, error } = await query
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("The active Living Atlas session could not be checked.");
  return data ? asRunSummary(data as PracticeSessionRow) : null;
}

function sourceLabel(source: { platform?: string | null; author?: string | null }) {
  if (source.author && source.platform) return `${source.author}'s ${source.platform}`;
  return source.platform ?? source.author ?? null;
}

function asRecallSessionSummary(row: RecallSessionRow): LivingAtlasRecallSessionSummary {
  return {
    id: row.id,
    bankId: row.bank_id,
    status: row.status,
    cardCount: clampInt(row.card_count, 0),
    ratedCount: clampInt(row.rated_count, 0),
    currentPosition: clampInt(row.current_position, 1, 1),
    activeTimeMs: clampInt(row.active_time_ms, 0),
    visibleTimer: Boolean(row.visible_timer),
    createdAt: row.started_at,
  };
}

async function getRecallSession(userId: string, sessionId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("practice_recall_sessions")
    .select("id, user_id, bank_id, source_id, status, current_position, card_count, rated_count, visible_timer, active_time_ms, started_at")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) throw new Error("That Recall Practice session is unavailable.");
  return data as RecallSessionRow;
}

async function listRecallSessionItems(sessionId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("practice_recall_session_items")
    .select("session_id, position, question_id, revealed_at, rating, active_time_ms")
    .eq("session_id", sessionId)
    .order("position");
  if (error) throw new Error("The frozen recall cards could not be restored.");
  return (data ?? []) as RecallSessionItemRow[];
}

async function getRecallSourceQuestions(sourceId: string, questionIds?: number[]) {
  const admin = createAdminClient();
  let query = admin
    .from("practice_questions")
    .select("id, source_id, source_order, original_question, original_answer, source_image_url, image_placement")
    .eq("source_id", sourceId)
    .order("source_order");
  if (questionIds?.length) query = query.in("id", questionIds);
  const { data, error } = await query;
  if (error) throw new Error("The preserved source cards could not be loaded.");
  return (data ?? []) as RecallSourceQuestionRow[];
}

async function getRecallStates(userId: string, questionIds: number[]) {
  if (!questionIds.length) return new Map<number, RecallStateRow>();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("practice_recall_state")
    .select("question_id, needs_recall, current_state")
    .eq("user_id", userId)
    .in("question_id", questionIds);
  if (error) throw new Error("Recall Repair state could not be loaded.");
  return new Map((data ?? []).map((row) => [Number(row.question_id), row as RecallStateRow]));
}

async function signRecallImage(question: RecallSourceQuestionRow, revealAnswerImage: boolean) {
  const imagePlacement = question.image_placement === "prompt" ? "prompt" : question.image_placement === "answer" ? "answer" : "none";
  if (!question.source_image_url || (imagePlacement === "answer" && !revealAnswerImage)) {
    return { imagePlacement, imageAvailable: false, imageUrl: null, imageCaption: null } as const;
  }
  const admin = createAdminClient();
  const { data: asset, error } = await admin
    .from("practice_media_assets")
    .select("storage_bucket, storage_path, cache_status")
    .eq("source_url", question.source_image_url)
    .eq("cache_status", "cached")
    .limit(1)
    .maybeSingle();
  if (error || !asset?.storage_path) {
    return { imagePlacement, imageAvailable: false, imageUrl: null, imageCaption: null } as const;
  }
  const { data: signed, error: signError } = await admin.storage
    .from(asset.storage_bucket)
    .createSignedUrl(asset.storage_path, 60 * 10);
  return {
    imagePlacement,
    imageAvailable: !signError && Boolean(signed?.signedUrl),
    imageUrl: !signError ? signed?.signedUrl ?? null : null,
    imageCaption: "Private source-linked reference image",
  } as const;
}

async function activeRecallSessionFor(userId: string, bankId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("practice_recall_sessions")
    .select("id, user_id, bank_id, source_id, status, current_position, card_count, rated_count, visible_timer, active_time_ms, started_at")
    .eq("user_id", userId)
    .eq("bank_id", bankId)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("The active Recall Practice session could not be checked.");
  return data ? asRecallSessionSummary(data as RecallSessionRow) : null;
}

async function presentRecallRun(userId: string, session: RecallSessionRow): Promise<LivingAtlasRecallRunView> {
  const [context, items] = await Promise.all([
    resolveLivingAtlasRecallBankContext(session.bank_id, createAdminClient()),
    listRecallSessionItems(session.id),
  ]);
  const questionIds = items.map((item) => item.question_id);
  const [states, sourceQuestions] = await Promise.all([
    getRecallStates(userId, questionIds),
    getRecallSourceQuestions(session.source_id, questionIds),
  ]);
  const sourceById = new Map(sourceQuestions.map((question) => [question.id, question]));
  // Recall is authenticated source learning, not scored assessment delivery. Cache the
  // private session deck here so a learner can flip locally with Space instead of waiting
  // on a network round trip. Test Mode keeps answer keys out of its client payload.
  const cachedCards = (await Promise.all(items.map(async (item) => {
    const source = sourceById.get(item.question_id);
    if (!source) throw new Error("A frozen recall source card is unavailable.");
    const image = await signRecallImage(source, true);
    return {
      position: item.position,
      card: {
        id: String(source.id),
        sourceOrder: source.source_order,
        prompt: source.original_question,
        hasImage: Boolean(source.source_image_url),
        imagePlacement: image.imagePlacement,
        imageAvailable: image.imageAvailable,
        imageUrl: image.imageUrl,
        imageCaption: image.imageCaption,
      },
      reveal: {
        answer: source.original_answer,
        imageAvailable: image.imageAvailable,
        imageUrl: image.imageUrl,
        imageCaption: image.imageCaption,
      },
      revealed: Boolean(item.revealed_at),
      rating: item.rating,
      needsRecall: states.get(item.question_id)?.needs_recall ?? false,
      activeTimeMs: clampInt(item.active_time_ms, 0),
    };
  }))).sort((left, right) => left.position - right.position);
  const navigator: LivingAtlasRecallNavigatorItem[] = items.map((item) => ({
    position: item.position,
    questionId: String(item.question_id),
    revealed: Boolean(item.revealed_at),
    rating: item.rating,
    needsRecall: states.get(item.question_id)?.needs_recall ?? false,
  }));
  return {
    session: asRecallSessionSummary(session),
    courseTitle: context.courseTitle,
    bankTitle: context.bankTitle,
    cachedCards,
    navigator,
    repairCount: Array.from(states.values()).filter((state) => state.needs_recall).length,
  };
}

function isPlayableBankStatus(status: string) {
  return status === "review" || status === "published";
}

async function getCourseDashboard(userId: string, course: Awaited<ReturnType<typeof getLivingAtlasCourseBySlug>>): Promise<LivingAtlasDashboard> {
  const admin = createAdminClient();
  const [catalog, sourceResult, bankResult] = await Promise.all([
    listLivingAtlasCourses(admin),
    admin
      .from("practice_course_sources")
      .select("source_id, status, sort_order, practice_sources!inner(id, deck, source_url, source_card_count, platform, author)")
      .eq("course_code", course.courseCode)
      .order("sort_order"),
    admin
      .from("practice_banks")
      .select("id, source_id, course_code, title, bank_kind, provenance, status, source_card_count, question_count")
      .neq("status", "archived"),
  ]);
  if (sourceResult.error || bankResult.error) throw new Error("The course question-bank shelf could not be loaded.");
  const allBankRows = bankResult.data ?? [];
  const bankRows = allBankRows.filter((bank) => bank.course_code === course.courseCode);
  const playableBankRows = bankRows.filter((bank) => isPlayableBankStatus(bank.status));
  const testBankRows = playableBankRows.filter((bank) => bank.bank_kind !== "recall_practice" && bank.provenance === "fourth_canal_original");
  const courseCards = catalog.map((catalogCourse) => {
    const courseBanks = allBankRows.filter((bank) => bank.course_code === catalogCourse.courseCode);
    return {
      code: catalogCourse.courseCode,
      slug: catalogCourse.courseSlug,
      title: catalogCourse.courseTitle,
      academicYear: catalogCourse.academicYear,
      term: catalogCourse.term,
      status: catalogCourse.status,
      description: catalogCourse.description,
      bankCount: courseBanks.length,
      playableBankCount: courseBanks.filter((bank) => isPlayableBankStatus(bank.status)).length,
    };
  });
  const firstPlayable = testBankRows[0];
  const context = firstPlayable ? await resolveLivingAtlasBankContext(firstPlayable.id, admin) : null;
  const questions = context ? await getBankQuestions(context.bankVersionId, admin) : [];
  const questionIds = questions.map((question) => question.id);
  const [progress, activeRun, states, responseResult] = context
    ? await Promise.all([
        refreshProgress(userId, questions, context),
        activeSessionFor(userId, context.bankId, context.bankVersionId),
        getQuestionStates(userId, questionIds),
        admin.from("practice_responses").select("variant_id, is_correct, response_time_ms, answered_at").eq("user_id", userId).in("variant_id", questionIds).order("answered_at", { ascending: false }),
      ])
    : [{ coverage: 0, recentAccuracy: 0, mastery: 0, activeEchoes: 0, echoRepairs: 0, flaggedQuestions: 0, masteredConcepts: 0, attemptedConcepts: 0, totalConcepts: 0 }, null, new Map<string, QuestionStateRow>(), { data: [], error: null }];
  if (responseResult.error) throw new Error("Course response history could not be loaded.");
  const responses = responseResult.data ?? [];
  const attempted = new Set(responses.map((row) => row.variant_id)).size;
  const recent = responses.slice(0, 10);
  const averageTimeMs = responses.length ? Math.round(responses.reduce((sum, row) => sum + (row.response_time_ms ?? 0), 0) / responses.length) : 0;
  const sourceRows = (sourceResult.data ?? []).map((row) => ({
    sourceId: row.source_id as string,
    sourceStatus: row.status as string,
    source: Array.isArray(row.practice_sources) ? row.practice_sources[0] : row.practice_sources,
  }));
  const banks = sourceRows.flatMap((row) => {
    const source = row.source as { id: string; deck: string; source_url: string | null; source_card_count: number; platform: string | null; author: string | null } | null;
    if (!source) return [];
    const bank = bankRows.find((candidate) => candidate.source_id === source.id);
    const playable = Boolean(bank && isPlayableBankStatus(bank.status));
    return [{
      id: bank?.id ?? source.id,
      title: source.deck,
      sourceCardCount: source.source_card_count,
      sourceUrl: source.source_url,
      sourceLabel: sourceLabel(source),
      playable,
      deliveryKind: bank?.bank_kind === "recall_practice" ? "recall" as const : "test" as const,
      reviewQuestionCount: playable ? bank?.question_count ?? source.source_card_count : 0,
      attemptedQuestions: playable && bank?.id === context?.bankId ? attempted : 0,
      recentAccuracy: playable && bank?.id === context?.bankId && recent.length ? Math.round((recent.filter((row) => row.is_correct).length / recent.length) * 100) : 0,
      averageTimeMs: playable && bank?.id === context?.bankId ? averageTimeMs : 0,
      activeEchoes: playable && bank?.id === context?.bankId ? Array.from(states.values()).filter((state) => state.active_echo).length : 0,
      masteredConcepts: playable && bank?.id === context?.bankId ? progress.masteredConcepts : 0,
    }];
  });
  return {
    course: courseCards.find((item) => item.code === course.courseCode),
    courses: courseCards,
    banks,
    progress,
    activeRun,
  };
}

export async function getLivingAtlasDashboard(): Promise<LivingAtlasActionResult<LivingAtlasDashboard>> {
  try {
    const userId = await requireFounder();
    const course = (await listLivingAtlasCourses()).find((item) => item.courseCode === "REHE 151");
    if (!course) throw new Error("The Dental Anatomy course catalog is unavailable.");
    return { ok: true, value: await getCourseDashboard(userId, course) };
  } catch (error) {
    return { ok: false, error: asError(error, "Living Atlas is unavailable.") };
  }
}

export async function getLivingAtlasCourseDashboard(courseSlug: string): Promise<LivingAtlasActionResult<LivingAtlasDashboard>> {
  try {
    const userId = await requireFounder();
    const course = await getLivingAtlasCourseBySlug(courseSlug);
    return { ok: true, value: await getCourseDashboard(userId, course) };
  } catch (error) {
    return { ok: false, error: asError(error, "That course is unavailable.") };
  }
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] ?? null : Math.round(((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2);
}

function emptyProgress(): LivingAtlasProgress {
  return {
    coverage: 0,
    recentAccuracy: 0,
    mastery: 0,
    activeEchoes: 0,
    echoRepairs: 0,
    flaggedQuestions: 0,
    masteredConcepts: 0,
    attemptedConcepts: 0,
    totalConcepts: 0,
  };
}

async function presentCollectibles(userId: string): Promise<LivingAtlasCollectible[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("practice_collectible_unlocks")
    .select("collectible_id, unlocked_at")
    .eq("user_id", userId);
  if (error) throw new Error("Your collectible cabinet could not be loaded.");
  const unlocked = new Map((data ?? []).map((item) => [item.collectible_id, item.unlocked_at]));
  return LIVING_ATLAS_COLLECTIBLES.map((collectible) => ({
    ...collectible,
    unlockedAt: unlocked.get(collectible.id) ?? null,
    locked: !unlocked.has(collectible.id),
  }));
}

export async function getLivingAtlasPerformance(): Promise<LivingAtlasActionResult<LivingAtlasPerformance>> {
  try {
    const userId = await requireFounder();
    const admin = createAdminClient();
    const [profile, testBankResult] = await Promise.all([
      getOrCreateCompanionProfile(userId),
      admin
        .from("practice_banks")
        .select("id")
        .eq("provenance", "fourth_canal_original")
        .in("status", ["review", "published"])
        .neq("bank_kind", "recall_practice")
        .limit(1)
        .maybeSingle(),
    ]);
    if (testBankResult.error) throw new Error("The current Test Mode catalog could not be loaded.");
    if (!testBankResult.data) {
      const progress = emptyProgress();
      return {
        ok: true,
        value: {
          companion: presentCompanion(profile, progress),
          progress,
          recentPaceMs: null,
          personalBaselineMs: null,
          recentAccuracy: 0,
          collectibles: await presentCollectibles(userId),
          nextAction: {
            label: "Recall preserved cards",
            detail: "Test Mode unlocks only after original MCQs are authored and reviewed.",
            href: "/games/living-atlas",
          },
        },
      };
    }
    const context = await resolveLivingAtlasBankContext(testBankResult.data.id, admin);
    const currentQuestions = await getBankQuestions(context.bankVersionId, admin);
    const [states, sessionsResult] = await Promise.all([
      getQuestionStates(userId, currentQuestions.map((question) => question.id)),
      admin
        .from("practice_sessions")
        .select("id, active_time_ms, answered_count, completed_at")
        .eq("user_id", userId)
        .eq("bank_id", context.bankId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(6),
    ]);
    if (sessionsResult.error) throw new Error("Your field pace could not be loaded.");
    await syncLivingAtlasCollectibles(userId, currentQuestions, states);
    const progress = await refreshProgress(userId, currentQuestions, context);
    const collectibles = await presentCollectibles(userId);
    const paces = (sessionsResult.data ?? [])
      .filter((session) => session.answered_count > 0)
      .map((session) => Math.round(session.active_time_ms / session.answered_count));
    const recentPaceMs = paces[0] ?? null;
    const personalBaselineMs = median(paces.slice(1, 6));
    const nextAction = progress.activeEchoes > 0
      ? {
          label: "Repair Echoes",
          detail: `${progress.activeEchoes} active Echo${progress.activeEchoes === 1 ? "" : "es"} need another pass.`,
          href: `/games/living-atlas/banks/${context.bankId}?queue=echoes`,
        }
      : progress.coverage < 100
        ? {
            label: "Survey new concepts",
            detail: `${progress.totalConcepts - progress.attemptedConcepts} released concept${progress.totalConcepts - progress.attemptedConcepts === 1 ? "" : "s"} remain unseen.`,
            href: `/games/living-atlas/banks/${context.bankId}`,
          }
        : {
            label: "Build a focused run",
            detail: "Use flags, pace, and concept status to choose the next field session.",
            href: `/games/living-atlas/banks/${context.bankId}`,
          };
    return {
      ok: true,
      value: {
        companion: presentCompanion(profile, progress),
        progress,
        recentPaceMs,
        personalBaselineMs,
        recentAccuracy: progress.recentAccuracy,
        collectibles,
        nextAction,
      },
    };
  } catch (error) {
    return { ok: false, error: asError(error, "Your Living Atlas field profile is unavailable.") };
  }
}

export async function setLivingAtlasChorusConsent(enabled: boolean): Promise<LivingAtlasActionResult<LivingAtlasCompanionProfile>> {
  try {
    const userId = await requireFounder();
    const profile = await getOrCreateCompanionProfile(userId);
    const admin = createAdminClient();
    const { error } = await admin
      .from("practice_companion_profiles")
      .update({ chorus_opt_in: Boolean(enabled), updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    if (error) throw new Error("Atlas Chorus consent could not be saved.");
    revalidatePath("/games/living-atlas/performance");
    return { ok: true, value: presentCompanion({ ...profile, chorus_opt_in: Boolean(enabled) }, emptyProgress()) };
  } catch (error) {
    return { ok: false, error: asError(error, "Atlas Chorus consent could not be saved.") };
  }
}

export async function getLivingAtlasBank(bankId: string): Promise<LivingAtlasActionResult<LivingAtlasBankOverview>> {
  try {
    const userId = await requireFounder();
    const admin = createAdminClient();
    const { data: bankRow, error: bankLookupError } = await admin
      .from("practice_banks")
      .select("id, bank_kind, provenance, status")
      .eq("id", bankId)
      .maybeSingle();
    if (bankLookupError || !bankRow || !isPlayableBankStatus(bankRow.status)) {
      return { ok: false, error: "That practice bank is not playable yet." };
    }
    if (bankRow.bank_kind === "recall_practice") {
      const context = await resolveLivingAtlasRecallBankContext(bankId, admin);
      const [sourceCards, activeRecallSession] = await Promise.all([
        getRecallSourceQuestions(context.sourceId),
        activeRecallSessionFor(userId, bankId),
      ]);
      const recallStates = await getRecallStates(userId, sourceCards.map((card) => card.id));
      const ratedCount = Array.from(recallStates.values()).filter((state) => state.current_state !== "new").length;
      const repairCount = Array.from(recallStates.values()).filter((state) => state.needs_recall).length;
      const { data: sources, error: sourceError } = await admin
        .from("practice_bank_sources")
        .select("source_role, practice_sources!inner(deck, source_url, source_card_count, platform, author)")
        .eq("bank_id", bankId)
        .eq("source_role", "included")
        .limit(1);
      const source = sources?.[0]?.practice_sources;
      const includedSource = Array.isArray(source) ? source[0] : source;
      if (sourceError || !includedSource) throw new Error("The recall source could not be loaded.");
      return {
        ok: true,
        value: {
          id: bankId,
          courseSlug: context.courseSlug,
          courseTitle: context.courseTitle,
          bankKind: "recall_practice",
          deliveryKind: "recall",
          title: context.bankTitle,
          subtitle: "Preserved source cards · Recall Practice",
          sourceUrl: includedSource.source_url,
          sourceLabel: sourceLabel(includedSource),
          sourceCardCount: context.sourceCardCount,
          reviewQuestionCount: context.sourceCardCount,
          imageQuestionCount: sourceCards.filter((card) => card.source_image_url).length,
          topics: [],
          difficulties: [],
          progress: { coverage: 0, recentAccuracy: 0, mastery: 0, activeEchoes: 0, echoRepairs: 0, flaggedQuestions: 0, masteredConcepts: 0, attemptedConcepts: 0, totalConcepts: 0 },
          activeRun: null,
          activeRecallSession,
          recallRatedCount: ratedCount,
          recallRepairCount: repairCount,
          savedSets: [],
          reviewSummary: { bankVersionId: "source-recall", bankVersion: 1, bankStatus: "review_required", total: 0, reviewRequired: 0, changesRequested: 0, approved: 0, rejected: 0, imageSupported: sourceCards.filter((card) => card.source_image_url).length },
        },
      };
    }
    const context = await resolveLivingAtlasBankContext(bankId, admin);
    if (!isPlayableBankStatus(context.bankStatus)) return { ok: false, error: "That question bank is not playable yet." };
    const currentQuestions = await getBankQuestions(context.bankVersionId, admin);
    const [{ data: sources, error: sourceError }, { data: savedSets, error: setsError }, progress, activeRun] = await Promise.all([
      admin
        .from("practice_bank_sources")
        .select("source_role, practice_sources!inner(deck, source_url, source_card_count, platform, author)")
        .eq("bank_id", bankId)
        .eq("source_role", "included")
        .order("source_id")
        .limit(1),
      admin.from("practice_saved_sets").select("id, name, config, created_at").eq("user_id", userId).eq("bank_id", bankId).order("updated_at", { ascending: false }),
      refreshProgress(userId, currentQuestions, context),
      activeSessionFor(userId, bankId, context.bankVersionId),
    ]);
    const source = sources?.[0]?.practice_sources;
    const includedSource = Array.isArray(source) ? source[0] : source;
    if (sourceError || setsError || !includedSource) throw new Error("The practice-bank source could not be loaded.");
    return {
      ok: true,
      value: {
        id: bankId,
        courseSlug: context.courseSlug,
        courseTitle: context.courseTitle,
        bankKind: context.bankKind,
        deliveryKind: "test",
        title: context.bankTitle,
        subtitle: context.provenance === "fourth_canal_original"
          ? "Fourth Canal original assessment"
          : "Founder-approved source-derived practice problems",
        sourceUrl: includedSource.source_url,
        sourceLabel: sourceLabel(includedSource),
        sourceCardCount: context.sourceCardCount,
        reviewQuestionCount: currentQuestions.length,
        imageQuestionCount: currentQuestions.filter((question) => question.media.length > 0).length,
        topics: Array.from(new Set(currentQuestions.map((question) => question.taxonomy.topic))).sort(),
        difficulties: Array.from(new Set(currentQuestions.map((question) => question.taxonomy.difficulty))),
        progress,
        activeRun,
        activeRecallSession: null,
        recallRatedCount: 0,
        recallRepairCount: 0,
        savedSets: (savedSets ?? []).map((row) => ({
          id: row.id,
          name: row.name,
          config: normalizeConfig(row.config as LivingAtlasRunConfig),
          createdAt: row.created_at,
        })),
        reviewSummary: countReviewStatuses(currentQuestions, {
          bankVersionId: context.bankVersionId,
          bankVersion: context.bankVersion,
          bankStatus: context.bankVersionStatus,
        }),
      },
    };
  } catch (error) {
    return { ok: false, error: asError(error, "That practice bank is unavailable.") };
  }
}

export async function createLivingAtlasRecallSession(bankId: string): Promise<LivingAtlasActionResult<{ sessionId: string }>> {
  try {
    const userId = await requireFounder();
    const admin = createAdminClient();
    const context = await resolveLivingAtlasRecallBankContext(bankId, admin);
    const existing = await activeRecallSessionFor(userId, bankId);
    if (existing) return { ok: true, value: { sessionId: existing.id } };
    const sourceCards = await getRecallSourceQuestions(context.sourceId);
    if (!sourceCards.length) return { ok: false, error: "This source deck has no captured cards yet." };
    const { data: session, error: sessionError } = await admin
      .from("practice_recall_sessions")
      .insert({
        user_id: userId,
        bank_id: context.bankId,
        source_id: context.sourceId,
        card_count: sourceCards.length,
        filters: { delivery: "recall", sourceVersion: "immutable-source-v1" },
      })
      .select("id")
      .single();
    if (sessionError || !session) throw new Error("The Recall Practice session could not be created.");
    const { error: itemsError } = await admin
      .from("practice_recall_session_items")
      .insert(sourceCards.map((card, index) => ({ session_id: session.id, position: index + 1, question_id: card.id })));
    if (itemsError) throw new Error("The source cards could not be frozen for recall.");
    revalidatePath(`/games/living-atlas/banks/${bankId}`);
    return { ok: true, value: { sessionId: session.id } };
  } catch (error) {
    return { ok: false, error: asError(error, "The Recall Practice session could not be created.") };
  }
}

export async function getLivingAtlasRecallSession(sessionId: string): Promise<LivingAtlasActionResult<LivingAtlasRecallRunView>> {
  try {
    const userId = await requireFounder();
    const session = await getRecallSession(userId, sessionId);
    return { ok: true, value: await presentRecallRun(userId, session) };
  } catch (error) {
    return { ok: false, error: asError(error, "The Recall Practice session could not be loaded.") };
  }
}

async function saveRecallItem(
  session: RecallSessionRow,
  input: { position: number; activeTimeMs: number; nextPosition?: number; reveal?: boolean; rating?: LivingAtlasRecallRating },
) {
  const admin = createAdminClient();
  const items = await listRecallSessionItems(session.id);
  const item = items.find((candidate) => candidate.position === input.position);
  if (!item) throw new Error("That source card is not part of this Recall Practice session.");
  if (input.rating && !VALID_RECALL_RATINGS.has(input.rating)) throw new Error("That recall rating is invalid.");
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    active_time_ms: Math.max(item.active_time_ms, clampInt(input.activeTimeMs, 0)),
    updated_at: now,
  };
  if (input.reveal) patch.revealed_at = item.revealed_at ?? now;
  if (input.rating) {
    patch.rating = input.rating;
    patch.rated_at = now;
  }
  const { data, error } = await admin
    .from("practice_recall_session_items")
    .update(patch)
    .eq("session_id", session.id)
    .eq("position", input.position)
    .select("session_id, position, question_id, revealed_at, rating, active_time_ms")
    .single();
  if (error || !data) throw new Error("The recall card could not be saved.");
  if (input.rating) {
    const { data: previous, error: previousError } = await admin
      .from("practice_recall_state")
      .select("again_count, learning_count, know_it_count")
      .eq("user_id", session.user_id)
      .eq("question_id", item.question_id)
      .maybeSingle();
    if (previousError) throw new Error("Recall Repair state could not be updated.");
    const { error: stateError } = await admin.from("practice_recall_state").upsert({
      user_id: session.user_id,
      question_id: item.question_id,
      again_count: (previous?.again_count ?? 0) + (input.rating === "again" ? 1 : 0),
      learning_count: (previous?.learning_count ?? 0) + (input.rating === "learning" ? 1 : 0),
      know_it_count: (previous?.know_it_count ?? 0) + (input.rating === "know_it" ? 1 : 0),
      current_state: input.rating,
      needs_recall: input.rating !== "know_it",
      last_rated_at: now,
      updated_at: now,
    }, { onConflict: "user_id,question_id" });
    if (stateError) throw new Error("Recall Repair state could not be saved.");
  }
  const updatedItems = await listRecallSessionItems(session.id);
  const nextPosition = clampInt(input.nextPosition ?? session.current_position, session.current_position, 1, session.card_count);
  const { error: sessionError } = await admin
    .from("practice_recall_sessions")
    .update({
      current_position: nextPosition,
      rated_count: updatedItems.filter((candidate) => candidate.rating).length,
      active_time_ms: updatedItems.reduce((sum, candidate) => sum + candidate.active_time_ms, 0),
      paused_at: null,
      updated_at: now,
    })
    .eq("id", session.id)
    .eq("user_id", session.user_id);
  if (sessionError) throw new Error("Recall position could not be saved.");
  return data as RecallSessionItemRow;
}

export async function syncLivingAtlasRecallSession(input: {
  sessionId: string;
  currentPosition: number;
  patches: LivingAtlasRecallSyncPatch[];
}): Promise<LivingAtlasActionResult<{ ratedCount: number; repairCount: number }>> {
  try {
    const userId = await requireFounder();
    const session = await getRecallSession(userId, input.sessionId);
    if (session.status !== "active") return { ok: false, error: "This Recall Practice session is no longer active." };
    if (!Array.isArray(input.patches) || input.patches.length > session.card_count) return { ok: false, error: "That recall update is invalid." };

    const seenPositions = new Set<number>();
    for (const patch of input.patches) {
      if (!Number.isInteger(patch.position) || patch.position < 1 || patch.position > session.card_count || seenPositions.has(patch.position)) {
        return { ok: false, error: "That recall card is invalid." };
      }
      if (patch.rating && !VALID_RECALL_RATINGS.has(patch.rating)) return { ok: false, error: "That recall rating is invalid." };
      seenPositions.add(patch.position);
    }

    const admin = createAdminClient();
    const items = await listRecallSessionItems(session.id);
    const itemsByPosition = new Map(items.map((item) => [item.position, item]));
    const now = new Date().toISOString();
    for (const patch of input.patches) {
      const item = itemsByPosition.get(patch.position);
      if (!item) return { ok: false, error: "That source card is not part of this Recall Practice session." };
      if (patch.rating && !item.revealed_at && patch.revealed !== true) return { ok: false, error: "Reveal the preserved answer before rating recall." };

      const update: Record<string, unknown> = {
        active_time_ms: Math.max(item.active_time_ms, clampInt(patch.activeTimeMs, 0)),
        updated_at: now,
      };
      if (patch.revealed === true) update.revealed_at = item.revealed_at ?? now;
      if (patch.revealed === false) update.revealed_at = null;
      if (patch.rating) {
        update.rating = patch.rating;
        update.rated_at = now;
      }
      const { error: itemError } = await admin
        .from("practice_recall_session_items")
        .update(update)
        .eq("session_id", session.id)
        .eq("position", patch.position);
      if (itemError) throw new Error("The recall card could not be saved.");

      if (patch.rating) {
        const { data: previous, error: previousError } = await admin
          .from("practice_recall_state")
          .select("again_count, learning_count, know_it_count, current_state")
          .eq("user_id", session.user_id)
          .eq("question_id", item.question_id)
          .maybeSingle();
        if (previousError) throw new Error("Recall Repair state could not be updated.");
        const ratingChanged = item.rating !== patch.rating;
        const { error: stateError } = await admin.from("practice_recall_state").upsert({
          user_id: session.user_id,
          question_id: item.question_id,
          again_count: (previous?.again_count ?? 0) + (ratingChanged && patch.rating === "again" ? 1 : 0),
          learning_count: (previous?.learning_count ?? 0) + (ratingChanged && patch.rating === "learning" ? 1 : 0),
          know_it_count: (previous?.know_it_count ?? 0) + (ratingChanged && patch.rating === "know_it" ? 1 : 0),
          current_state: patch.rating,
          needs_recall: patch.rating !== "know_it",
          last_rated_at: now,
          updated_at: now,
        }, { onConflict: "user_id,question_id" });
        if (stateError) throw new Error("Recall Repair state could not be saved.");
      }
    }

    const updatedItems = await listRecallSessionItems(session.id);
    const currentPosition = clampInt(input.currentPosition, session.current_position, 1, session.card_count);
    const { error: sessionError } = await admin
      .from("practice_recall_sessions")
      .update({
        current_position: currentPosition,
        rated_count: updatedItems.filter((item) => item.rating).length,
        active_time_ms: updatedItems.reduce((sum, item) => sum + item.active_time_ms, 0),
        paused_at: null,
        updated_at: now,
      })
      .eq("id", session.id)
      .eq("user_id", session.user_id);
    if (sessionError) throw new Error("Recall position could not be saved.");

    const states = await getRecallStates(userId, updatedItems.map((item) => item.question_id));
    return {
      ok: true,
      value: {
        ratedCount: updatedItems.filter((item) => item.rating).length,
        repairCount: Array.from(states.values()).filter((state) => state.needs_recall).length,
      },
    };
  } catch (error) {
    return { ok: false, error: asError(error, "The recall progress could not be saved.") };
  }
}

export async function saveAndExitLivingAtlasRecall(input: { sessionId: string; activeTimeMs: number }): Promise<LivingAtlasActionResult<{ bankId: string }>> {
  try {
    const userId = await requireFounder();
    const session = await getRecallSession(userId, input.sessionId);
    await saveRecallItem(session, { position: session.current_position, activeTimeMs: input.activeTimeMs });
    const admin = createAdminClient();
    const { error } = await admin.from("practice_recall_sessions").update({ paused_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", session.id).eq("user_id", userId);
    if (error) throw new Error("The Recall Practice session could not be saved.");
    return { ok: true, value: { bankId: session.bank_id } };
  } catch (error) {
    return { ok: false, error: asError(error, "The Recall Practice session could not be saved.") };
  }
}

export async function finishLivingAtlasRecall(input: { sessionId: string; activeTimeMs: number }): Promise<LivingAtlasActionResult<{ status: "completed" | "abandoned" }>> {
  try {
    const userId = await requireFounder();
    const session = await getRecallSession(userId, input.sessionId);
    await saveRecallItem(session, { position: session.current_position, activeTimeMs: input.activeTimeMs });
    const items = await listRecallSessionItems(session.id);
    const status = items.some((item) => item.rating) ? "completed" : "abandoned";
    const admin = createAdminClient();
    const { error } = await admin.from("practice_recall_sessions").update({
      status,
      rated_count: items.filter((item) => item.rating).length,
      active_time_ms: items.reduce((sum, item) => sum + item.active_time_ms, 0),
      completed_at: new Date().toISOString(),
      paused_at: null,
      updated_at: new Date().toISOString(),
    }).eq("id", session.id).eq("user_id", userId);
    if (error) throw new Error("The Recall Practice session could not be finished.");
    revalidatePath(`/games/living-atlas/banks/${session.bank_id}`);
    return { ok: true, value: { status } };
  } catch (error) {
    return { ok: false, error: asError(error, "The Recall Practice session could not be finished.") };
  }
}

export async function getLivingAtlasLegacySessions(): Promise<LivingAtlasActionResult<LivingAtlasLegacySession[]>> {
  try {
    const userId = await requireFounder();
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("practice_sessions")
      .select("id, bank_id, status, answered_count, completed_at, started_at, practice_banks!inner(title)")
      .eq("user_id", userId)
      .eq("metric_scope", "legacy")
      .order("updated_at", { ascending: false });
    if (error) throw new Error("The Legacy record could not be loaded.");
    return {
      ok: true,
      value: (data ?? []).map((row) => {
        const bank = Array.isArray(row.practice_banks) ? row.practice_banks[0] : row.practice_banks;
        return {
          id: row.id,
          bankId: row.bank_id,
          bankTitle: bank?.title ?? "Retired source conversion",
          status: row.status === "completed" ? "completed" : "abandoned",
          answeredCount: row.answered_count,
          completedAt: row.completed_at,
          recordedAt: row.started_at,
        };
      }),
    };
  } catch (error) {
    return { ok: false, error: asError(error, "The Legacy record is unavailable.") };
  }
}

function selectQuestions(questions: LivingAtlasRuntimeQuestion[]) {
  return questions;
}

export async function createLivingAtlasRun(
  input: LivingAtlasRunConfig,
  bankId = LIVING_ATLAS_REFERENCE_BANK_ID,
): Promise<LivingAtlasActionResult<{ runId: string }>> {
  try {
    const userId = await requireFounder();
    const requestedConfig = normalizeConfig(input);
    const admin = createAdminClient();
    const context = await resolveLivingAtlasBankContext(bankId, admin);
    const currentQuestions = await getBankQuestions(context.bankVersionId, admin);
    const existing = await activeSessionFor(userId, context.bankId, context.bankVersionId);
    if (existing) return { ok: false, error: "Resume or finish your current session before starting another." };
    const { error: retireError } = await admin.from("practice_sessions").update({
      status: "abandoned",
      completed_at: new Date().toISOString(),
      paused_at: null,
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId).eq("bank_id", context.bankId).eq("status", "active").neq("bank_version_id", context.bankVersionId);
    if (retireError) throw new Error("An older saved bank version could not be closed.");
    const selected = selectQuestions(currentQuestions);
    const config = { ...requestedConfig, length: selected.length, topics: [], difficulties: [], imageOnly: false, flaggedOnly: false, repairOnly: false, unseenOnly: false };
    if (!selected.length) return { ok: false, error: "This bank does not contain any playable practice problems." };
    const { data: session, error: sessionError } = await admin
      .from("practice_sessions")
      .insert({
        user_id: userId,
        bank_id: context.bankId,
        bank_version_id: context.bankVersionId,
        mode: config.mode === "review" ? "exam" : "tutor",
        filters: config,
        question_count: selected.length,
        visible_timer: config.visibleTimer,
      })
      .select("id")
      .single();
    if (sessionError || !session) throw new Error("The study session could not be created.");
    const { error: itemsError } = await admin.from("practice_session_items").insert(selected.map((question, index) => ({
      session_id: session.id,
      position: index + 1,
      variant_id: question.id,
      variant_revision: question.revision,
      choice_order: shuffled(question.choices.map((choice) => choice.id)),
    })));
    if (itemsError) throw new Error("The selected practice problems could not be frozen for this session.");
    revalidatePath("/games/living-atlas");
    return { ok: true, value: { runId: session.id } };
  } catch (error) {
    return { ok: false, error: asError(error, "The study session could not be created.") };
  }
}

export async function getLivingAtlasRun(runId: string): Promise<LivingAtlasActionResult<LivingAtlasRunView>> {
  try {
    const userId = await requireFounder();
    let session = await getSession(userId, runId);
    if (session.status === "active" && session.bank_version_id) {
      const admin = createAdminClient();
      const context = await resolveLivingAtlasBankContextByVersion(session.bank_version_id, admin);
      const [questions, items] = await Promise.all([getBankQuestions(context.bankVersionId, admin), listSessionItems(session.id)]);
      const included = new Set(items.map((item) => item.variant_id));
      const missing = questions.filter((question) => !included.has(question.id));
      if (missing.length) {
        const start = items.length;
        const { error: itemError } = await admin.from("practice_session_items").insert(missing.map((question, index) => ({
          session_id: session.id,
          position: start + index + 1,
          variant_id: question.id,
          variant_revision: question.revision,
          choice_order: shuffled(question.choices.map((choice) => choice.id)),
        })));
        if (itemError) throw new Error("The complete bank could not be attached to this saved workspace.");
        const config = normalizeConfig({ ...(session.filters as LivingAtlasRunConfig), length: questions.length, topics: [], difficulties: [], imageOnly: false, flaggedOnly: false, repairOnly: false, unseenOnly: false });
        const { error: sessionError } = await admin.from("practice_sessions").update({ question_count: questions.length, filters: config, updated_at: new Date().toISOString() }).eq("id", session.id).eq("user_id", userId);
        if (sessionError) throw new Error("The complete bank workspace could not be saved.");
        session = await getSession(userId, runId);
      }
    }
    return { ok: true, value: await presentRun(userId, session, true) };
  } catch (error) {
    return { ok: false, error: asError(error, "The study session could not be loaded.") };
  }
}

/**
 * Saves only learner-owned draft state. The runner keeps the safe question deck
 * in browser memory, so this action intentionally never rebuilds or returns it.
 */
export async function syncLivingAtlasRun(input: {
  runId: string;
  revision: number;
  currentPosition: number;
  mode: LivingAtlasMode;
  visibleTimer: boolean;
  patches: Array<{
    position: number;
    selectedChoiceId: LivingAtlasChoice["id"] | null;
    confidence: LivingAtlasConfidence | null;
    activeTimeMs: number;
  }>;
}): Promise<LivingAtlasActionResult<{ revision: number }>> {
  try {
    const userId = await requireFounder();
    const session = await getSession(userId, input.runId);
    if (session.status !== "active") return { ok: false, error: "This session is no longer active." };
    const revision = clampInt(input.revision, 0, 1, 2_147_483_647);
    if (!revision) return { ok: false, error: "This browser save is missing its revision." };
    if (input.patches.length > 128) return { ok: false, error: "This browser save is too large. Please reload the session." };

    const mode: LivingAtlasMode = input.mode === "review" ? "review" : "study";
    const items = await listSessionItems(session.id);
    if (mode === "review" && session.mode === "tutor" && items.some((item) => item.finalized)) {
      return { ok: false, error: "Review at end cannot be enabled after an explanation has already been revealed." };
    }

    const itemByPosition = new Map(items.map((item) => [item.position, item]));
    const patches = input.patches.map((patch) => ({
      ...patch,
      position: clampInt(patch.position, 0, 1, session.question_count),
      activeTimeMs: clampInt(patch.activeTimeMs, 0, 0, 2_147_483_647),
    })).filter((patch) => itemByPosition.has(patch.position));
    if (patches.some((patch) => patch.confidence !== null && ![1, 2, 3].includes(patch.confidence))) {
      return { ok: false, error: "That confidence value is invalid." };
    }
    const selectedItems = patches.flatMap((patch) => {
      const item = itemByPosition.get(patch.position);
      return patch.selectedChoiceId && item && !item.finalized ? [item] : [];
    });
    const frozenQuestions = selectedItems.length ? await getFrozenBankQuestions(selectedItems, createAdminClient()) : new Map<string, LivingAtlasRuntimeQuestion>();
    for (const patch of patches) {
      const item = itemByPosition.get(patch.position)!;
      if (item.finalized) continue;
      if (patch.selectedChoiceId && !VALID_CHOICE_IDS.has(patch.selectedChoiceId)) {
        return { ok: false, error: "That answer choice is invalid." };
      }
      if (patch.selectedChoiceId) {
        const question = frozenQuestions.get(item.variant_id);
        if (!question?.choices.some((choice) => choice.id === patch.selectedChoiceId)) {
          return { ok: false, error: "That answer is not available for this question format." };
        }
      }
    }

    const admin = createAdminClient();
    let revisionGuardAvailable = true;
    for (const patch of patches) {
      const item = itemByPosition.get(patch.position)!;
      if (item.finalized) continue;
      const draftPatch = {
        selected_choice: patch.selectedChoiceId,
        confidence: patch.confidence,
        active_time_ms: Math.max(item.active_time_ms, patch.activeTimeMs),
        updated_at: new Date().toISOString(),
      };
      if (revisionGuardAvailable) {
        const { error } = await admin
          .from("practice_session_items")
          .update({ ...draftPatch, client_revision: revision })
          .eq("session_id", session.id)
          .eq("position", patch.position)
          .lt("client_revision", revision);
        if (isMissingClientRevisionColumn(error)) revisionGuardAvailable = false;
        else if (error) throw new Error("Your selected answer could not be saved.");
      }
      if (!revisionGuardAvailable) {
        const { error } = await admin
          .from("practice_session_items")
          .update(draftPatch)
          .eq("session_id", session.id)
          .eq("position", patch.position);
        if (error) throw new Error("Your selected answer could not be saved.");
      }
    }

    const config = normalizeConfig({ ...(session.filters as LivingAtlasRunConfig), mode, visibleTimer: Boolean(input.visibleTimer) });
    const sessionPatch = {
      current_position: clampInt(input.currentPosition, session.current_position, 1, session.question_count),
      mode: mode === "review" ? "exam" : "tutor",
      visible_timer: Boolean(input.visibleTimer),
      filters: config,
      paused_at: null,
      updated_at: new Date().toISOString(),
    };
    if (revisionGuardAvailable) {
      const { error } = await admin
        .from("practice_sessions")
        .update({ ...sessionPatch, client_revision: revision })
        .eq("id", session.id)
        .eq("user_id", userId)
        .lt("client_revision", revision);
      if (isMissingClientRevisionColumn(error)) revisionGuardAvailable = false;
      else if (error) throw new Error("Your browser save could not be recorded.");
    }
    if (!revisionGuardAvailable) {
      const { error } = await admin
        .from("practice_sessions")
        .update(sessionPatch)
        .eq("id", session.id)
        .eq("user_id", userId);
      if (error) throw new Error("Your browser save could not be recorded.");
    }
    return { ok: true, value: { revision } };
  } catch (error) {
    return { ok: false, error: asError(error, "Your browser save could not be recorded.") };
  }
}

/** Signs at most the active image plus its neighbors; source URLs and answer
 * material remain private even while the question deck itself is preloaded. */
export async function getLivingAtlasRunPromptMedia(input: {
  runId: string;
  positions: number[];
}): Promise<LivingAtlasActionResult<Array<{
  position: number;
  questionId: string;
  images: LivingAtlasSafeQuestion["images"];
  imageAvailable: boolean;
  imageUrl: string | null;
  imageCaption: string | null;
}>>> {
  try {
    const userId = await requireFounder();
    const session = await getSession(userId, input.runId);
    const positions = Array.from(new Set(input.positions.map((position) => clampInt(position, 0, 1, session.question_count))))
      .filter((position) => position > 0)
      .slice(0, 3);
    const items = (await listSessionItems(session.id)).filter((item) => positions.includes(item.position));
    const questions = await getFrozenBankQuestions(items, createAdminClient());
    const media = await Promise.all(items.map(async (item) => {
      const question = questions.get(item.variant_id);
      if (!question) throw new Error("A question image could not be prepared.");
      const safe = await toSafeQuestion(question, item.choice_order, false, [], true);
      return {
        position: item.position,
        questionId: item.variant_id,
        images: safe.images,
        imageAvailable: safe.imageAvailable,
        imageUrl: safe.imageUrl,
        imageCaption: safe.imageCaption,
      };
    }));
    return { ok: true, value: media };
  } catch (error) {
    return { ok: false, error: asError(error, "Question media could not be loaded.") };
  }
}

export async function updateLivingAtlasRunSettings(input: {
  runId: string;
  mode: LivingAtlasMode;
  visibleTimer: boolean;
}): Promise<LivingAtlasActionResult<LivingAtlasRunView>> {
  try {
    const userId = await requireFounder();
    const session = await getSession(userId, input.runId);
    if (session.status !== "active") return { ok: false, error: "This session is no longer active." };
    const mode: LivingAtlasMode = input.mode === "review" ? "review" : "study";
    const items = await listSessionItems(session.id);
    if (mode === "review" && items.some((item) => item.finalized)) {
      return { ok: false, error: "Review at end cannot be enabled after an explanation has already been revealed." };
    }
    const config = normalizeConfig({ ...(session.filters as LivingAtlasRunConfig), mode, visibleTimer: Boolean(input.visibleTimer) });
    const admin = createAdminClient();
    const { error } = await admin.from("practice_sessions").update({
      mode: mode === "review" ? "exam" : "tutor",
      visible_timer: Boolean(input.visibleTimer),
      filters: config,
      updated_at: new Date().toISOString(),
    }).eq("id", session.id).eq("user_id", userId);
    if (error) throw new Error("The practice settings could not be saved.");
    return { ok: true, value: await presentRun(userId, await getSession(userId, session.id)) };
  } catch (error) {
    return { ok: false, error: asError(error, "The practice settings could not be saved.") };
  }
}

async function saveItem(
  session: PracticeSessionRow,
  input: { position: number; selectedChoiceId: LivingAtlasChoice["id"] | null; confidence: LivingAtlasConfidence | null; activeTimeMs: number },
) {
  const admin = createAdminClient();
  const items = await listSessionItems(session.id);
  const item = items.find((candidate) => candidate.position === input.position);
  if (!item) throw new Error("That practice problem is not part of this session.");
  if (item.finalized) return item;
  if (input.selectedChoiceId && !VALID_CHOICE_IDS.has(input.selectedChoiceId)) throw new Error("That answer choice is invalid.");
  if (input.selectedChoiceId) {
    const frozen = await getFrozenBankQuestions([item], admin);
    const question = frozen.get(item.variant_id);
    if (!question?.choices.some((choice) => choice.id === input.selectedChoiceId)) {
      throw new Error("That answer is not available for this question format.");
    }
  }
  if (input.confidence && ![1, 2, 3].includes(input.confidence)) throw new Error("That confidence value is invalid.");
  const { data, error } = await admin
    .from("practice_session_items")
    .update({
      selected_choice: input.selectedChoiceId,
      confidence: input.confidence,
      active_time_ms: Math.max(item.active_time_ms, clampInt(input.activeTimeMs, 0)),
      updated_at: new Date().toISOString(),
    })
    .eq("session_id", session.id)
    .eq("position", input.position)
    .select("session_id, position, variant_id, variant_revision, choice_order, selected_choice, confidence, active_time_ms, committed_at, finalized")
    .single();
  if (error || !data) throw new Error("Your selected answer could not be saved.");
  return data as SessionItemRow;
}

export async function saveLivingAtlasDraft(input: {
  runId: string;
  position: number;
  selectedChoiceId: LivingAtlasChoice["id"] | null;
  confidence: LivingAtlasConfidence | null;
  activeTimeMs: number;
  nextPosition?: number;
}): Promise<LivingAtlasActionResult<LivingAtlasRunView>> {
  try {
    const userId = await requireFounder();
    const session = await getSession(userId, input.runId);
    if (session.status !== "active") return { ok: false, error: "This session is no longer active." };
    await saveItem(session, input);
    const nextPosition = clampInt(input.nextPosition ?? input.position, input.position, 1, session.question_count);
    const admin = createAdminClient();
    const { error } = await admin.from("practice_sessions").update({
      current_position: nextPosition,
      paused_at: null,
      updated_at: new Date().toISOString(),
    }).eq("id", session.id).eq("user_id", userId);
    if (error) throw new Error("Your current position could not be saved.");
    return { ok: true, value: await presentRun(userId, await getSession(userId, session.id)) };
  } catch (error) {
    return { ok: false, error: asError(error, "Your progress could not be saved.") };
  }
}

async function recordResponse(userId: string, session: PracticeSessionRow, item: SessionItemRow, question: LivingAtlasRuntimeQuestion) {
  if (!question || !item.selected_choice || !item.confidence) throw new Error("Choose an answer and confidence before checking it.");
  const correct = item.selected_choice === question.correctChoiceId;
  const admin = createAdminClient();
  const { error: responseError } = await admin.from("practice_responses").upsert({
    session_id: session.id,
    user_id: userId,
    variant_id: item.variant_id,
    selected_choice: item.selected_choice,
    is_correct: correct,
    confidence: item.confidence,
    response_time_ms: clampInt(item.active_time_ms, 0, 0, 2_147_483_647),
    answered_at: new Date().toISOString(),
  }, { onConflict: "session_id,variant_id" });
  if (responseError) throw new Error("Your answer could not be graded.");

  const states = await getQuestionStates(userId, [item.variant_id]);
  const previous = states.get(item.variant_id);
  const confidentCorrect = correct && item.confidence === 3;
  const consecutiveCorrect = correct ? (previous?.consecutive_correct ?? 0) + 1 : 0;
  const activeEcho = !correct || item.confidence === 1;
  const echoRepaired = Boolean(previous?.active_echo && correct && item.confidence > 1);
  const knowledgeState = activeEcho
    ? "reviewing"
    : confidentCorrect && consecutiveCorrect >= 2
      ? "mastered"
      : "learning";
  const { error: stateError } = await admin.from("practice_question_state").upsert({
    user_id: userId,
    variant_id: item.variant_id,
    attempts: (previous?.attempts ?? 0) + 1,
    correct_count: (previous?.correct_count ?? 0) + (correct ? 1 : 0),
    incorrect_count: (previous?.incorrect_count ?? 0) + (correct ? 0 : 1),
    consecutive_correct: consecutiveCorrect,
    confidence_total: (previous?.confidence_total ?? 0) + item.confidence,
    confidence_count: (previous?.confidence_count ?? 0) + 1,
    last_confidence: item.confidence,
    needs_review: activeEcho,
    manually_flagged: previous?.manually_flagged ?? false,
    active_echo: activeEcho,
    knowledge_state: knowledgeState,
    total_active_time_ms: (previous?.total_active_time_ms ?? 0) + item.active_time_ms,
    echo_repairs: (previous?.echo_repairs ?? 0) + (echoRepaired ? 1 : 0),
    last_answered_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,variant_id" });
  if (stateError) throw new Error("Your learning state could not be updated.");
  return { question, correct, activeEcho };
}

async function recountSession(userId: string, session: PracticeSessionRow) {
  const admin = createAdminClient();
  const [{ data: responses, error: responseError }, items] = await Promise.all([
    admin.from("practice_responses").select("is_correct").eq("session_id", session.id).eq("user_id", userId),
    listSessionItems(session.id),
  ]);
  if (responseError) throw new Error("The session score could not be refreshed.");
  const answered = (responses ?? []).length;
  const correct = (responses ?? []).filter((response) => response.is_correct).length;
  const activeTime = items.reduce((sum, item) => sum + item.active_time_ms, 0);
  const { error } = await admin.from("practice_sessions").update({
    answered_count: answered,
    correct_count: correct,
    active_time_ms: activeTime,
    updated_at: new Date().toISOString(),
  }).eq("id", session.id).eq("user_id", userId);
  if (error) throw new Error("The session summary could not be refreshed.");
}

export async function commitLivingAtlasAnswer(input: {
  runId: string;
  position: number;
  selectedChoiceId: LivingAtlasChoice["id"] | null;
  confidence: LivingAtlasConfidence | null;
  activeTimeMs: number;
}): Promise<LivingAtlasActionResult<LivingAtlasCommittedAnswer>> {
  try {
    const userId = await requireFounder();
    const session = await getSession(userId, input.runId);
    if (session.status !== "active" || session.mode !== "tutor") return { ok: false, error: "This answer cannot be checked now." };
    const saved = await saveItem(session, input);
    let feedback: LivingAtlasFeedback;
    let activeEcho = false;
    if (!saved.finalized) {
      const frozenQuestions = await getFrozenBankQuestions([saved], createAdminClient());
      const question = frozenQuestions.get(saved.variant_id);
      if (!question) throw new Error("The frozen question could not be graded.");
      const graded = await recordResponse(userId, session, saved, question);
      activeEcho = graded.activeEcho;
      feedback = await feedbackFor(question, saved.selected_choice!);
      const admin = createAdminClient();
      const { error } = await admin.from("practice_session_items").update({
        finalized: true,
        committed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("session_id", session.id).eq("position", saved.position);
      if (error) throw new Error("The answer confirmation could not be saved.");
    } else {
      const frozenQuestions = await getFrozenBankQuestions([saved], createAdminClient());
      const question = frozenQuestions.get(saved.variant_id);
      if (!question || !saved.selected_choice) throw new Error("The frozen answer could not be restored.");
      const state = (await getQuestionStates(userId, [saved.variant_id])).get(saved.variant_id);
      activeEcho = state?.active_echo ?? false;
      feedback = await feedbackFor(question, saved.selected_choice);
    }
    return {
      ok: true,
      value: {
        position: saved.position,
        selectedChoiceId: saved.selected_choice!,
        activeEcho,
        feedback,
      },
    };
  } catch (error) {
    return { ok: false, error: asError(error, "The answer could not be checked.") };
  }
}

async function atlasChorusSnapshot(
  admin: ReturnType<typeof createAdminClient>,
  question: LivingAtlasRuntimeQuestion,
  bankVersionId: string,
) {
  const unavailable = (sampleSize = 0) => ({
    available: false,
    sampleSize,
    minimumSampleSize: CHORUS_MINIMUM_SAMPLE,
    choices: [] as Array<{ choiceId: LivingAtlasChoice["id"]; percent: number }>,
  });
  const { data: version, error: versionError } = await admin
    .from("practice_bank_versions")
    .select("status")
    .eq("id", bankVersionId)
    .maybeSingle();
  if (versionError || version?.status !== "approved" || question.reviewStatus !== "approved") return unavailable();

  const { data: optedIn, error: consentError } = await admin
    .from("practice_companion_profiles")
    .select("user_id")
    .eq("chorus_opt_in", true);
  if (consentError) throw new Error("Atlas Chorus consent could not be checked.");
  const userIds = (optedIn ?? []).map((profile) => profile.user_id);
  if (!userIds.length) return unavailable();

  const { data: sessions, error: sessionError } = await admin
    .from("practice_sessions")
    .select("id, user_id")
    .eq("bank_version_id", bankVersionId)
    .eq("status", "completed")
    .in("user_id", userIds);
  if (sessionError) throw new Error("Atlas Chorus sessions could not be checked.");
  const sessionIds = (sessions ?? []).map((session) => session.id);
  if (!sessionIds.length) return unavailable();

  const sessionUser = new Map((sessions ?? []).map((session) => [session.id, session.user_id]));
  const { data: responses, error: responseError } = await admin
    .from("practice_responses")
    .select("session_id, selected_choice, answered_at")
    .eq("variant_id", question.id)
    .in("session_id", sessionIds)
    .order("answered_at", { ascending: true });
  if (responseError) throw new Error("Atlas Chorus signals could not be checked.");
  const firstResponseByUser = new Map<string, LivingAtlasChoice["id"]>();
  for (const response of responses ?? []) {
    const userId = sessionUser.get(response.session_id);
    const choice = response.selected_choice as LivingAtlasChoice["id"];
    if (userId && VALID_CHOICE_IDS.has(choice) && !firstResponseByUser.has(userId)) firstResponseByUser.set(userId, choice);
  }
  const sampleSize = firstResponseByUser.size;
  if (sampleSize < CHORUS_MINIMUM_SAMPLE) return unavailable(sampleSize);
  return {
    available: true,
    sampleSize,
    minimumSampleSize: CHORUS_MINIMUM_SAMPLE,
    choices: question.choices.map((choice) => ({
      choiceId: choice.id,
      percent: Math.round((Array.from(firstResponseByUser.values()).filter((selected) => selected === choice.id).length / sampleSize) * 100),
    })),
  };
}

export async function useLivingAtlasStudyAid(input: {
  runId: string;
  position: number;
  aidType: LivingAtlasAidType;
}): Promise<LivingAtlasActionResult<LivingAtlasRunView>> {
  try {
    const userId = await requireFounder();
    if (!VALID_AID_TYPES.has(input.aidType)) return { ok: false, error: "That study aid is not recognized." };
    const session = await getSession(userId, input.runId);
    if (session.status !== "active" || session.mode !== "tutor") return { ok: false, error: "Study aids are available only during a Study session." };
    if (session.current_position !== input.position) return { ok: false, error: "Return to the current question before using an aid." };

    const [items, usedAids] = await Promise.all([listSessionItems(session.id), listSessionAidUses(session.id)]);
    if (usedAids.length >= STUDY_AID_LIMIT) return { ok: false, error: "All three Study aids have already been used in this session." };
    if (usedAids.some((aid) => aid.aidType === input.aidType)) return { ok: false, error: "Each Study aid can be used only once per session." };
    const item = items.find((candidate) => candidate.position === input.position);
    if (!item || item.finalized) return { ok: false, error: "Study aids must be used before an answer is committed." };
    const admin = createAdminClient();
    const frozenQuestions = await getFrozenBankQuestions(items, admin);
    const question = frozenQuestions.get(item.variant_id);
    if (!question) throw new Error("The frozen question could not be loaded for this aid.");

    let outcome: Record<string, unknown>;
    if (input.aidType === "prism_split") {
      if (question.choices.length !== 4 || question.taxonomy.itemFormat === "true_false") {
        return { ok: false, error: "Prism Split is available only for four-choice questions." };
      }
      const eliminatedChoiceIds = shuffled(question.choices.filter((choice) => choice.id !== question.correctChoiceId).map((choice) => choice.id)).slice(0, 2);
      outcome = { note: "Prism Split concealed two distractors.", eliminatedChoiceIds };
    } else if (input.aidType === "atlas_chorus") {
      if (!session.bank_version_id) throw new Error("This study session is missing its frozen bank version.");
      const chorus = await atlasChorusSnapshot(admin, question, session.bank_version_id);
      outcome = {
        note: chorus.available
          ? `Atlas Chorus received ${chorus.sampleSize} anonymous first-answer signals.`
          : `Guild signal is still forming. Atlas Chorus opens after ${chorus.minimumSampleSize} opted-in learners answer this approved question.`,
        chorus,
      };
    } else {
      if (item.selected_choice) return { ok: false, error: "Rift Turn is available before choosing an answer." };
      const candidates = items.filter((candidate) => candidate.position !== item.position && !candidate.finalized && !candidate.selected_choice);
      const equivalent = candidates.filter((candidate) => {
        const candidateQuestion = frozenQuestions.get(candidate.variant_id);
        return candidateQuestion?.taxonomy.domain === question.taxonomy.domain
          && candidateQuestion.taxonomy.difficulty === question.taxonomy.difficulty;
      });
      const replacementItem = (equivalent.length ? equivalent : candidates)[0];
      if (!replacementItem) return { ok: false, error: "Every other problem already has work saved, so Rift Turn cannot move this one safely." };
      const replacement = frozenQuestions.get(replacementItem.variant_id);
      if (!replacement) throw new Error("The Rift Turn replacement could not be loaded.");
      const temporaryPosition = session.question_count + 1;
      const { error: moveCurrentError } = await admin.from("practice_session_items").update({ position: temporaryPosition, updated_at: new Date().toISOString() }).eq("session_id", session.id).eq("position", item.position);
      if (moveCurrentError) throw new Error("Rift Turn could not move this problem.");
      const { error: moveReplacementError } = await admin.from("practice_session_items").update({ position: item.position, updated_at: new Date().toISOString() }).eq("session_id", session.id).eq("position", replacementItem.position);
      if (moveReplacementError) {
        await admin.from("practice_session_items").update({ position: item.position }).eq("session_id", session.id).eq("position", temporaryPosition);
        throw new Error("Rift Turn could not move the replacement problem.");
      }
      const { error: moveSkippedError } = await admin.from("practice_session_items").update({ position: replacementItem.position, updated_at: new Date().toISOString() }).eq("session_id", session.id).eq("position", temporaryPosition);
      if (moveSkippedError) throw new Error("Rift Turn moved the replacement but could not place the skipped problem later.");
      outcome = { note: "Rift Turn moved this problem later and brought forward an equivalent unanswered problem.", replacedQuestionId: replacement.id, skippedQuestionId: question.id };
    }

    const { error: aidError } = await admin.from("practice_session_aid_uses").insert({
      session_id: session.id,
      user_id: userId,
      position: item.position,
      aid_type: input.aidType,
      outcome,
    });
    if (aidError) {
      if (aidError.message.includes("aid_limit")) return { ok: false, error: "All three Study aids have already been used in this session." };
      throw new Error("That study aid could not be saved.");
    }
    revalidatePath(`/games/living-atlas/runs/${session.id}`);
    return { ok: true, value: await presentRun(userId, await getSession(userId, session.id)) };
  } catch (error) {
    return { ok: false, error: asError(error, "That study aid is unavailable right now.") };
  }
}

export async function setLivingAtlasFlag(
  questionId: string,
  flagged: boolean,
  bankId = LIVING_ATLAS_REFERENCE_BANK_ID,
): Promise<LivingAtlasActionResult<LivingAtlasProgress>> {
  try {
    const userId = await requireFounder();
    const admin = createAdminClient();
    const context = await resolveLivingAtlasBankContext(bankId, admin);
    const currentQuestions = await getBankQuestions(context.bankVersionId, admin);
    if (!currentQuestions.some((question) => question.id === questionId)) return { ok: false, error: "That practice problem is not recognized." };
    const states = await getQuestionStates(userId, [questionId]);
    const previous = states.get(questionId);
    const now = new Date().toISOString();
    const { error: stateError } = await admin.from("practice_question_state").upsert({
      user_id: userId,
      variant_id: questionId,
      attempts: previous?.attempts ?? 0,
      correct_count: previous?.correct_count ?? 0,
      incorrect_count: previous?.incorrect_count ?? 0,
      consecutive_correct: previous?.consecutive_correct ?? 0,
      confidence_total: previous?.confidence_total ?? 0,
      confidence_count: previous?.confidence_count ?? 0,
      last_confidence: previous?.last_confidence ?? null,
      needs_review: previous?.needs_review ?? false,
      manually_flagged: flagged,
      active_echo: previous?.active_echo ?? false,
      knowledge_state: previous?.knowledge_state ?? "unseen",
      total_active_time_ms: previous?.total_active_time_ms ?? 0,
      echo_repairs: previous?.echo_repairs ?? 0,
      last_answered_at: previous?.last_answered_at ?? null,
      updated_at: now,
    }, { onConflict: "user_id,variant_id" });
    const { error: flagError } = await admin.from("practice_flags").upsert({
      user_id: userId,
      variant_id: questionId,
      flagged,
      updated_at: now,
    }, { onConflict: "user_id,variant_id" });
    if (stateError || flagError) throw new Error("The flag could not be updated.");
    return { ok: true, value: await refreshProgress(userId, currentQuestions, context) };
  } catch (error) {
    return { ok: false, error: asError(error, "The flag could not be updated.") };
  }
}

export async function saveAndExitLivingAtlas(input: {
  runId: string;
  position: number;
  selectedChoiceId: LivingAtlasChoice["id"] | null;
  confidence: LivingAtlasConfidence | null;
  activeTimeMs: number;
}): Promise<LivingAtlasActionResult<{ bankId: string }>> {
  try {
    const userId = await requireFounder();
    const session = await getSession(userId, input.runId);
    if (session.status !== "active") return { ok: false, error: "This session is no longer active." };
    await saveItem(session, input);
    const admin = createAdminClient();
    const items = await listSessionItems(session.id);
    const { error } = await admin.from("practice_sessions").update({
      current_position: input.position,
      active_time_ms: items.reduce((sum, item) => sum + item.active_time_ms, 0),
      paused_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", session.id).eq("user_id", userId);
    if (error) throw new Error("The session could not be paused.");
    revalidatePath("/games/living-atlas");
    return { ok: true, value: { bankId: session.bank_id } };
  } catch (error) {
    return { ok: false, error: asError(error, "The session could not be saved for later.") };
  }
}

export async function finishLivingAtlasRun(input: {
  runId: string;
  position: number;
  selectedChoiceId: LivingAtlasChoice["id"] | null;
  confidence: LivingAtlasConfidence | null;
  activeTimeMs: number;
}): Promise<LivingAtlasActionResult<{ status: "completed" | "abandoned" }>> {
  try {
    const userId = await requireFounder();
    const session = await getSession(userId, input.runId);
    if (session.status !== "active") return { ok: true, value: { status: session.status === "completed" ? "completed" : "abandoned" } };
    await saveItem(session, input);
    const items = await listSessionItems(session.id);
    if (session.mode === "exam") {
      const frozenQuestions = await getFrozenBankQuestions(items, createAdminClient());
      for (const item of items.filter((candidate) => candidate.selected_choice && candidate.confidence && !candidate.finalized)) {
        const question = frozenQuestions.get(item.variant_id);
        if (!question) throw new Error("The frozen question could not be graded.");
        await recordResponse(userId, session, item, question);
      }
      const admin = createAdminClient();
      const { error: finalizeError } = await admin.from("practice_session_items").update({
        finalized: true,
        committed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("session_id", session.id).not("selected_choice", "is", null);
      if (finalizeError) throw new Error("The review-at-end answers could not be finalized.");
    }
    await recountSession(userId, session);
    const refreshed = await getSession(userId, session.id);
    const status = refreshed.answered_count > 0 ? "completed" : "abandoned";
    const admin = createAdminClient();
    const { error } = await admin.from("practice_sessions").update({
      status,
      completed_at: new Date().toISOString(),
      paused_at: null,
      updated_at: new Date().toISOString(),
    }).eq("id", session.id).eq("user_id", userId);
    if (error) throw new Error("The session could not be finished.");
    if (!session.bank_version_id) throw new Error("This study session is missing its frozen bank version.");
    const context = await resolveLivingAtlasBankContextByVersion(session.bank_version_id, admin);
    const currentQuestions = await getBankQuestions(context.bankVersionId, admin);
    await syncLivingAtlasCollectibles(userId, currentQuestions);
    await refreshProgress(userId, currentQuestions, context);
    revalidatePath("/games/living-atlas");
    return { ok: true, value: { status } };
  } catch (error) {
    return { ok: false, error: asError(error, "The session could not be finished.") };
  }
}

export async function saveLivingAtlasSet(
  name: string,
  input: LivingAtlasRunConfig,
  bankId = LIVING_ATLAS_REFERENCE_BANK_ID,
): Promise<LivingAtlasActionResult<LivingAtlasSavedSet>> {
  try {
    const userId = await requireFounder();
    const safeName = name.trim().slice(0, 80);
    if (!safeName) return { ok: false, error: "Give this saved setup a short name." };
    const admin = createAdminClient();
    const context = await resolveLivingAtlasBankContext(bankId, admin);
    const { data, error } = await admin.from("practice_saved_sets").insert({
      user_id: userId,
      bank_id: context.bankId,
      name: safeName,
      config: normalizeConfig(input),
    }).select("id, name, config, created_at").single();
    if (error || !data) throw new Error("The practice setup could not be saved.");
    return { ok: true, value: { id: data.id, name: data.name, config: normalizeConfig(data.config as LivingAtlasRunConfig), createdAt: data.created_at } };
  } catch (error) {
    return { ok: false, error: asError(error, "The practice setup could not be saved.") };
  }
}

export async function getLivingAtlasResults(runId: string): Promise<LivingAtlasActionResult<LivingAtlasResults>> {
  try {
    const userId = await requireFounder();
    const session = await getSession(userId, runId);
    if (session.status === "active") return { ok: false, error: "Finish or save this session before opening results." };
    const admin = createAdminClient();
    if (!session.bank_version_id) throw new Error("This study session is missing its frozen bank version.");
    const context = await resolveLivingAtlasBankContextByVersion(session.bank_version_id, admin);
    const [items, responseResult, previousSessionsResult, currentQuestions] = await Promise.all([
      listSessionItems(session.id),
      admin.from("practice_responses").select("session_id, variant_id, selected_choice, is_correct, confidence, response_time_ms, answered_at").eq("session_id", session.id).eq("user_id", userId),
      admin.from("practice_sessions").select("id").eq("user_id", userId).eq("bank_id", session.bank_id).eq("mode", session.mode).eq("status", "completed").neq("id", session.id).order("completed_at", { ascending: false }).limit(5),
      getBankQuestions(context.bankVersionId, admin),
    ]);
    if (responseResult.error || previousSessionsResult.error) throw new Error("The session report could not be loaded.");
    const [states, progress, frozenQuestions] = await Promise.all([
      getQuestionStates(userId, currentQuestions.map((question) => question.id)),
      refreshProgress(userId, currentQuestions, context),
      getFrozenBankQuestions(items, admin),
    ]);
    const responses = (responseResult.data ?? []) as ResponseRow[];
    const previousIds = (previousSessionsResult.data ?? []).map((row) => row.id);
    const previousResponseResult = previousIds.length
      ? await admin.from("practice_responses").select("variant_id, response_time_ms").eq("user_id", userId).in("session_id", previousIds)
      : { data: [], error: null };
    if (previousResponseResult.error) throw new Error("Your personal pace baseline could not be loaded.");
    const previousResponses = previousResponseResult.data ?? [];
    const responseByVariant = new Map(responses.map((response) => [response.variant_id, response]));
    const questions = await Promise.all(items.flatMap((item) => {
      const response = responseByVariant.get(item.variant_id);
      const question = frozenQuestions.get(item.variant_id);
      if (!response || !question) return [];
      return [Promise.resolve().then(async () => {
        const learnerFeedback = learnerFacingFeedback(question);
        return {
          position: item.position,
          questionId: question.id,
          domain: question.taxonomy.domain,
          topic: question.taxonomy.topic,
          conceptId: question.taxonomy.conceptId,
          objective: question.taxonomy.objective,
          stem: question.stem,
          selectedChoiceId: response.selected_choice,
          correctChoiceId: question.correctChoiceId,
          correct: response.is_correct,
          confidence: response.confidence,
          activeTimeMs: response.response_time_ms ?? 0,
          flagged: states.get(question.id)?.manually_flagged ?? false,
          teachingFeedback: learnerFeedback.teachingFeedback,
          choiceFeedback: learnerFeedback.choiceFeedback,
          imagePlacement: question.imagePlacement,
          ...(question.imagePlacement === "results" ? await signQuestionImage(admin, question) : { imageAvailable: false, imageUrl: null, imageCaption: null }),
        };
      })];
    }));
    const currentById = new Map(currentQuestions.map((question) => [question.id, question]));
    const topicNames = Array.from(new Set(questions.map((question) => question.topic)));
    const topics = topicNames.map((topic) => {
      const current = questions.filter((question) => question.topic === topic);
      const previous = previousResponses.filter((response) => currentById.get(response.variant_id)?.taxonomy.topic === topic);
      return {
        domain: current[0]?.domain ?? "Dental Anatomy",
        topic,
        answered: current.length,
        correct: current.filter((question) => question.correct).length,
        accuracy: current.length ? Math.round((current.filter((question) => question.correct).length / current.length) * 100) : 0,
        averageTimeMs: current.length ? Math.round(current.reduce((sum, question) => sum + question.activeTimeMs, 0) / current.length) : 0,
        personalBaselineMs: previous.length >= 5 ? Math.round(previous.reduce((sum, response) => sum + (response.response_time_ms ?? 0), 0) / previous.length) : null,
      };
    });
    const concepts = Array.from(new Set(questions.map((question) => question.conceptId))).map((conceptId) => {
      const current = questions.filter((question) => question.conceptId === conceptId);
      const relatedStates = Array.from(states.values()).filter((state) => currentById.get(state.variant_id)?.taxonomy.conceptId === conceptId);
      return {
        domain: current[0]?.domain ?? "Dental Anatomy",
        topic: current[0]?.topic ?? "Uncategorized",
        conceptId,
        objective: current[0]?.objective ?? `Review the ${current[0]?.topic ?? "course"} concept.`,
        attempted: current.length,
        correct: current.filter((question) => question.correct).length,
        accuracy: current.length ? Math.round((current.filter((question) => question.correct).length / current.length) * 100) : 0,
        activeEchoes: relatedStates.filter((state) => state.active_echo).length,
        flaggedQuestions: relatedStates.filter((state) => state.manually_flagged).length,
        knowledgeState: relatedStates.some((state) => state.knowledge_state === "mastered")
          ? "mastered" as const
          : relatedStates.some((state) => state.active_echo || state.manually_flagged)
            ? "reviewing" as const
            : relatedStates.some((state) => state.attempts > 0)
              ? "learning" as const
              : "unseen" as const,
      };
    });
    const averageTimeMs = questions.length ? Math.round(questions.reduce((sum, question) => sum + question.activeTimeMs, 0) / questions.length) : 0;
    const personalBaselineMs = previousResponses.length
      ? Math.round(previousResponses.reduce((sum, response) => sum + (response.response_time_ms ?? 0), 0) / previousResponses.length)
      : null;
    return {
      ok: true,
      value: {
        run: asRunSummary(session),
        courseTitle: context.courseTitle,
        courseSlug: context.courseSlug,
        bankTitle: context.bankTitle,
        accuracy: questions.length ? Math.round((questions.filter((question) => question.correct).length / questions.length) * 100) : 0,
        averageTimeMs,
        personalBaselineMs,
        topics,
        concepts,
        questions,
        progress,
      },
    };
  } catch (error) {
    return { ok: false, error: asError(error, "The session report could not be loaded.") };
  }
}

const REVIEW_ACTIONS = new Set(["saved", "approved", "changes_requested", "rejected"] as const);
const IMAGE_PLACEMENTS = new Set<LivingAtlasAssessmentImagePlacement>(["prompt", "feedback", "results", "none"]);

function reviewStatusForAction(action: "saved" | "approved" | "changes_requested" | "rejected") {
  if (action === "approved") return "approved" as const;
  if (action === "changes_requested") return "changes_requested" as const;
  if (action === "rejected") return "rejected" as const;
  return "review_required" as const;
}

function databaseImagePlacement(placement: LivingAtlasAssessmentImagePlacement) {
  if (placement === "prompt") return "pre_commit";
  if (placement === "feedback") return "post_commit";
  if (placement === "results") return "review_only";
  return "none";
}

function reviewSnapshot(patch: LivingAtlasFounderQuestionPatch) {
  return {
    stem: patch.stem,
    choices: patch.choices.map((choice) => choice.text),
    correctChoice: patch.choices.find((choice) => choice.id === patch.correctChoiceId)?.text ?? "",
    teachingFeedback: patch.teachingFeedback,
    choiceFeedback: patch.choiceFeedback,
    academicYear: patch.taxonomy.academicYear,
    term: patch.taxonomy.term,
    courseCode: patch.taxonomy.courseCode,
    courseTitle: patch.taxonomy.courseTitle,
    unit: patch.taxonomy.unit,
    domain: patch.taxonomy.domain,
    topic: patch.taxonomy.topic,
    conceptId: patch.taxonomy.conceptId,
    objective: patch.taxonomy.objective,
    itemFormat: patch.taxonomy.itemFormat,
    stemType: patch.taxonomy.stemType,
    cognitiveLevel: patch.taxonomy.cognitiveLevel,
    difficulty: patch.taxonomy.difficulty,
    imagePlacement: patch.imagePlacement,
  };
}

function cleanReviewPatch(input: LivingAtlasFounderQuestionPatch) {
  const itemFormat = input.taxonomy.itemFormat === "true_false"
    ? "true_false"
    : input.taxonomy.itemFormat === "image_identification"
      ? "image_identification"
      : "single_best_answer";
  const expectedChoiceIds = itemFormat === "true_false"
    ? (["a", "b"] as LivingAtlasChoice["id"][])
    : (["a", "b", "c", "d"] as LivingAtlasChoice["id"][]);
  const choices = input.choices
    .filter((choice) => expectedChoiceIds.includes(choice.id))
    .map((choice) => ({ id: choice.id, text: choice.text.trim() }));
  const requiredText = [input.stem, input.teachingFeedback, input.taxonomy.objective, ...choices.map((choice) => choice.text)];
  if (choices.length !== expectedChoiceIds.length || new Set(choices.map((choice) => choice.id)).size !== expectedChoiceIds.length || choices.some((choice, index) => choice.id !== expectedChoiceIds[index] || !VALID_CHOICE_IDS.has(choice.id))) {
    throw new Error(itemFormat === "true_false" ? "A true/false question must use exactly A · True and B · False." : "Each Test Mode question must have exactly four reviewed choices, A through D.");
  }
  if (itemFormat === "true_false" && (choices[0]?.text.toLowerCase() !== "true" || choices[1]?.text.toLowerCase() !== "false")) throw new Error("A true/false question must use the choices True and False in that order.");
  if (!choices.some((choice) => choice.id === input.correctChoiceId)) throw new Error("Choose the correct answer before saving.");
  if (requiredText.some((value) => !value.trim())) throw new Error("Stem, choices, explanation, and learning objective are required.");
  if (!VALID_DIFFICULTIES.has(input.taxonomy.difficulty)) throw new Error("Select a supported difficulty.");
  if (!IMAGE_PLACEMENTS.has(input.imagePlacement)) throw new Error("Select a supported image placement.");
  const choiceFeedback = Object.fromEntries(
    expectedChoiceIds.map((id) => [id, (input.choiceFeedback[id] ?? "").trim()]),
  ) as Record<LivingAtlasChoice["id"], string>;
  if (expectedChoiceIds.some((id) => !choiceFeedback[id])) throw new Error("Add specific feedback for every available choice.");
  return {
    ...input,
    stem: input.stem.trim(),
    choices,
    teachingFeedback: input.teachingFeedback.trim(),
    choiceFeedback,
    taxonomy: {
      ...input.taxonomy,
      academicYear: input.taxonomy.academicYear.trim(),
      term: input.taxonomy.term.trim(),
      courseCode: input.taxonomy.courseCode.trim(),
      courseTitle: input.taxonomy.courseTitle.trim(),
      unit: input.taxonomy.unit.trim(),
      domain: input.taxonomy.domain.trim(),
      topic: input.taxonomy.topic.trim(),
      conceptId: input.taxonomy.conceptId.trim(),
      objective: input.taxonomy.objective.trim(),
      itemFormat,
      stemType: input.taxonomy.stemType.trim(),
      cognitiveLevel: input.taxonomy.cognitiveLevel.trim(),
    },
    reviewNote: input.reviewNote?.trim().slice(0, 2_000) || null,
  };
}

export async function getLivingAtlasFounderReview(
  bankId: string = LIVING_ATLAS_OMAR_DERIVED_PILOT_BANK_ID,
): Promise<LivingAtlasActionResult<LivingAtlasFounderReview>> {
  try {
    await requireFounder();
    const admin = createAdminClient();
    const context = await resolveLivingAtlasFounderReviewContext(bankId, admin);
    if (context.bankKind === "recall_practice") throw new Error("Recall decks cannot enter founder MCQ review.");
    const [questions, versionResult] = await Promise.all([
      getBankQuestions(context.bankVersionId, admin),
      admin.from("practice_bank_versions").select("version, status").eq("id", context.bankVersionId).single(),
    ]);
    if (versionResult.error || !versionResult.data) throw new Error("The founder-review version could not be loaded.");
    const ids = questions.map((question) => question.id);
    const { data: events, error: eventsError } = await admin
      .rpc("living_atlas_get_variant_review_events", { p_variant_ids: ids });
    if (eventsError) throw new Error("Question review history could not be loaded.");
    const { data: sourceLinks, error: sourceLinksError } = await admin
      .from("practice_variants")
      .select("id, question_id")
      .in("id", ids);
    if (sourceLinksError) throw new Error("Question source links could not be loaded.");
    const sourceQuestionIds = (sourceLinks ?? []).map((link) => link.question_id);
    const { data: sourceCards, error: sourceCardsError } = await admin
      .from("practice_questions")
      .select("id, original_question, original_answer")
      .in("id", sourceQuestionIds);
    if (sourceCardsError) throw new Error("Immutable source cards could not be loaded.");
    const sourceByQuestionId = new Map((sourceCards ?? []).map((source) => [source.id, source]));
    const sourceByVariantId = new Map((sourceLinks ?? []).map((link) => [link.id, sourceByQuestionId.get(link.question_id)]));
    const eventsByQuestion = Object.fromEntries(ids.map((id) => [id, []])) as LivingAtlasFounderReview["eventsByQuestion"];
    for (const event of events ?? []) {
      if (eventsByQuestion[event.variant_id]) {
        eventsByQuestion[event.variant_id].push({
          id: event.id,
          variantId: event.variant_id,
          revision: event.revision,
          action: event.action,
          note: event.note,
          createdAt: event.created_at,
        });
      }
    }
    const founderQuestions: LivingAtlasFounderQuestion[] = await Promise.all(questions.map(async (question) => {
      const source = sourceByVariantId.get(question.id);
      if (!source) throw new Error("An immutable source card is missing from this review candidate.");
      return {
      id: question.id,
      revision: question.revision,
      reviewStatus: question.reviewStatus,
      reviewNote: question.reviewNote,
      reviewedAt: question.reviewedAt,
      sourceOrder: question.sourceOrder,
      stem: question.stem,
      choices: question.choices,
      correctChoiceId: question.correctChoiceId,
      teachingFeedback: question.teachingFeedback,
      choiceFeedback: question.choiceFeedback,
      taxonomy: question.taxonomy,
      imagePlacement: question.imagePlacement,
      hasSourceImage: question.media.length > 0,
      ...(await signQuestionImage(admin, question)),
      sourceReference: {
        prompt: source.original_question,
        answer: source.original_answer,
      },
    };
    }));
    return {
      ok: true,
      value: {
        bankId: context.bankId,
        bankTitle: context.bankTitle,
        bankKind: context.bankKind,
        provenance: context.provenance,
        sourceVersion: context.sourceVersion,
        summary: countReviewStatuses(questions, {
          bankVersionId: context.bankVersionId,
          bankStatus: versionResult.data.status,
          bankVersion: versionResult.data.version,
        }),
        questions: founderQuestions,
        taxonomyOptions: {
          domains: Array.from(new Set(questions.map((question) => question.taxonomy.domain))).sort(),
          topics: Array.from(new Set(questions.map((question) => question.taxonomy.topic))).sort(),
          concepts: Array.from(new Set(questions.map((question) => question.taxonomy.conceptId))).sort(),
          objectives: Array.from(new Set(questions.map((question) => question.taxonomy.objective))).sort(),
        },
        eventsByQuestion,
      },
    };
  } catch (error) {
    return { ok: false, error: asError(error, "Founder review is unavailable.") };
  }
}

export async function saveLivingAtlasFounderQuestion(
  bankId: string,
  input: LivingAtlasFounderQuestionPatch,
  action: "saved" | "approved" | "changes_requested" | "rejected",
): Promise<LivingAtlasActionResult<{ question: LivingAtlasFounderQuestion; summary: LivingAtlasFounderReview["summary"] }>> {
  try {
    const userId = await requireFounder();
    if (!REVIEW_ACTIONS.has(action)) throw new Error("That review action is invalid.");
    const patch = cleanReviewPatch(input);
    const admin = createAdminClient();
    const context = await resolveLivingAtlasFounderReviewContext(bankId, admin);
    const questions = await getBankQuestions(context.bankVersionId, admin);
    const current = questions.find((question) => question.id === patch.id);
    if (!current) throw new Error("That founder-review question is unavailable.");
    if (current.revision !== patch.expectedRevision) throw new Error("This question changed in another review. Refresh before saving your edits.");
    if (!current.media.length && patch.imagePlacement !== "none") throw new Error("This question has no registered source image to place.");
    const taxonomyLibrary = {
      domains: new Set(questions.map((question) => question.taxonomy.domain)),
      topics: new Set(questions.map((question) => question.taxonomy.topic)),
      concepts: new Set(questions.map((question) => question.taxonomy.conceptId)),
    };
    if (!taxonomyLibrary.domains.has(patch.taxonomy.domain) || !taxonomyLibrary.topics.has(patch.taxonomy.topic) || !taxonomyLibrary.concepts.has(patch.taxonomy.conceptId)) {
      throw new Error("Use an existing controlled domain, topic, and concept. Add new taxonomy values through curation before attaching them to a question.");
    }
    const status = reviewStatusForAction(action);
    const snapshot = reviewSnapshot(patch);
    const { data: savedRevision, error: saveError } = await admin.rpc("living_atlas_save_founder_variant_review", {
      p_variant_id: patch.id,
      p_expected_revision: patch.expectedRevision,
      p_review_status: status,
      p_action: action,
      p_snapshot: snapshot,
      p_note: patch.reviewNote,
      p_user_id: userId,
      p_stem: patch.stem,
      p_choices: patch.choices.map((choice) => choice.text),
      p_correct_choice: patch.choices.find((choice) => choice.id === patch.correctChoiceId)?.text ?? "",
      p_teaching_feedback: patch.teachingFeedback,
      p_choice_feedback: patch.choiceFeedback,
      p_difficulty: patch.taxonomy.difficulty,
      p_academic_year: patch.taxonomy.academicYear,
      p_term: patch.taxonomy.term,
      p_course_code: patch.taxonomy.courseCode,
      p_course_title: patch.taxonomy.courseTitle,
      p_unit: patch.taxonomy.unit,
      p_domain: patch.taxonomy.domain,
      p_topic: patch.taxonomy.topic,
      p_concept_id: patch.taxonomy.conceptId,
      p_objective: patch.taxonomy.objective,
      p_item_format: patch.taxonomy.itemFormat,
      p_stem_type: patch.taxonomy.stemType,
      p_cognitive_level: patch.taxonomy.cognitiveLevel,
      p_image_placement: databaseImagePlacement(patch.imagePlacement),
      p_bank_version_id: context.bankVersionId,
    });
    if (saveError || savedRevision !== current.revision + 1) {
      throw new Error("The question could not be saved because its revision changed. Refresh and try again.");
    }
    const refreshed = await getLivingAtlasFounderReview(bankId);
    if (!refreshed.ok) throw new Error(refreshed.error);
    const question = refreshed.value.questions.find((candidate) => candidate.id === patch.id);
    if (!question) throw new Error("The saved question could not be reloaded.");
    revalidatePath("/games/living-atlas");
    revalidatePath("/games/living-atlas/review");
    revalidatePath(`/games/living-atlas/review/${bankId}`);
    return { ok: true, value: { question, summary: refreshed.value.summary } };
  } catch (error) {
    return { ok: false, error: asError(error, "The founder-review question could not be saved.") };
  }
}

export async function approveLivingAtlasBankVersion(bankId: string): Promise<LivingAtlasActionResult<LivingAtlasFounderReview["summary"]>> {
  try {
    const userId = await requireFounder();
    const admin = createAdminClient();
    const context = await resolveLivingAtlasFounderReviewContext(bankId, admin);
    const questions = await getBankQuestions(context.bankVersionId, admin);
    if (!questions.length || questions.some((question) => question.reviewStatus !== "approved")) {
      return { ok: false, error: `Approve all ${questions.length} questions before marking this bank version editorially approved.` };
    }
    const { error } = await admin.from("practice_bank_versions").update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: userId,
      updated_at: new Date().toISOString(),
    }).eq("id", context.bankVersionId);
    if (error) throw new Error("The bank version could not be approved.");
    const { data: version, error: versionError } = await admin.from("practice_bank_versions").select("version, status").eq("id", context.bankVersionId).single();
    if (versionError || !version) throw new Error("The approved bank could not be reloaded.");
    const summary = countReviewStatuses(questions, {
      bankVersionId: context.bankVersionId,
      bankStatus: version.status,
      bankVersion: version.version,
    });
    revalidatePath("/games/living-atlas");
    revalidatePath("/games/living-atlas/review");
    revalidatePath(`/games/living-atlas/review/${bankId}`);
    return { ok: true, value: summary };
  } catch (error) {
    return { ok: false, error: asError(error, "The bank version could not be approved.") };
  }
}
