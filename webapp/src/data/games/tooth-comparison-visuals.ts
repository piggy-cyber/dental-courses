import type { EvidenceStatus, SourceRef } from "@/lib/games/tooth-comparison-types";

type ToothVisualMetadata = {
  viewLabel: string;
  landmark: string;
  evidenceStatus: EvidenceStatus;
  sourceRefs: SourceRef[];
};

export const TOOTH_COMPARISON_VISUALS = {
  "max-central-incisor": {
    viewLabel: "Facial + lingual landmarks",
    landmark: "Broad crown · sharp mesioincisal corner",
    evidenceStatus: "course-verified",
    sourceRefs: [
      { courseCode: "REHE 151", sourceName: "REHE 151 Dental Anatomy Course Mastery Guide.pdf", locator: "page 8, Incisors table" },
      { courseCode: "REHE 151", sourceName: "REHE 151 - max ci recording.txt", locator: "transcript 6:43–16:57" },
    ],
  },
  "max-lateral-incisor": {
    viewLabel: "Facial + lingual landmarks",
    landmark: "Rounder crown · centered cingulum",
    evidenceStatus: "course-verified",
    sourceRefs: [
      { courseCode: "REHE 151", sourceName: "REHE 151 Dental Anatomy Course Mastery Guide.pdf", locator: "page 8, Incisors table" },
      { courseCode: "REHE 151", sourceName: "REHE 151 - max li 8 31 2021.txt", locator: "transcript 0:00–5:27" },
    ],
  },
  "mand-central-incisor": {
    viewLabel: "Facial + incisal landmarks",
    landmark: "Smallest crown · bilateral symmetry",
    evidenceStatus: "course-verified",
    sourceRefs: [
      { courseCode: "REHE 151", sourceName: "REHE 151 Dental Anatomy Course Mastery Guide.pdf", locator: "page 8, Incisors table" },
      { courseCode: "REHE 151", sourceName: "REHE 151 - mand ci 9 2 21final.txt", locator: "transcript 1:45–7:46" },
    ],
  },
  "mand-lateral-incisor": {
    viewLabel: "Facial + incisal landmarks",
    landmark: "Distal twist · distal cingulum",
    evidenceStatus: "course-verified",
    sourceRefs: [
      { courseCode: "REHE 151", sourceName: "REHE 151 Dental Anatomy Course Mastery Guide.pdf", locator: "page 8, Incisors table" },
      { courseCode: "REHE 151", sourceName: "REHE 151 - mand li 9 2 21.txt", locator: "transcript 0:00–3:45" },
    ],
  },
  "max-canine": {
    viewLabel: "Facial + lingual landmarks",
    landmark: "Distal pinch · prominent facial ridge",
    evidenceStatus: "course-verified",
    sourceRefs: [
      { courseCode: "REHE 151", sourceName: "da 3 Max C 2024.ppt", locator: "slides 7–25" },
      { courseCode: "REHE 151", sourceName: "REHE 151 Dental Anatomy and Occlusion Textbook Companion.pdf", locator: "pages 8–9" },
    ],
  },
  "mand-canine": {
    viewLabel: "Facial + lingual landmarks",
    landmark: "Slender crown · cusp follows arch",
    evidenceStatus: "course-verified",
    sourceRefs: [
      { courseCode: "REHE 151", sourceName: "da 3 Mand C 2024.ppt", locator: "slides 4–16" },
      { courseCode: "REHE 151", sourceName: "REHE 151 Dental Anatomy and Occlusion Textbook Companion.pdf", locator: "pages 8–9" },
    ],
  },
  "max-first-premolar": {
    viewLabel: "Occlusal + F/L root inset",
    landmark: "Tapered hexagon · mesial groove · common two-root variant (61%)",
    evidenceStatus: "course-verified",
    sourceRefs: [
      { courseCode: "REHE 151", sourceName: "da 5 Max PM1 2024.ppt", locator: "slides 12–15 and 19–22" },
      { courseCode: "REHE 151", sourceName: "REHE 151 Dental Anatomy Course Mastery Guide.pdf", locator: "page 9" },
    ],
  },
  "max-second-premolar": {
    viewLabel: "Occlusal + root map",
    landmark: "Rounded table · supplemental grooves",
    evidenceStatus: "course-verified",
    sourceRefs: [
      { courseCode: "REHE 151", sourceName: "da 5 Max PM2 2024.ppt", locator: "slides 6–7 and 22–29" },
      { courseCode: "REHE 151", sourceName: "REHE 151 Dental Anatomy Course Mastery Guide.pdf", locator: "page 9" },
    ],
  },
  "mand-first-premolar": {
    viewLabel: "Occlusal + root map",
    landmark: "Diamond table · dominant facial cusp",
    evidenceStatus: "course-verified",
    sourceRefs: [
      { courseCode: "REHE 151", sourceName: "da 5 Mand PM1 2021 9 2 a.ppt", locator: "slides 15–34" },
      { courseCode: "REHE 151", sourceName: "REHE 151 Dental Anatomy Course Mastery Guide.pdf", locator: "page 9" },
    ],
  },
  "mand-second-premolar": {
    viewLabel: "Occlusal + root map",
    landmark: "Functional lingual cusps · H/U or Y grooves",
    evidenceStatus: "course-verified",
    sourceRefs: [
      { courseCode: "REHE 151", sourceName: "da 5 Mand PM 2 2021 9 23 a.ppt", locator: "slides 7–28" },
      { courseCode: "REHE 151", sourceName: "REHE 151 Dental Anatomy Course Mastery Guide.pdf", locator: "page 9" },
    ],
  },
  "max-first-molar": {
    viewLabel: "Occlusal + root map",
    landmark: "Full talon · oblique ridge · three roots",
    evidenceStatus: "course-verified",
    sourceRefs: [
      { courseCode: "REHE 151", sourceName: "da 6 Max M1 2024.ppt", locator: "slides 3–30" },
      { courseCode: "REHE 151", sourceName: "REHE 151 Dental Anatomy and Occlusion Textbook Companion.pdf", locator: "pages 11–12" },
    ],
  },
  "max-second-molar": {
    viewLabel: "Occlusal + root map",
    landmark: "Reduced talon · closer three-root plan",
    evidenceStatus: "course-verified",
    sourceRefs: [
      { courseCode: "REHE 151", sourceName: "da 6 Max M2 M3 2020.ppt", locator: "slides 2–26" },
      { courseCode: "REHE 151", sourceName: "REHE 151 Dental Anatomy and Occlusion Textbook Companion.pdf", locator: "page 12" },
    ],
  },
  "mand-first-molar": {
    viewLabel: "Occlusal + root map",
    landmark: "Five cusps · Y pattern · wide roots",
    evidenceStatus: "course-verified",
    sourceRefs: [
      { courseCode: "REHE 151", sourceName: "da 7 Maand M1 2020.ppt", locator: "slides 4–22" },
      { courseCode: "REHE 151", sourceName: "REHE 151 Dental Anatomy Course Mastery Guide.pdf", locator: "page 10" },
    ],
  },
  "mand-second-molar": {
    viewLabel: "Occlusal + root map",
    landmark: "Four cusps · plus pattern · close roots",
    evidenceStatus: "course-verified",
    sourceRefs: [
      { courseCode: "REHE 151", sourceName: "da 7 Maand M2 M3 2020 9 22 2020.ppt", locator: "slides 4–18" },
      { courseCode: "REHE 151", sourceName: "REHE 151 Dental Anatomy Course Mastery Guide.pdf", locator: "page 10" },
    ],
  },
} satisfies Record<string, ToothVisualMetadata>;

export type ToothComparisonVisualId = keyof typeof TOOTH_COMPARISON_VISUALS;
