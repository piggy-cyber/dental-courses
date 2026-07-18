import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GuideToc } from "@/components/GuideReaderControls";
import { GuideTableEnhancer } from "@/components/GuideTableEnhancer";
import { GuideWorkspace } from "@/components/GuideWorkspace";
import { PublicHeader } from "@/components/PublicHeader";
import { StructuredData } from "@/components/StructuredData";
import { getPublicGuideCourse, getPublicGuideCourses } from "@/lib/public-guides";
import type { GuideView } from "@/components/GuideViewToggle";

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
  searchParams,
}: {
  params: Promise<{ course: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { course: slug } = await params;
  const { view } = await searchParams;
  const course = getPublicGuideCourse(slug);
  if (!course) notFound();

  const initialView: GuideView = view === "mastery" || view === "split" ? view : "textbook";
  const prefixGuide = (type: "textbook" | "mastery") => {
    const guide = course.guides[type];
    const prefix = `${type}-`;
    return {
      ...guide,
      sections: guide.sections.map((section) => ({ ...section, id: `${prefix}${section.id}` })),
      html: guide.html
        .replaceAll('id="', `id="${prefix}`)
        .replaceAll('href="#', `href="#${prefix}`),
    };
  };
  const textbook = prefixGuide("textbook");
  const mastery = prefixGuide("mastery");

  return (
    <div className="fc-site public-core-page public-guide-reader-page">
      <PublicHeader />
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://fourthcanal.com/" },
            { "@type": "ListItem", position: 2, name: "Study guides", item: "https://fourthcanal.com/guides" },
            { "@type": "ListItem", position: 3, name: `${course.code} ${course.title}`, item: `https://fourthcanal.com/guides/${course.slug}` },
          ],
        }}
      />
      <main className="public-guide-reader-main">
        <nav className="public-core-breadcrumb" aria-label="Breadcrumb">
          <Link href="/guides">Guides</Link><span aria-hidden="true">/</span><span>{course.code}</span>
        </nav>

        <GuideWorkspace initialView={initialView}>
          <header className="public-guide-reader-hero">
            <p className="eyebrow">{course.code} · Two connected ways to study</p>
            <h1>{course.title}</h1>
            <p>Use the Textbook Companion for the full course story, switch to the Course Mastery Guide for fast review, or place both beside each other when you want to compare.</p>
          </header>

          <div className="public-guide-panels">
            {[
              { key: "textbook" as const, guide: textbook, eyebrow: "Full context" },
              { key: "mastery" as const, guide: mastery, eyebrow: "Fast review" },
            ].map(({ key, guide, eyebrow }) => {
              const articleId = `${key}-guide-article`;
              return (
                <section className="public-guide-panel" data-guide-type={key} key={key}>
                  <header className="public-guide-panel-heading">
                    <p className="eyebrow">{eyebrow}</p>
                    <h2>{guide.title}</h2>
                    <p>{guide.summary}</p>
                  </header>
                  <div className="public-guide-reader-layout">
                    <GuideToc articleId={articleId} sections={guide.sections} courseHref="/guides" />
                    <article
                      id={articleId}
                      className="public-guide-body"
                      dangerouslySetInnerHTML={{ __html: guide.html }}
                    />
                  </div>
                </section>
              );
            })}
          </div>
        </GuideWorkspace>

        <GuideTableEnhancer />
        <aside className="public-guide-disclaimer">
          Student-created study support—not official course or clinical guidance. Check important details against faculty instructions and primary sources.
        </aside>
      </main>
    </div>
  );
}
