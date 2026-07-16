import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/components/PublicHeader";
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
  const { course, guide, type } = result;

  return (
    <div className="fc-site public-core-page public-guide-reader-page">
      <PublicHeader />
      <main className="public-guide-reader-main">
        <nav className="public-core-breadcrumb" aria-label="Breadcrumb">
          <Link href="/guides">Guides</Link><span aria-hidden="true">/</span><Link href={`/guides/${course.slug}`}>{course.code}</Link><span aria-hidden="true">/</span><span>{type === "mastery" ? "Mastery Guide" : "Textbook Companion"}</span>
        </nav>

        <header className="public-guide-reader-hero">
          <p className="eyebrow">{course.code} · {type === "mastery" ? "Focused review" : "Deeper study"}</p>
          <h1>{type === "mastery" ? "Course Mastery Guide" : "Textbook Companion"}</h1>
          <p>{guide.summary}</p>
        </header>

        <div className="public-guide-reader-layout">
          <aside className="public-guide-toc">
            <p className="eyebrow">On this page</p>
            <nav aria-label="Guide sections">
              {guide.sections.map((section) => (
                <a href={`#${section.id}`} key={section.id}>{section.title}</a>
              ))}
            </nav>
            <Link href={`/guides/${course.slug}`}>Back to {course.code}</Link>
          </aside>
          <article
            className="public-guide-body"
            dangerouslySetInnerHTML={{ __html: guide.html }}
          />
        </div>

        <aside className="public-guide-disclaimer">
          Student-created study support—not official course or clinical guidance. Check important details against faculty instructions and primary sources.
        </aside>
      </main>
    </div>
  );
}
