import type { EssentialSlot } from "@/lib/resource-kinds";
import { placeholderResourceName } from "@/lib/resource-kinds";

export type CourseTemplateEssential = {
  slot: EssentialSlot;
  kind: string;
  isCanonicalSyllabus: boolean;
  optional?: boolean;
};

export type CourseTemplate = {
  id: string;
  label: string;
  description: string;
  defaultLectureCount: number;
  minLectureCount: number;
  maxLectureCount: number;
  essentials: CourseTemplateEssential[];
};

export const STANDARD_D1_TEMPLATE: CourseTemplate = {
  id: "standard-d1",
  label: "Standard lecture course",
  description:
    "Syllabus, mastery guide, optional textbook companion, and numbered lecture slots.",
  defaultLectureCount: 12,
  minLectureCount: 1,
  maxLectureCount: 30,
  essentials: [
    { slot: "syllabus", kind: "Syllabus", isCanonicalSyllabus: true },
    { slot: "mastery", kind: "Course Mastery Guide", isCanonicalSyllabus: false },
    { slot: "companion", kind: "Textbook Companion", isCanonicalSyllabus: false, optional: true },
  ],
};

export const COURSE_TEMPLATES: CourseTemplate[] = [STANDARD_D1_TEMPLATE];

export function getCourseTemplate(id: string): CourseTemplate | null {
  return COURSE_TEMPLATES.find((t) => t.id === id) ?? null;
}

export function lectureSlotTitle(index: number): string {
  return `Lecture ${index}`;
}

export { placeholderResourceName };
