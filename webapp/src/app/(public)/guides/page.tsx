import type { Metadata } from "next";
import { PublicCourseDirectory } from "@/components/PublicCourseDirectory";
import { PublicHeader } from "@/components/PublicHeader";
import { getPublicGuideCourses } from "@/lib/public-guides";

const DEPARTMENT_LABELS: Record<string, string> = {
  DSPR: "Disease processes",
  HEWB: "Health and wellbeing",
  HWDP: "Health and disease",
  LDRS: "Professional development",
  MAHE: "Community health",
  REHE: "Restorative health",
};

export const metadata: Metadata = {
  title: "Dental Course Guides",
  description: "Web-readable Course Mastery Guides and Textbook Companions for dental students.",
  alternates: { canonical: "/guides" },
};

export default function GuidesIndexPage() {
  const courses = getPublicGuideCourses();
  const directoryCourses = courses.map((course) => {
    const prefix = course.code.split(" ")[0];
    return {
      code: course.code,
      slug: course.slug,
      title: course.title,
      department: DEPARTMENT_LABELS[prefix] ?? "Dental studies",
    };
  });

  return (
    <div className="fc-site public-core-page public-guides-page">
      <PublicHeader />
      <main className="public-guides-main">
        <header className="public-guides-hero">
          <p className="eyebrow">Course guide directory</p>
          <h1>Choose the course.<br />Start with the full story.</h1>
          <p>
            A course opens directly to its Textbook Companion for complete context. Switch to the Course Mastery Guide from the top or bottom whenever you want a faster review.
          </p>
          <div className="public-guides-hero-signal" aria-hidden="true"><span>04</span><small>find the useful layer</small></div>
        </header>

        <section className="public-guides-index" aria-labelledby="course-index-title">
          <div className="public-core-section-heading">
            <div><p className="eyebrow">Course directory</p><h2 id="course-index-title">Find a course.</h2></div>
            <p>Search by course name or code, or narrow the directory by subject.</p>
          </div>
          <PublicCourseDirectory courses={directoryCourses} />
        </section>
      </main>
    </div>
  );
}
