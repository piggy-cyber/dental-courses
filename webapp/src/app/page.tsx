import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInPanel } from "@/components/SignInPanel";
import { SignInMicroscope } from "@/components/SignInMicroscope";
import { BrandMarkPublic } from "@/components/BrandMark";
import { AccessRequestForm } from "@/components/AccessRequestForm";
import { getSessionProfile } from "@/lib/access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const STUDY_LAYERS = [
  ["01", "Lectures", "Recordings and transcripts stay paired."],
  ["02", "Course files", "Slides, syllabi, and guides stay attached."],
  ["03", "Student tools", "Contacts, planning, and course utilities stay close."],
  ["04", "Missing context", "The overlooked connection becomes the useful one."],
] as const;

export default async function LoginHomePage({
  searchParams,
}: {
  searchParams: Promise<{ auth_error?: string }>;
}) {
  const { profile } = await getSessionProfile();
  const params = await searchParams;

  if (profile?.status === "approved") redirect("/home");

  return (
    <main className="fc-site fc-public-page" data-integrated-footer="false">
      <header className="fc-public-header">
        <BrandMarkPublic />
        <nav aria-label="Public navigation">
          <a href="#meaning">What the name means</a>
          <Link href="/about">Our story</Link>
          <Link href="/legal">Privacy and terms</Link>
        </nav>
      </header>

      <section className="fc-entry-stage" data-fc-reveal>
        <div className="fc-entry-copy">
          <div>
            <p className="eyebrow">Independent dental education workspace · Case 04</p>
            <h1>Find the layer <em>everyone else missed.</em></h1>
            <p className="fc-entry-lead">
              Lectures, transcripts, Course Mastery Guides, class tools, and course
              files—connected in one private place built for how dental students
              actually study.
            </p>

          </div>

          <aside className="fc-entry-signin" aria-labelledby="signin-title">
            <div className="fc-entry-signin-heading">
              <div>
                <p className="eyebrow">Private student access</p>
                <h2 id="signin-title">Enter the atlas.</h2>
              </div>
              <span className="fc-entry-status"><i /> Cohort access</span>
            </div>
            <p>Use the Google account connected to your cohort access.</p>

            <div className="fc-signin-action">
              {!profile ? (
                <>
                  <SignInPanel />
                  {params.auth_error && (
                    <p className="fc-auth-error">
                      Google sign-in failed. Try again or ask the site operator to confirm your approved account.
                    </p>
                  )}
                </>
              ) : (
                <div className="fc-pending-access">
                  <strong>{profile.status === "revoked" ? "Your access is inactive." : "Your account is waiting for approval."}</strong>
                  <span>{profile.email}</span>
                  <p>
                    {profile.status === "revoked"
                      ? "Contact an admin if you think this is a mistake."
                      : "Roster matches are approved automatically. Other accounts are reviewed by a student administrator."}
                  </p>
                  {profile.status === "pending" && <AccessRequestForm initialNote={profile.access_note} />}
                  <form action="/auth/signout" method="post"><button>Sign out</button></form>
                </div>
              )}
            </div>

            <div className="fc-signin-note">
              <span className="fc-mini-canals" aria-hidden="true"><i /><i /><i /><i /></span>
              <p>Independent and student-run. Official course and clinical guidance always controls.</p>
            </div>
          </aside>

          <div className="fc-name-meaning" id="meaning">
            <span aria-hidden="true">04</span>
            <div>
              <strong>Why “Fourth Canal”? A 60-second anatomy lesson.</strong>
              <div className="fc-name-facts">
                <article>
                  <b>Inside a root</b>
                  <p>A canal is a narrow space inside a tooth root that carries pulp—the tissue, blood vessels, and nerves that keep a tooth alive.</p>
                </article>
                <article>
                  <b>The hidden fourth</b>
                  <p>Upper first molars often have a second canal in the mesiobuccal root, called MB2. Pooled CBCT research finds it in about 7 in 10.</p>
                </article>
                <article>
                  <b>Why it matters</b>
                  <p>Root canal treatment must find, clean, and seal the infected canal system. Anatomy left untreated can let disease persist.</p>
                </article>
                <article>
                  <b>Why it is our name</b>
                  <p>It represents the discipline to keep looking when the obvious map is incomplete—the same habit we bring to missing study context.</p>
                </article>
              </div>
              <small>Prevalence varies by tooth, population, and detection method.</small>
            </div>
          </div>
        </div>

        <SignInMicroscope />

        <div className="fc-entry-layers" aria-label="Four study layers">
          {STUDY_LAYERS.map(([number, title, detail]) => (
            <article key={number} className={number === "04" ? "fc-entry-layer-active" : undefined}>
              <span>{number}</span>
              <div><h2>{title}</h2><p>{detail}</p></div>
              <i aria-hidden="true">→</i>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
