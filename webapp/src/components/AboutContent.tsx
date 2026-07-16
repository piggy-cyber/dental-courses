import Link from "next/link";

type AboutContentProps = {
  compact?: boolean;
};

export function AboutContent({ compact = false }: AboutContentProps) {
  return (
    <div className="prose-brand space-y-1">
      {!compact && (
        <>
          <p className="eyebrow">About</p>
          <h1 className="mt-2 text-3xl font-bold text-brand-navy">
            About Fourth Canal
          </h1>
        </>
      )}
      <p className={compact ? "text-brand-muted" : "mt-4 text-lg leading-relaxed text-brand-muted"}>
        Fourth Canal is an independent, student-run study workspace for an
        approved dental-school cohort. It provides one organized place to review
        lectures, read transcripts, and open course files without jumping among
        multiple platforms.
      </p>

      <h2>What&apos;s Inside</h2>
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
          <h2>Why This Exists</h2>
          <p>
            This library was built to keep our cohort organized and ensure mastery
            guides and textbook companions sit directly next to the relevant
            lecture videos. It is maintained by student operators to support
            peer-to-peer learning and continuity between cohorts.
          </p>

          <h2>How to Contribute</h2>
          <p>
            Because this is a collaborative tool, it relies on shared effort. If
            you have updated notes, corrected study guides, or notice a broken
            link, please share them so the entire class can benefit.
          </p>

          <h2>Disclaimer</h2>
          <p className="border border-brand-line bg-brand-panel p-4 text-sm">
            This is an independent, student-run resource. It is strictly not
            affiliated with, endorsed by, sponsored by, or representative of Case
            Western Reserve University or the School of Dental Medicine. All
            materials are provided for peer-to-peer study purposes only and must
            never replace official university communications, syllabi, or Canvas.
            The accuracy of student-created guides is not guaranteed.
          </p>
        </>
      )}

      {compact && (
        <p className="text-sm text-brand-muted">
          Independent, student-run, and maintained for private peer-to-peer study
          support.
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
