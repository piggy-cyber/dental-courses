import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/PublicHeader";

export const metadata: Metadata = {
  title: "Legal Center",
  description:
    "Fourth Canal privacy, acceptable-use, copyright, disclaimer, AI-use, and security policies.",
  alternates: { canonical: "/legal" },
};

const SECTIONS = [
  ["privacy", "Privacy"],
  ["terms", "Terms & acceptable use"],
  ["disclaimer", "Disclaimers"],
  ["copyright", "Copyright & removal requests"],
  ["ai", "AI-assisted material"],
  ["security", "Security & governance"],
] as const;

export default async function LegalPage() {
  return (
    <div className="fc-site app-shell-bg min-h-screen text-brand-ink">
      <PublicHeader />

      <main className="mx-auto grid max-w-5xl gap-8 px-4 py-10 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="h-fit border border-brand-line bg-brand-panel p-4 lg:sticky lg:top-24">
          <p className="eyebrow">Legal center</p>
          <nav className="mt-3 space-y-1" aria-label="Legal sections">
            {SECTIONS.map(([href, label]) => (
              <a
                key={href}
                href={`#${href}`}
                className="block border-l-2 border-transparent px-2 py-1.5 text-sm font-semibold text-brand-blue hover:border-brand-blue hover:bg-brand-soft"
              >
                {label}
              </a>
            ))}
          </nav>
        </aside>

        <div className="space-y-6">
          <header className="app-card p-6 sm:p-8">
            <p className="eyebrow">Policies and safeguards</p>
            <h1 className="portal-title mt-2 text-3xl font-bold">Legal Center</h1>
            <p className="mt-2 text-sm font-semibold text-brand-navy">
              Effective and last updated: July 16, 2026
            </p>
            <p className="mt-3 max-w-3xl leading-relaxed text-brand-muted">
              These rules explain how this independent, student-run service handles data,
              limits use, responds to rights-holder concerns, and labels AI-assisted study
              material. They are guardrails—not permission to use material unlawfully and not
              legal advice.
            </p>
          </header>

          <section id="privacy" className="app-card scroll-mt-24 p-6 prose-brand">
            <p className="eyebrow">01 / Privacy</p>
            <h2 className="mt-2">What the site handles</h2>
            <p>
              The service may handle account details such as name, email address, Google profile
              image, saved game progress, role, access status, course access, support reports, and administrative notes.
              If a user chooses to connect them, it may also handle a connected calendar-feed
              URL and a GroupMe access token. Course files, transcripts, study materials, and access
              records are stored to operate the library.
            </p>
            <h2>Why the data is used</h2>
            <p>
              Data is used to authenticate users, save study-game progress, and operate connected services,
              display schedules, send requested class notifications, investigate reports, secure
              the service, and maintain continuity between student operators. Personal data is not
              sold.
            </p>
            <h2>Service providers and connected services</h2>
            <p>
              The current service relies on Supabase for Google authentication, database services,
              and file storage; Vercel for hosting; Canvas calendar feeds and GroupMe only when a
              user connects them; and Open-Meteo for campus weather. Each provider may process the
              limited data needed to deliver its service under its own terms.
            </p>
            <h2>Student and sensitive information</h2>
            <p>
              This is not an official university record system. Do not upload grades, patient
              information, protected health information, clinical records, government identifiers,
              or confidential records about another student. Users may ask the site operator to
              review, correct, or delete their account data, subject to legitimate security and
              record-retention needs.
            </p>
          </section>

          <section id="terms" className="app-card scroll-mt-24 p-6 prose-brand">
            <p className="eyebrow">02 / Terms and acceptable use</p>
            <h2 className="mt-2">Public tools and account access</h2>
            <p>
              Public games, calculators, and guides may be used without an account. Account-based
              progress is personal. Some operator and connected-service areas use additional access controls.
              An account may not be shared or used to give another person access to restricted material.
            </p>
            <h2>Prohibited use</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>Do not publicly repost, sell, mass-download, scrape, or redistribute restricted content.</li>
              <li>Do not bypass access controls, probe other accounts, or interfere with the service.</li>
              <li>Do not upload material unless you have the right or authorization to share it here.</li>
              <li>Do not use the service for patient care, diagnosis, grading, harassment, or academic misconduct.</li>
              <li>Do not misrepresent the service as an official university system or communication.</li>
            </ul>
            <h2>Ownership and suspension</h2>
            <p>
              The service does not claim ownership of third-party course material. All rights stay
              with their respective owners. Access may be restricted or removed to protect users,
              investigate a report, comply with law, or enforce these rules. The service is provided
              as available without a guarantee of completeness, accuracy, or uninterrupted access.
            </p>
          </section>

          <section id="disclaimer" className="app-card scroll-mt-24 p-6 prose-brand">
            <p className="eyebrow">03 / Disclaimers and limits</p>
            <h2 className="mt-2">Independent educational tool</h2>
            <p>
              Fourth Canal is an independent, student-run study tool. It is not affiliated with,
              endorsed by, sponsored by, or representative of Case Western Reserve University,
              its School of Dental Medicine, faculty, or any course-material owner. References to
              a school, course, instructor, or platform identify context only and do not imply an
              official relationship.
            </p>
            <h2>No academic, clinical, or professional advice</h2>
            <p>
              Content is provided for study support and general educational information.
              It is not official course instruction, a clinical protocol, patient-care guidance,
              legal advice, or a substitute for faculty direction, source materials, professional
              judgment, or applicable policies. Users must independently verify important
              information before relying on it.
            </p>
            <h2>No warranties</h2>
            <p>
              To the fullest extent permitted by applicable law, the service and its content are
              provided as available and without warranties of accuracy, completeness, fitness for
              a particular purpose, non-infringement, uninterrupted operation, or continued
              availability. Links and third-party services remain subject to their own terms.
            </p>
            <h2>Responsibility and limitation</h2>
            <p>
              Users remain responsible for how they access, upload, share, and use material. To
              the fullest extent permitted by applicable law, the site owner and student operators
              are not responsible for decisions, losses, academic consequences, service outages,
              or other harm arising from reliance on the service or its content. Nothing here
              excludes a responsibility that applicable law does not allow to be excluded.
            </p>
          </section>

          <section id="copyright" className="app-card scroll-mt-24 p-6 prose-brand">
            <p className="eyebrow">04 / Copyright and removal requests</p>
            <h2 className="mt-2">Rights-holder reports</h2>
            <p>
              The site respects intellectual-property rights and will review credible removal
              requests. A report should identify the material, its exact page or course location,
              the rights claimed, the reporter&apos;s authority to act, contact information, and a
              good-faith statement that the complained-of use is not authorized.
            </p>
            <h2>Response process</h2>
            <p>
              The site operator may temporarily restrict access while investigating, preserve a
              minimal audit record, request clarification, remove or replace the material, and
              notify the person who supplied it when appropriate. Repeated or deliberate violations
              may result in account removal. A disclaimer does not override an owner&apos;s rights.
            </p>
            <div className="portal-notice mt-5 p-4 text-sm">
              <p className="font-bold text-brand-navy">How to report a concern</p>
              <p className="mt-1 text-brand-muted">
                Use the signed-in report tool or contact the current site operator. Include the
                course, lecture, filename, and exact page so access can be restricted quickly while
                the request is reviewed.
              </p>
            </div>
          </section>

          <section id="ai" className="app-card scroll-mt-24 p-6 prose-brand">
            <p className="eyebrow">05 / AI-assisted material</p>
            <h2 className="mt-2">Human review remains required</h2>
            <p>
              Study notes, summaries, questions, classifications, and announcements may be drafted
              with AI. AI output can omit context, invent facts, or misunderstand a source. Every
              published item should identify its source material, be reviewed by a person, and be
              corrected when a reliable source conflicts with it.
            </p>
            <p>
              AI-assisted material is for study support only. It is not clinical advice, an official
              course instruction, a grade prediction, or a substitute for faculty guidance,
              textbooks, syllabi, or professional judgment.
            </p>
          </section>

          <section id="security" className="app-card scroll-mt-24 p-6 prose-brand">
            <p className="eyebrow">06 / Security and governance</p>
            <h2 className="mt-2">Minimum operating safeguards</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>Use private storage, signed access, least-privilege accounts, and separate admin roles.</li>
              <li>Never place passwords, access tokens, private feed URLs, or roster data in public pages or source code.</li>
              <li>Record important admin actions and review access when student operators change.</li>
              <li>Disable former operators promptly and transfer ownership without sharing personal credentials.</li>
              <li>Report suspected account compromise, exposed files, or incorrect access immediately.</li>
            </ul>
            <p>
              Policy, contact, retention, and provider details should be reviewed whenever the site
              adds a new integration or changes ownership.
            </p>
          </section>

          <div className="flex flex-wrap gap-3">
            <Link href="/" className="portal-button-primary px-5 py-2.5">
              Back to study desk
            </Link>
            <Link href="/about" className="portal-button px-5 py-2.5">
              About this site
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
