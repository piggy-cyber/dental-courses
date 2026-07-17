import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getPublicGuide, getPublicGuideCourses } from "@/lib/public-guides";

export function generateStaticParams() {
  return getPublicGuideCourses().flatMap((course) => [
    { course: course.slug, guide: course.guides.mastery.slug },
    { course: course.slug, guide: course.guides.textbook.slug },
  ]);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ course: string; guide: string }>;
}): Promise<Metadata> {
  const values = await params;
  const result = getPublicGuide(values.course, values.guide);
  if (!result) return {};
  return {
    title: result.guide.title,
    description: result.guide.summary,
    alternates: { canonical: `/guides/${result.course.slug}/${result.guide.slug}` },
  };
}

export default async function PublicGuideReaderPage({
  params,
}: {
  params: Promise<{ course: string; guide: string }>;
}) {
  const values = await params;
  const result = getPublicGuide(values.course, values.guide);
  if (!result) notFound();
  const view = result.type === "mastery" ? "mastery" : "textbook";
  redirect(`/guides/${result.course.slug}?view=${view}`);
}
