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
            About the D1 Course Library
          </h1>
        </>
      )}
      <p className={compact ? "text-brand-muted" : "mt-4 text-lg leading-relaxed text-brand-muted"}>
        The D1 Course Library is a dedicated study desk for our Case Western
        Reserve University Health Education Campus cohort. It provides a single,
        organized place to watch lectures, read transcripts, and open course files
        without jumping between Canvas, Drive, and YouTube.
      </p>

      <h2>What&apos;s Inside</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong>Lectures in Order</strong> — embedded YouTube videos and
          transcripts when available.
        </li>
        <li>
          <strong>Course Mastery Guides</strong> — condensed cheat sheets for
          each course.
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
            lecture videos. It is an independent project maintained by the
            First-Year Class Presidency to support our collective success in
            dental school.
          </p>

          <h2>How to Contribute</h2>
          <p>
            Because this is a collaborative tool, it relies on shared effort. If
            you have updated notes, corrected study guides, or notice a broken
            link, please share them so the entire class can benefit.
          </p>

          <h2>Disclaimer</h2>
          <p className="rounded-xl border border-brand-line bg-white/70 p-4 text-sm">
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
          Independent, student-run, and maintained by the First-Year Class
          Presidency for peer-to-peer study support.
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
        className="mt-4 inline-flex text-sm font-semibold text-brand-blue hover:underline"
      >
        Read the full about page →
      </Link>
    </section>
  );
}
