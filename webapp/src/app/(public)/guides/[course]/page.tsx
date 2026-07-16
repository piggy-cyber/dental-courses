import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/components/PublicHeader";
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

  const guideCards = [
    {
      label: "Focused review",
      title: "Course Mastery Guide",
      detail: course.guides.mastery.summary,
      guide: course.guides.mastery,
      index: "01",
    },
    {
      label: "Deeper study",
      title: "Textbook Companion",
      detail: course.guides.textbook.summary,
      guide: course.guides.textbook,
      index: "02",
    },
  ];

  return (
    <div className="fc-site public-core-page public-course-page">
      <PublicHeader />
      <main className="public-course-main">
        <nav className="public-core-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/guides">Guides</Link><span aria-hidden="true">/</span><span>{course.code}</span>
        </nav>
        <header className="public-course-hero">
          <p className="eyebrow">{course.code}</p>
          <h1>{course.title}</h1>
          <p>Two paths through the course. Start focused or go deep.</p>
        </header>
        <section className="public-course-guide-grid" aria-label={`${course.code} guides`}>
          {guideCards.map((card) => (
            <article key={card.index}>
              <div><span>{card.index}</span><small>{card.label}</small></div>
              <h2>{card.title}</h2>
              <p>{card.detail}</p>
              <dl>
                <div><dt>Format</dt><dd>Webpage</dd></div>
                <div><dt>Sections</dt><dd>{card.guide.sections.length}</dd></div>
              </dl>
              <Link href={`/guides/${course.slug}/${card.guide.slug}`}>
                Read online <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
