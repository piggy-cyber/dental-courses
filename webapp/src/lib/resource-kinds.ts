/** Friendly categories shown in admin UI → DB kind + section values. */

export const INBOX_SECTION = "Inbox";
export const INBOX_USE_LABEL = "unassigned";

export type EssentialSlot = "syllabus" | "mastery" | "companion";

export type AssignTarget =
  | { type: "essential"; slot: EssentialSlot }
  | { type: "lecture"; lectureId: string; role: "slides" | "transcript_file" | "other" }
  | { type: "supplemental"; category: SupplementalCategory };

export type SupplementalCategory =
  | "lab_guide"
  | "flashcards"
  | "document"
  | "local_media"
  | "other";

export const ESSENTIAL_SLOT_LABELS: Record<EssentialSlot, string> = {
  syllabus: "Syllabus",
  mastery: "Mastery guide",
  companion: "Textbook companion",
};

export const SUPPLEMENTAL_LABELS: Record<SupplementalCategory, string> = {
  lab_guide: "Lab guide",
  flashcards: "Flashcards",
  document: "Document",
  local_media: "Supplemental video",
  other: "Other",
};

export const RESOURCE_KIND_PRESETS = {
  syllabus: { kind: "Syllabus", isCanonicalSyllabus: true },
  mastery: { kind: "Course Mastery Guide", isCanonicalSyllabus: false },
  companion: { kind: "Textbook Companion", isCanonicalSyllabus: false },
  lectureSlides: { kind: "Document", isCanonicalSyllabus: false },
  lectureTranscriptFile: { kind: "Document", isCanonicalSyllabus: false },
  lab_guide: { kind: "Lab Guide", isCanonicalSyllabus: false },
  flashcards: { kind: "Flashcards", isCanonicalSyllabus: false },
  document: { kind: "Document", isCanonicalSyllabus: false },
  local_media: { kind: "Local Media Source", isCanonicalSyllabus: false },
  other: { kind: "Document", isCanonicalSyllabus: false },
} as const;

export function isInboxResource(resource: {
  section: string | null;
  use_label: string | null;
}): boolean {
  return resource.section === INBOX_SECTION || resource.use_label === INBOX_USE_LABEL;
}

export function essentialSlotForResource(resource: {
  kind: string | null;
  is_canonical_syllabus: boolean;
}): EssentialSlot | null {
  if (resource.is_canonical_syllabus || resource.kind === "Syllabus") return "syllabus";
  if (resource.kind === "Course Mastery Guide") return "mastery";
  if (resource.kind === "Textbook Companion") return "companion";
  return null;
}

export function lectureRoleFromUseLabel(useLabel: string | null): "slides" | "transcript_file" | "other" | null {
  if (!useLabel) return null;
  if (useLabel.endsWith("-slides")) return "slides";
  if (useLabel.endsWith("-transcript-file")) return "transcript_file";
  if (useLabel.startsWith("lecture-")) return "other";
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
} {
  if (target.type === "essential") {
    const preset = RESOURCE_KIND_PRESETS[target.slot];
    return {
      kind: preset.kind,
      section: ESSENTIAL_SLOT_LABELS[target.slot],
      use_label: `essential-${target.slot}`,
      is_canonical_syllabus: preset.isCanonicalSyllabus,
    };
  }

  if (target.type === "lecture") {
    const preset = RESOURCE_KIND_PRESETS[
      target.role === "slides"
        ? "lectureSlides"
        : target.role === "transcript_file"
          ? "lectureTranscriptFile"
          : "other"
    ];
    return {
      kind: preset.kind,
      section: lectureTitle ?? "Lecture",
      use_label: buildLectureUseLabel(target.lectureId, target.role),
      is_canonical_syllabus: false,
    };
  }

  const preset = RESOURCE_KIND_PRESETS[target.category];
  return {
    kind: preset.kind,
    section: SUPPLEMENTAL_LABELS[target.category],
    use_label: `supplemental-${target.category}`,
    is_canonical_syllabus: false,
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
