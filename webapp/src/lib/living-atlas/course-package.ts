import "server-only";

import type { LivingAtlasDifficulty, LivingAtlasReviewStatus } from "@/lib/living-atlas/types";

export const COURSE_PACKAGE_VERSION = "course-package-v1" as const;

export type CoursePackageTaxonomyNodeType = "unit" | "domain" | "topic" | "concept" | "objective";
export type CoursePackageBankKind = "practice_problem" | "practice_test";
export type CoursePackageProvenance = "source_derived" | "fourth_canal_original";
export type CoursePackageMediaPlacement = "prompt" | "feedback" | "results";

export type CoursePackageTaxonomyNode = {
  id: string;
  parentId: string | null;
  type: CoursePackageTaxonomyNodeType;
  label: string;
  objective?: string;
  order: number;
  released?: boolean;
};

export type CoursePackageSource = {
  id: string;
  title: string;
  version: string;
  rightsNote: string;
  role: "included" | "supporting" | "excluded";
};

export type CoursePackageMedia = {
  id: string;
  sourceId?: string;
  storageBucket: string;
  storagePath?: string;
  sha256?: string;
  mimeType?: string;
  cacheStatus: "pending" | "cached" | "unavailable" | "failed";
  rightsNote: string;
};

export type CoursePackageItem = {
  id: string;
  sourceCardId?: string;
  revision: number;
  reviewStatus: LivingAtlasReviewStatus;
  unitId: string;
  domainId: string;
  topicId: string;
  conceptId: string;
  objectiveId?: string;
  itemFormat: "single_best_answer";
  stemType: "standard" | "cloze";
  difficulty: LivingAtlasDifficulty;
  cognitiveLevel: "recall" | "understanding" | "application" | "analysis";
  media: Array<{
    assetId: string;
    placement: CoursePackageMediaPlacement;
    order: number;
    altText?: string;
    caption?: string;
  }>;
};

export type CoursePackageBank = {
  id: string;
  title: string;
  kind: CoursePackageBankKind;
  provenance: CoursePackageProvenance;
  versionId: string;
  version: number;
  sourceVersion: string;
  status: "draft" | "review" | LivingAtlasReviewStatus | "retired";
  items: CoursePackageItem[];
  sourceIds: string[];
};

export type CoursePackageV1 = {
  contractVersion: typeof COURSE_PACKAGE_VERSION;
  course: {
    code: string;
    slug: string;
    academicYear: "D1" | "D2" | "D3" | "D4";
    term: "Summer" | "Fall" | "Spring" | "Multiple";
    title: string;
  };
  taxonomy: CoursePackageTaxonomyNode[];
  sources: CoursePackageSource[];
  media: CoursePackageMedia[];
  banks: CoursePackageBank[];
};

export type CoursePackageValidation = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BANK_ID = /^[a-z0-9][a-z0-9._:-]*$/;

function uniqueValues(values: string[], label: string, errors: string[]) {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
  if (duplicates.length) errors.push(`${label} has duplicate id: ${duplicates[0]}`);
}

/**
 * This validator intentionally checks only delivery-contract integrity. Content
 * accuracy and editorial approval remain human founder decisions.
 */
export function validateCoursePackage(pkg: CoursePackageV1): CoursePackageValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (pkg.contractVersion !== COURSE_PACKAGE_VERSION) errors.push("Unsupported course package contract version.");
  if (!SLUG.test(pkg.course.slug)) errors.push("Course slug must use lower-case kebab case.");
  if (!pkg.course.code.trim() || !pkg.course.title.trim()) errors.push("Course code and title are required.");

  uniqueValues(pkg.taxonomy.map((node) => node.id), "Taxonomy", errors);
  uniqueValues(pkg.sources.map((source) => source.id), "Sources", errors);
  uniqueValues(pkg.media.map((asset) => asset.id), "Media assets", errors);
  uniqueValues(pkg.banks.map((bank) => bank.id), "Banks", errors);

  const nodes = new Map(pkg.taxonomy.map((node) => [node.id, node]));
  const sourceIds = new Set(pkg.sources.map((source) => source.id));
  const mediaIds = new Set(pkg.media.map((asset) => asset.id));

  for (const node of pkg.taxonomy) {
    if (!BANK_ID.test(node.id)) errors.push(`Invalid taxonomy id: ${node.id}`);
    if (node.type === "unit" && node.parentId !== null) errors.push(`Unit ${node.id} cannot have a parent.`);
    if (node.type !== "unit" && (!node.parentId || !nodes.has(node.parentId))) errors.push(`Taxonomy node ${node.id} has no valid parent.`);
    const parent = node.parentId ? nodes.get(node.parentId) : null;
    const expectedParentType: Partial<Record<CoursePackageTaxonomyNodeType, CoursePackageTaxonomyNodeType>> = {
      domain: "unit",
      topic: "domain",
      concept: "topic",
      objective: "concept",
    };
    if (parent && expectedParentType[node.type] && parent.type !== expectedParentType[node.type]) {
      errors.push(`Taxonomy node ${node.id} must be nested under a ${expectedParentType[node.type]}.`);
    }
  }

  for (const bank of pkg.banks) {
    if (!BANK_ID.test(bank.id) || !BANK_ID.test(bank.versionId)) errors.push(`Invalid bank id or version id for ${bank.title}.`);
    if (!bank.sourceVersion.trim()) errors.push(`Bank ${bank.title} needs a source version.`);
    if (!bank.items.length) errors.push(`Bank ${bank.title} must contain at least one item.`);
    if (bank.kind === "practice_test" && bank.provenance !== "fourth_canal_original") errors.push(`Practice test ${bank.title} must be Fourth Canal original.`);
    if (bank.kind === "practice_problem" && bank.provenance !== "source_derived") errors.push(`Practice problem bank ${bank.title} must be source derived.`);
    for (const sourceId of bank.sourceIds) if (!sourceIds.has(sourceId)) errors.push(`Bank ${bank.title} refers to unknown source ${sourceId}.`);
    uniqueValues(bank.items.map((item) => item.id), `Items in ${bank.title}`, errors);

    for (const item of bank.items) {
      if (item.itemFormat !== "single_best_answer") errors.push(`Item ${item.id} is outside the current four-choice runtime contract.`);
      for (const requiredNodeId of [item.unitId, item.domainId, item.topicId, item.conceptId]) {
        if (!nodes.has(requiredNodeId)) errors.push(`Item ${item.id} refers to unknown taxonomy node ${requiredNodeId}.`);
      }
      const itemNodes = [
        [item.unitId, "unit"],
        [item.domainId, "domain"],
        [item.topicId, "topic"],
        [item.conceptId, "concept"],
      ] as const;
      for (const [nodeId, expectedType] of itemNodes) {
        if (nodes.get(nodeId)?.type !== expectedType) errors.push(`Item ${item.id} has an invalid ${expectedType} reference.`);
      }
      if (item.objectiveId && !nodes.has(item.objectiveId)) errors.push(`Item ${item.id} refers to unknown objective ${item.objectiveId}.`);
      for (const attachment of item.media) {
        if (!mediaIds.has(attachment.assetId)) errors.push(`Item ${item.id} refers to unknown media asset ${attachment.assetId}.`);
        if (!Number.isInteger(attachment.order) || attachment.order < 1) errors.push(`Item ${item.id} has an invalid media display order.`);
      }
      if (item.reviewStatus !== "approved") warnings.push(`Item ${item.id} remains ${item.reviewStatus}.`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
