import type { Metadata } from "next";
import { GradeCalculator } from "@/components/GradeCalculator";
import { getGradeCalculatorPreset } from "@/lib/grade-calculator-presets";

export const metadata: Metadata = {
  title: "Grade Calculator — Fourth Canal",
  description: "Calculate your current course grade and plan what you need on remaining work.",
};

function normalizeCourseCode(value: string | string[] | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toUpperCase();
  return normalized ? normalized.slice(0, 40) : undefined;
}

export default async function GradeCalculatorPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string | string[] }>;
}) {
  const { course } = await searchParams;
  const requestedCourseCode = normalizeCourseCode(course);
  const preset = getGradeCalculatorPreset(requestedCourseCode);

  return (
    <div className="space-y-5">
      <header className="cockpit-panel overflow-hidden">
        <div className="cockpit-section-bar">Student tool</div>
        <div className="p-5">
          <p className="eyebrow">Grade Calculator</p>
          <h1 className="portal-title mt-1 text-3xl font-bold">Know where you stand.</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-brand-muted">
            Enter each score and how much it counts toward the course. Your current grade and the average needed on remaining work update automatically.
          </p>
          {requestedCourseCode && !preset && (
            <p className="portal-notice mt-4 max-w-3xl px-3 py-2 text-sm">
              {requestedCourseCode} does not have a saved grading setup yet, so this opened the generic calculator.
            </p>
          )}
        </div>
      </header>

      <GradeCalculator
        key={preset?.courseCode ?? requestedCourseCode ?? "generic"}
        preset={preset}
        requestedCourseCode={requestedCourseCode}
      />
    </div>
  );
}
