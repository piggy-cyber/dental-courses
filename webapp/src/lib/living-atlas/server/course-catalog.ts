import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export type LivingAtlasCourseContext = {
  courseCode: string;
  relatedCourseCodes: string[];
  courseSlug: string;
  courseTitle: string;
  academicYear: "D1" | "D2" | "D3" | "D4";
  term: "Summer" | "Fall" | "Spring" | "Multiple";
  status: "draft" | "review" | "released" | "retired";
  description: string | null;
};

export type LivingAtlasBankContext = LivingAtlasCourseContext & {
  bankId: string;
  bankTitle: string;
  bankKind: "recall_practice" | "practice_problem" | "practice_test";
  provenance: "source_derived" | "fourth_canal_original";
  bankStatus: string;
  sourceCardCount: number;
  questionCount: number;
  bankVersionId: string;
  bankVersion: number;
  bankVersionStatus: string;
  sourceVersion: string;
};

type CourseCatalogRow = {
  course_code: string;
  slug: string;
  academic_year: LivingAtlasCourseContext["academicYear"];
  term: LivingAtlasCourseContext["term"];
  status: LivingAtlasCourseContext["status"];
  description: string | null;
  courses: { title: string } | { title: string }[] | null;
};

type CourseAliasRow = {
  course_code: string;
  related_course_code: string;
};

type BankRow = {
  id: string;
  course_code: string | null;
  course_slug: string | null;
  title: string;
  bank_kind: LivingAtlasBankContext["bankKind"];
  provenance: LivingAtlasBankContext["provenance"];
  status: string;
  source_card_count: number;
  question_count: number;
};

type BankVersionRow = {
  id: string;
  bank_id: string;
  version: number;
  status: string;
  source_version: string;
};

function asCourseTitle(value: CourseCatalogRow["courses"]) {
  return Array.isArray(value) ? value[0]?.title ?? "Untitled course" : value?.title ?? "Untitled course";
}

export async function listLivingAtlasCourses(admin: AdminClient = createAdminClient()): Promise<LivingAtlasCourseContext[]> {
  const [coursesResult, aliasesResult] = await Promise.all([
    admin
      .from("practice_course_catalog")
      .select("course_code, slug, academic_year, term, status, description, courses(title)")
      .neq("status", "retired")
      .order("sort_order")
      .order("course_code"),
    admin
      .from("practice_course_aliases")
      .select("course_code, related_course_code"),
  ]);
  if (coursesResult.error || aliasesResult.error) throw new Error("The Living Atlas course shelf could not be loaded.");
  const aliasesByCourse = new Map<string, string[]>();
  for (const row of (aliasesResult.data ?? []) as CourseAliasRow[]) {
    aliasesByCourse.set(row.course_code, [...(aliasesByCourse.get(row.course_code) ?? []), row.related_course_code]);
  }
  return (coursesResult.data ?? []).map((row) => {
    const course = row as unknown as CourseCatalogRow;
    return {
      courseCode: course.course_code,
      relatedCourseCodes: aliasesByCourse.get(course.course_code) ?? [],
      courseSlug: course.slug,
      courseTitle: asCourseTitle(course.courses),
      academicYear: course.academic_year,
      term: course.term,
      status: course.status,
      description: course.description,
    };
  });
}

export async function getLivingAtlasCourseBySlug(courseSlug: string, admin: AdminClient = createAdminClient()): Promise<LivingAtlasCourseContext> {
  const { data, error } = await admin
    .from("practice_course_catalog")
    .select("course_code, slug, academic_year, term, status, description, courses(title)")
    .eq("slug", courseSlug)
    .neq("status", "retired")
    .maybeSingle();
  if (error || !data) throw new Error("That Living Atlas course is unavailable.");
  const course = data as unknown as CourseCatalogRow;
  const { data: aliases, error: aliasError } = await admin
    .from("practice_course_aliases")
    .select("related_course_code")
    .eq("course_code", course.course_code);
  if (aliasError) throw new Error("That Living Atlas course is unavailable.");
  return {
    courseCode: course.course_code,
    relatedCourseCodes: (aliases ?? []).map((row) => row.related_course_code as string),
    courseSlug: course.slug,
    courseTitle: asCourseTitle(course.courses),
    academicYear: course.academic_year,
    term: course.term,
    status: course.status,
    description: course.description,
  };
}

export async function resolveLivingAtlasBankContext(bankId: string, admin: AdminClient = createAdminClient()): Promise<LivingAtlasBankContext> {
  const { data: bankData, error: bankError } = await admin
    .from("practice_banks")
    .select("id, course_code, course_slug, title, bank_kind, provenance, status, source_card_count, question_count")
    .eq("id", bankId)
    .in("status", ["review", "published"])
    .neq("bank_kind", "recall_practice")
    .eq("provenance", "fourth_canal_original")
    .maybeSingle();
  if (bankError || !bankData || !bankData.course_code || !bankData.course_slug) throw new Error("That practice bank is unavailable.");
  const bank = bankData as BankRow;
  const courseSlug = bankData.course_slug;
  const [course, versionResult] = await Promise.all([
    getLivingAtlasCourseBySlug(courseSlug, admin),
    admin
      .from("practice_bank_versions")
      .select("id, bank_id, version, status, source_version")
      .eq("bank_id", bank.id)
      .neq("status", "retired")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (versionResult.error || !versionResult.data) throw new Error("That practice bank has no available version.");
  const version = versionResult.data as BankVersionRow;
  return {
    ...course,
    bankId: bank.id,
    bankTitle: bank.title,
    bankKind: bank.bank_kind,
    provenance: bank.provenance,
    bankStatus: bank.status,
    sourceCardCount: bank.source_card_count,
    questionCount: bank.question_count,
    bankVersionId: version.id,
    bankVersion: version.version,
    bankVersionStatus: version.status,
    sourceVersion: version.source_version,
  };
}

/**
 * Founder review intentionally uses a separate resolver from learner delivery.
 * A source-linked candidate may be inspected by the owner here while remaining
 * unavailable to the run builder, runner, and student-facing routes.
 */
export async function resolveLivingAtlasFounderReviewContext(bankId: string, admin: AdminClient = createAdminClient()): Promise<LivingAtlasBankContext> {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(bankId)) throw new Error("That founder-review bank is unavailable.");
  const { data: bankData, error: bankError } = await admin
    .from("practice_banks")
    .select("id, course_code, course_slug, title, bank_kind, provenance, status, source_card_count, question_count")
    .eq("id", bankId)
    .eq("status", "review")
    .in("bank_kind", ["practice_problem", "practice_test"])
    .maybeSingle();
  if (bankError || !bankData || !bankData.course_code || !bankData.course_slug) throw new Error("That founder-review bank is unavailable.");
  const bank = bankData as BankRow;
  const [course, versionResult] = await Promise.all([
    getLivingAtlasCourseBySlug(bankData.course_slug, admin),
    admin
      .from("practice_bank_versions")
      .select("id, bank_id, version, status, source_version")
      .eq("bank_id", bank.id)
      .neq("status", "retired")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (versionResult.error || !versionResult.data) throw new Error("That founder-review bank has no available version.");
  const version = versionResult.data as BankVersionRow;
  return {
    ...course,
    bankId: bank.id,
    bankTitle: bank.title,
    bankKind: bank.bank_kind,
    provenance: bank.provenance,
    bankStatus: bank.status,
    sourceCardCount: bank.source_card_count,
    questionCount: bank.question_count,
    bankVersionId: version.id,
    bankVersion: version.version,
    bankVersionStatus: version.status,
    sourceVersion: version.source_version,
  };
}

/**
 * Recall decks use immutable source cards and intentionally have no candidate
 * answer-key/version dependency. Keeping this resolver separate makes it
 * impossible for a source-derived bank to enter Test Mode by accident.
 */
export async function resolveLivingAtlasRecallBankContext(bankId: string, admin: AdminClient = createAdminClient()) {
  const { data: bankData, error: bankError } = await admin
    .from("practice_banks")
    .select("id, source_id, course_code, course_slug, title, bank_kind, provenance, status, source_card_count, question_count")
    .eq("id", bankId)
    .eq("bank_kind", "recall_practice")
    .eq("provenance", "source_derived")
    .in("status", ["review", "published"])
    .maybeSingle();
  if (bankError || !bankData || !bankData.course_code || !bankData.course_slug) throw new Error("That recall deck is unavailable.");
  const bank = bankData as BankRow & { source_id: string };
  const course = await getLivingAtlasCourseBySlug(bank.course_slug!, admin);
  return {
    ...course,
    bankId: bank.id,
    bankTitle: bank.title,
    sourceId: bank.source_id,
    bankKind: "recall_practice" as const,
    provenance: "source_derived" as const,
    bankStatus: bank.status,
    sourceCardCount: bank.source_card_count,
  };
}

export async function resolveLivingAtlasBankContextByVersion(bankVersionId: string, admin: AdminClient = createAdminClient()) {
  const { data: versionData, error: versionError } = await admin
    .from("practice_bank_versions")
    .select("id, bank_id, version, status, source_version")
    .eq("id", bankVersionId)
    .maybeSingle();
  if (versionError || !versionData) throw new Error("The frozen practice-bank version is unavailable.");

  const { data: bankData, error: bankError } = await admin
    .from("practice_banks")
    .select("id, course_code, course_slug, title, bank_kind, provenance, status, source_card_count, question_count")
    .eq("id", versionData.bank_id)
    .maybeSingle();
  if (bankError || !bankData || !bankData.course_code || !bankData.course_slug) throw new Error("The frozen practice bank is unavailable.");

  const bank = bankData as BankRow;
  if (bank.bank_kind === "recall_practice" || bank.provenance !== "fourth_canal_original") {
    throw new Error("Source-derived cards are available only in Recall Practice.");
  }
  const course = await getLivingAtlasCourseBySlug(bank.course_slug!, admin);
  return {
    ...course,
    bankId: bank.id,
    bankTitle: bank.title,
    bankKind: bank.bank_kind,
    provenance: bank.provenance,
    bankStatus: bank.status,
    sourceCardCount: bank.source_card_count,
    questionCount: bank.question_count,
    bankVersionId: versionData.id,
    bankVersion: versionData.version,
    bankVersionStatus: versionData.status,
    sourceVersion: versionData.source_version,
  } satisfies LivingAtlasBankContext;
}

export const LIVING_ATLAS_REFERENCE_BANK_ID = "living-atlas-dental-anatomy-lecture-1";
export const LIVING_ATLAS_OMAR_DERIVED_PILOT_BANK_ID = "living-atlas-rehe-151-lecture-1-omar-derived-practice-problems-v1";
