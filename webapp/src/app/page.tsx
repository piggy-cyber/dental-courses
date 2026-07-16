import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInPanel } from "@/components/SignInPanel";
import { BrandMarkPublic } from "@/components/BrandMark";
import { AccessRequestForm } from "@/components/AccessRequestForm";
import { getSessionProfile } from "@/lib/access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const STUDY_LAYERS = [
  ["01", "Lectures", "Recordings and transcripts stay paired."],
  ["02", "Course files", "Slides, syllabi, and guides stay in context."],
  ["03", "Student tools", "Contacts, planning, and course utilities."],
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
          <Link href="/about">Our story</Link>
          <Link href="/legal">Privacy and terms</Link>
        </nav>
      </header>

      <section className="fc-public-hero" data-fc-reveal>
        <div className="fc-public-copy">
          <p className="eyebrow">Independent dental education workspace</p>
          <h1>The study layer dental school was missing.</h1>
          <p className="fc-public-lead">
            Lectures, transcripts, Course Mastery Guides, class tools, and course files—connected in one private place built for how dental students actually study.
          </p>

          <div className="fc-public-layers">
            {STUDY_LAYERS.map(([number, title, detail]) => (
              <article key={number}>
                <span>{number}</span>
                <div><h2>{title}</h2><p>{detail}</p></div>
              </article>
            ))}
          </div>
        </div>

        <div className="fc-public-visual" aria-label="Microscopy-inspired Fourth Canal brand image">
          <Image
            src="/brand/fourth-canal-hero-brand-image-v2.png"
            alt="Enamel microscopy field with four anatomical canal strands"
            fill
            priority
            sizes="(max-width: 900px) 100vw, 48vw"
          />
          <div className="fc-public-visual-label">
            <span>ANATOMICAL ATLAS / 04</span>
            <b>The fourth strand is the signal.</b>
          </div>
        </div>

        <aside className="fc-signin-card" aria-labelledby="signin-title">
          <p className="eyebrow">Private student access</p>
          <h2 id="signin-title">Open your workspace.</h2>
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
      </section>
    </main>
  );
}
