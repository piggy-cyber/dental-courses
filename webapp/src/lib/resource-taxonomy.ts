// AUTO-GENERATED from data/resource-taxonomy.md — do not edit by hand.
// Run: node webapp/scripts/generate-resource-taxonomy.mjs

export type TaxonomyGroupType = "essential" | "lecture" | "supplemental" | "inbox" | "archive";

export type ResourceRoleDef = {
  id: string;
  group_type: TaxonomyGroupType;
  label: string;
  kind: string;
  section: string;
  canonical?: boolean;
  optional?: boolean;
  sort: number;
};

export const RESOURCE_ROLES: ResourceRoleDef[] = [
  {
    "id": "essential_syllabus",
    "group_type": "essential",
    "label": "Syllabus",
    "kind": "Syllabus",
    "section": "Syllabus",
    "canonical": true,
    "sort": 10
  },
  {
    "id": "essential_mastery",
    "group_type": "essential",
    "label": "Mastery guide",
    "kind": "Course Mastery Guide",
    "section": "Mastery guide",
    "sort": 20
  },
  {
    "id": "essential_companion",
    "group_type": "essential",
    "label": "Textbook companion",
    "kind": "Textbook Companion",
    "section": "Textbook companion",
    "optional": true,
    "sort": 30
  },
  {
    "id": "lecture_slides",
    "group_type": "lecture",
    "label": "Slides",
    "kind": "Slides",
    "section": "Lecture",
    "sort": 40
  },
  {
    "id": "lecture_transcript_file",
    "group_type": "lecture",
    "label": "Transcript file",
    "kind": "Document",
    "section": "Lecture",
    "sort": 50
  },
  {
    "id": "lecture_other",
    "group_type": "lecture",
    "label": "Other file",
    "kind": "Document",
    "section": "Lecture",
    "sort": 60
  },
  {
    "id": "supplemental_lab_guide",
    "group_type": "supplemental",
    "label": "Lab guide",
    "kind": "Lab Guide",
    "section": "Lab guide",
    "sort": 70
  },
  {
    "id": "supplemental_flashcards",
    "group_type": "supplemental",
    "label": "Flashcards",
    "kind": "Flashcards",
    "section": "Flashcards",
    "sort": 80
  },
  {
    "id": "supplemental_document",
    "group_type": "supplemental",
    "label": "Document",
    "kind": "Document",
    "section": "Documents",
    "sort": 90
  },
  {
    "id": "supplemental_local_media",
    "group_type": "supplemental",
    "label": "Supplemental video",
    "kind": "Local Media Source",
    "section": "Videos",
    "sort": 100
  },
  {
    "id": "supplemental_other",
    "group_type": "supplemental",
    "label": "Other",
    "kind": "Document",
    "section": "Other",
    "sort": 110
  },
  {
    "id": "inbox",
    "group_type": "inbox",
    "label": "Inbox (unassigned)",
    "kind": "Document",
    "section": "Inbox",
    "sort": 1000
  }
];

export const RESOURCE_ROLE_BY_ID = Object.fromEntries(
  RESOURCE_ROLES.map((role) => [role.id, role])
) as Record<string, ResourceRoleDef>;

export const ESSENTIAL_ROLES = RESOURCE_ROLES.filter((r) => r.group_type === "essential");
export const LECTURE_ROLES = RESOURCE_ROLES.filter((r) => r.group_type === "lecture");
export const SUPPLEMENTAL_ROLES = RESOURCE_ROLES.filter((r) => r.group_type === "supplemental");
