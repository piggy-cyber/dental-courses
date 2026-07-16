import type { GradeCalculatorPreset } from "@/lib/grade-calculator";

// Course-specific grading structures can be added here as they are confirmed.
// A future course-page link can open /grade-calculator?course=COURSE_CODE and
// this server-side lookup will prefill labels and weights while leaving scores blank.
const COURSE_GRADE_PRESETS: Record<string, GradeCalculatorPreset> = {};

export function getGradeCalculatorPreset(
  courseCode: string | undefined,
): GradeCalculatorPreset | null {
  if (!courseCode) return null;
  return COURSE_GRADE_PRESETS[courseCode.toUpperCase()] ?? null;
}
