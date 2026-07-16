import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/PublicHeader";
import { getPublicGuideCourses } from "@/lib/public-guides";

export const metadata: Metadata = {
  title: "Dental Course Guides",
  description: "Web-readable Course Mastery Guides and Textbook Companions for dental students.",
  alternates: { canonical: "/guides" },
};

export default function GuidesIndexPage() {
  const courses = getPublicGuideCourses();

  return (
    <div className="fc-site public-core-page public-guides-page">
      <PublicHeader />
      <main className="public-guides-main">
        <header className="public-guides-hero">
          <p className="eyebrow">Open course guides</p>
          <h1>Read the guide.<br />Not the file format.</h1>
          <p>
            Every course is reduced to two useful paths: a focused Course Mastery Guide and a deeper Textbook Companion. Both are searchable, responsive webpages.
          </p>
          <div><span>{courses.length}</span><small>courses online</small></div>
        </header>

        <section className="public-guides-index" aria-labelledby="course-index-title">
          <div className="public-core-section-heading">
            <div><p className="eyebrow">Course index</p><h2 id="course-index-title">Choose a course.</h2></div>
            <p>Each page contains only the two study guides.</p>
          </div>
          <div className="public-guides-list">
            {courses.map((course, index) => (
              <Link href={`/guides/${course.slug}`} key={course.code}>
                <span className="public-guides-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="public-guides-code">{course.code}</span>
                <span className="public-guides-title"><b>{course.title}</b><small>Mastery Guide + Textbook Companion</small></span>
                <span className="public-guides-arrow" aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
