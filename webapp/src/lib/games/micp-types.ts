import type { PermanentToothCode } from "./tooth-types";

export type EvidenceStatus = "course-verified" | "needs-review";

export type SourceRef = {
  courseCode: string;
  sourceName: string;
  locator: string;
};

export type NonEmptySourceRefs = [SourceRef, ...SourceRef[]];

type MicpRelationshipFields = {
  id: string;
  maxillaryTooth: PermanentToothCode;
  mandibularContactTooth: PermanentToothCode;
  cusp: string;
  fossaOrEmbrasure: string;
  contactType: string;
  explanation: string;
  clinicalNote: string;
};

export type NeedsReviewMicpRelationship = MicpRelationshipFields & {
  sourceRefs: SourceRef[];
  evidenceStatus: "needs-review";
};

export type CourseVerifiedMicpRelationship = MicpRelationshipFields & {
  sourceRefs: NonEmptySourceRefs;
  evidenceStatus: "course-verified";
};

export type MicpRelationship =
  | NeedsReviewMicpRelationship
  | CourseVerifiedMicpRelationship;

export type MicpDatasetInReview = {
  schemaVersion: 1;
  status: "clinical-map-in-review";
  sourceRefs: SourceRef[];
  evidenceStatus: "needs-review";
  relationships: NeedsReviewMicpRelationship[];
};

export type MicpDatasetReady = {
  schemaVersion: 1;
  status: "ready";
  sourceRefs: NonEmptySourceRefs;
  evidenceStatus: "course-verified";
  relationships: [CourseVerifiedMicpRelationship, ...CourseVerifiedMicpRelationship[]];
};

export type MicpOcclusionDataset = MicpDatasetInReview | MicpDatasetReady;

function isNonEmptyText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isCompleteSourceRef(value: unknown): value is SourceRef {
  if (!value || typeof value !== "object") return false;

  const sourceRef = value as Partial<SourceRef>;
  return (
    isNonEmptyText(sourceRef.courseCode) &&
    isNonEmptyText(sourceRef.sourceName) &&
    isNonEmptyText(sourceRef.locator)
  );
}

export function isCourseVerifiedMicpRelationship(
  relationship: MicpRelationship,
): relationship is CourseVerifiedMicpRelationship {
  if (!relationship || typeof relationship !== "object") return false;

  return (
    relationship.evidenceStatus === "course-verified" &&
    Array.isArray(relationship.sourceRefs) &&
    relationship.sourceRefs.length > 0 &&
    relationship.sourceRefs.every(isCompleteSourceRef)
  );
}
