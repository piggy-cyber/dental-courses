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
            Built by a D1, for D1s
          </h1>
        </>
      )}
      <p className={compact ? "text-brand-muted" : "mt-4 text-lg leading-relaxed text-brand-muted"}>
        The D1 Course Library is a private study desk for our Health Education
        Campus class — one place to watch lectures, read transcripts, and open
        course files without jumping between Canvas, Drive, and YouTube.
      </p>

      <h2>What&apos;s inside</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong>Lectures in order</strong> — embedded YouTube videos and
          transcripts when available.
        </li>
        <li>
          <strong>Course Mastery Guides</strong> — condensed cheat sheets per
          course.
        </li>
        <li>
          <strong>Textbook Companions</strong> — long-form study guides.
        </li>
        <li>
          <strong>Course files</strong> — syllabi, slides, and Canvas downloads.
        </li>
      </ul>

      {!compact && (
        <>
          <h2>Who I am</h2>
          <p>
            I&apos;m <strong>Rick</strong> — a D1 in our cohort. I built this
            library because I wanted mastery guides and textbook companions
            sitting right next to each lecture video. This is a student project:
            maintained by classmates, for classmates.
          </p>

          <h2>How access works</h2>
          <p>
            Sign in with email or Google. New accounts start{" "}
            <strong>pending</strong> until the owner approves them. Files are
            served through short-lived signed links — not public downloads.
          </p>

          <h2>Disclaimer</h2>
          <p className="rounded-xl border border-brand-line bg-brand-panel p-4 text-sm">
            Student-built resource hub. Not affiliated with or endorsed by Case
            Western Reserve University or the School of Dental Medicine.
          </p>
        </>
      )}

      {compact && (
        <p className="text-sm text-brand-muted">
          Built by <strong className="text-brand-ink">Rick</strong>, a D1 in our
          cohort — student-made, not an official CWRU site.
        </p>
      )}
    </div>
  );
}

export function AboutSummary() {
  return (
    <section className="rounded-xl border border-brand-line bg-brand-panel p-6 text-left shadow-sm">
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
