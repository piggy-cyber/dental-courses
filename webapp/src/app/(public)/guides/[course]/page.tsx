import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getPublicGuideCourse, getPublicGuideCourses } from "@/lib/public-guides";

export function generateStaticParams() {
  return getPublicGuideCourses().map((course) => ({ course: course.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ course: string }>;
}): Promise<Metadata> {
  const { course: slug } = await params;
  const course = getPublicGuideCourse(slug);
  if (!course) return {};
  return {
    title: `${course.code} ${course.title}`,
    description: `Read the ${course.code} Course Mastery Guide and Textbook Companion online.`,
    alternates: { canonical: `/guides/${course.slug}` },
  };
}

export default async function PublicCourseGuidePage({
  params,
}: {
  params: Promise<{ course: string }>;
}) {
  const { course: slug } = await params;
  const course = getPublicGuideCourse(slug);
  if (!course) notFound();

  redirect(`/guides/${course.slug}/${course.guides.textbook.slug}`);
}
