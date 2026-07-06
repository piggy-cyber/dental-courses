/** Admin assign targets → DB fields. Taxonomy source: data/resource-taxonomy.md */

import {
  ESSENTIAL_ROLES,
  LECTURE_ROLES,
  RESOURCE_ROLE_BY_ID,
  SUPPLEMENTAL_ROLES,
  type ResourceRoleDef,
} from "@/lib/resource-taxonomy";

export const INBOX_SECTION = "Inbox";
export const INBOX_USE_LABEL = "unassigned";
export const INBOX_ROLE_ID = "inbox";

export type EssentialSlot = "syllabus" | "mastery" | "companion";

export type AssignTarget =
  | { type: "essential"; slot: EssentialSlot }
  | { type: "lecture"; lectureId: string; role: "slides" | "transcript_file" | "other" }
  | { type: "supplemental"; category: SupplementalCategory; sectionId?: string };

export type SupplementalCategory =
  | "lab_guide"
  | "flashcards"
  | "document"
  | "local_media"
  | "other";

const ESSENTIAL_SLOT_TO_ROLE: Record<EssentialSlot, string> = {
  syllabus: "essential_syllabus",
  mastery: "essential_mastery",
  companion: "essential_companion",
};

const LECTURE_ROLE_TO_ID: Record<"slides" | "transcript_file" | "other", string> = {
  slides: "lecture_slides",
  transcript_file: "lecture_transcript_file",
  other: "lecture_other",
};

const SUPPLEMENTAL_TO_ROLE: Record<SupplementalCategory, string> = {
  lab_guide: "supplemental_lab_guide",
  flashcards: "supplemental_flashcards",
  document: "supplemental_document",
  local_media: "supplemental_local_media",
  other: "supplemental_other",
};

export const ESSENTIAL_SLOT_LABELS: Record<EssentialSlot, string> = Object.fromEntries(
  ESSENTIAL_ROLES.map((role) => {
    const slot = role.id.replace("essential_", "") as EssentialSlot;
    return [slot, role.label];
  })
) as Record<EssentialSlot, string>;

export const SUPPLEMENTAL_LABELS: Record<SupplementalCategory, string> = Object.fromEntries(
  SUPPLEMENTAL_ROLES.map((role) => {
    const cat = role.id.replace("supplemental_", "") as SupplementalCategory;
    return [cat, role.label];
  })
) as Record<SupplementalCategory, string>;

export function roleForAssignTarget(target: AssignTarget): ResourceRoleDef {
  if (target.type === "essential") {
    return RESOURCE_ROLE_BY_ID[ESSENTIAL_SLOT_TO_ROLE[target.slot]];
  }
  if (target.type === "lecture") {
    return RESOURCE_ROLE_BY_ID[LECTURE_ROLE_TO_ID[target.role]];
  }
  return RESOURCE_ROLE_BY_ID[SUPPLEMENTAL_TO_ROLE[target.category]];
}

export function isInboxResource(resource: {
  section: string | null;
  use_label: string | null;
  resource_role?: string | null;
}): boolean {
  return (
    resource.resource_role === INBOX_ROLE_ID ||
    resource.section === INBOX_SECTION ||
    resource.use_label === INBOX_USE_LABEL
  );
}

export function essentialSlotForResource(resource: {
  kind: string | null;
  is_canonical_syllabus: boolean;
  resource_role?: string | null;
}): EssentialSlot | null {
  if (resource.resource_role === "essential_syllabus") return "syllabus";
  if (resource.resource_role === "essential_mastery") return "mastery";
  if (resource.resource_role === "essential_companion") return "companion";
  if (resource.is_canonical_syllabus || resource.kind === "Syllabus") return "syllabus";
  if (resource.kind === "Course Mastery Guide") return "mastery";
  if (resource.kind === "Textbook Companion") return "companion";
  return null;
}

export function lectureRoleFromUseLabel(useLabel: string | null): "slides" | "transcript_file" | "other" | null {
  if (!useLabel) return null;
  if (useLabel.endsWith("-slides")) return "slides";
  if (useLabel.endsWith("-transcript-file")) return "transcript_file";
  if (useLabel.startsWith("lecture-") || useLabel.endsWith("-other")) return "other";
  return null;
}

export function buildLectureUseLabel(lectureId: string, role: "slides" | "transcript_file" | "other"): string {
  if (role === "slides") return `${lectureId}-slides`;
  if (role === "transcript_file") return `${lectureId}-transcript-file`;
  return `${lectureId}-other`;
}

export function assignTargetToFields(
  target: AssignTarget,
  lectureTitle?: string
): {
  kind: string;
  section: string;
  use_label: string;
  is_canonical_syllabus: boolean;
  resource_role: string;
  lecture_id: string | null;
  section_id: string | null;
} {
  const role = roleForAssignTarget(target);

  if (target.type === "essential") {
    return {
      kind: role.kind,
      section: role.section,
      use_label: `essential-${target.slot}`,
      is_canonical_syllabus: Boolean(role.canonical),
      resource_role: role.id,
      lecture_id: null,
      section_id: null,
    };
  }

  if (target.type === "lecture") {
    return {
      kind: role.kind,
      section: lectureTitle ?? role.section,
      use_label: buildLectureUseLabel(target.lectureId, target.role),
      is_canonical_syllabus: false,
      resource_role: role.id,
      lecture_id: target.lectureId,
      section_id: null,
    };
  }

  return {
    kind: role.kind,
    section: role.section,
    use_label: `supplemental-${target.category}`,
    is_canonical_syllabus: false,
    resource_role: role.id,
    lecture_id: null,
    section_id: target.sectionId ?? null,
  };
}

export function placeholderResourceName(slot: EssentialSlot): string {
  switch (slot) {
    case "syllabus":
      return "Syllabus (upload pending).pdf";
    case "mastery":
      return "Course Mastery Guide (upload pending).pdf";
    case "companion":
      return "Textbook Companion (upload pending).pdf";
  }
}

export { ESSENTIAL_ROLES, LECTURE_ROLES, SUPPLEMENTAL_ROLES, RESOURCE_ROLE_BY_ID };
