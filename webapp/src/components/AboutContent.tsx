import Link from "next/link";

type AboutContentProps = {
  compact?: boolean;
};

export function AboutContent({ compact = false }: AboutContentProps) {
  return (
    <div className="prose-brand space-y-1">
      {!compact && (
        <>
          <p className="eyebrow">Fourth Canal</p>
          <h1 className="mt-2 text-3xl font-bold text-brand-navy">
            The study layer dental school was missing.
          </h1>
        </>
      )}
      <p className={compact ? "text-brand-muted" : "mt-4 text-lg leading-relaxed text-brand-muted"}>
        Fourth Canal brings lectures, transcripts, mastery guides, course files,
        and class tools into one private workspace built for the way dental
        students actually study.
      </p>

      <h2>Everything in its place</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong>Lectures in Order</strong> — embedded YouTube videos and
          transcripts when available.
        </li>
        <li>
          <strong>Course Mastery Guides</strong> — focused study guides for each
          course.
        </li>
        <li>
          <strong>Textbook Companions</strong> — long-form study guides.
        </li>
        <li>
          <strong>Course Files</strong> — syllabi, slides, and Canvas downloads.
        </li>
      </ul>

      {!compact && (
        <>
          <h2>Look for what is easy to miss</h2>
          <p>
            Dentistry trains us to look beyond what appears complete. A fourth
            canal can be the difference between a case that looks finished and one
            that truly is. Fourth Canal follows the same idea: find the missing
            context, connect it, and make it useful.
          </p>

          <h2>Made by students. Improved by students.</h2>
          <p>
            This is cohort infrastructure, maintained by student operators and
            strengthened by corrections, better notes, and useful contributions.
          </p>

          <h2>Independent by design</h2>
          <p className="border border-brand-line bg-brand-panel p-4 text-sm">
            Fourth Canal is an independent student-run study tool, not an official
            university platform. Faculty instructions, Canvas, syllabi, and
            clinical guidance always control.
          </p>
        </>
      )}

      {compact && (
        <p className="text-sm text-brand-muted">
          Independent, student-run, and built to keep the course material students
          actually use in one coherent place.
        </p>
      )}
    </div>
  );
}

export function AboutSummary() {
  return (
    <section className="app-card p-6 text-left">
      <AboutContent compact />
      <Link
        href="/about"
        className="portal-link mt-4 inline-flex text-sm font-semibold"
      >
        Read the full about page →
      </Link>
    </section>
  );
}
