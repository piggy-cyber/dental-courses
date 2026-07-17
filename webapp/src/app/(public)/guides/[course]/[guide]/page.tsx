import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/components/PublicHeader";
import { GuideToc } from "@/components/GuideReaderControls";
import { GuideTableEnhancer } from "@/components/GuideTableEnhancer";
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
  const masteryHref = `/guides/${course.slug}/${course.guides.mastery.slug}`;
  const textbookHref = `/guides/${course.slug}/${course.guides.textbook.slug}`;

  const guideSwitcher = (position: "top" | "bottom") => (
    <nav className={`public-guide-switcher public-guide-switcher-${position}`} aria-label="Choose course guide">
      <span>{course.code}</span>
      <Link href={textbookHref} aria-current={type === "textbook" ? "page" : undefined}>
        <small>Full context</small><strong>Textbook Companion</strong>
      </Link>
      <Link href={masteryHref} aria-current={type === "mastery" ? "page" : undefined}>
        <small>Fast review</small><strong>Course Mastery Guide</strong>
      </Link>
    </nav>
  );

  return (
    <div className="fc-site public-core-page public-guide-reader-page">
      <PublicHeader />
      <main className="public-guide-reader-main">
        <nav className="public-core-breadcrumb" aria-label="Breadcrumb">
          <Link href="/guides">Guides</Link><span aria-hidden="true">/</span><Link href={`/guides/${course.slug}`}>{course.code}</Link><span aria-hidden="true">/</span><span>{type === "mastery" ? "Mastery Guide" : "Textbook Companion"}</span>
        </nav>

        {guideSwitcher("top")}

        <header className="public-guide-reader-hero">
          <p className="eyebrow">{course.code} · {type === "mastery" ? "Focused review" : "Deeper study"}</p>
          <h1>{type === "mastery" ? "Course Mastery Guide" : "Textbook Companion"}</h1>
          <p><strong>{course.title}</strong> · {guide.summary}</p>
        </header>

        <div className="public-guide-reader-layout">
          <GuideToc sections={guide.sections} courseHref="/guides" />
          <article
            className="public-guide-body"
            dangerouslySetInnerHTML={{ __html: guide.html }}
          />
        </div>

        <GuideTableEnhancer />
        {guideSwitcher("bottom")}

        <aside className="public-guide-disclaimer">
          Student-created study support—not official course or clinical guidance. Check important details against faculty instructions and primary sources.
        </aside>
      </main>
    </div>
  );
}
