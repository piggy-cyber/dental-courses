import type { Metadata } from "next";
import Link from "next/link";
import { GradeCalculator } from "@/components/GradeCalculator";
import { PublicHeader } from "@/components/PublicHeader";
import { getGradeCalculatorPreset } from "@/lib/grade-calculator-presets";

export const metadata: Metadata = {
  title: "Grade Calculator",
  description: "Calculate your current course grade and plan what you need on remaining work.",
  alternates: { canonical: "/grade-calculator" },
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
    <div className="fc-site public-core-page public-tool-page">
      <PublicHeader />
      <main className="public-tool-main">
        <nav className="public-core-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link><span aria-hidden="true">/</span><span>Grade calculator</span>
        </nav>
        <header className="public-tool-hero">
          <p className="eyebrow">Free student tool</p>
          <h1>Know where you stand.</h1>
          <p>
            Enter each score and how much it counts. Your current grade and the average needed on remaining work update automatically—nothing is uploaded or saved.
          </p>
          {requestedCourseCode && !preset && (
            <p className="portal-notice mt-4 max-w-3xl px-3 py-2 text-sm">
              {requestedCourseCode} does not have a saved grading setup yet, so this opened the generic calculator.
            </p>
          )}
        </header>
        <GradeCalculator
          key={preset?.courseCode ?? requestedCourseCode ?? "generic"}
          preset={preset}
          requestedCourseCode={requestedCourseCode}
        />
      </main>
    </div>
  );
}
