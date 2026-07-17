import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicSignalPanel } from "@/components/PublicSignalPanel";
import { SignInPanel } from "@/components/SignInPanel";
import { getSessionProfile } from "@/lib/access";
import { getPublicGuideCourses } from "@/lib/public-guides";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const CORE_TOOLS = [
  {
    number: "01",
    eyebrow: "Play",
    title: "Tooth Quest",
    detail: "Learn Universal tooth numbering on a visual arch, then test recall against the clock.",
    href: "/games",
    action: "Play the game",
  },
  {
    number: "02",
    eyebrow: "Calculate",
    title: "Grade Calculator",
    detail: "See your current grade and the average you need on the work that remains.",
    href: "/grade-calculator",
    action: "Open calculator",
  },
  {
    number: "03",
    eyebrow: "Study",
    title: "Course Guides",
    detail: "Read Course Mastery Guides and Textbook Companions as searchable, mobile-friendly webpages.",
    href: "/guides",
    action: "Browse guides",
  },
] as const;

export default async function PublicHomePage({
  searchParams,
}: {
  searchParams: Promise<{ auth_error?: string }>;
}) {
  const [{ profile }, params] = await Promise.all([getSessionProfile(), searchParams]);
  const courses = getPublicGuideCourses();
  const featuredCodes = new Set(["REHE 151", "DSPR 136", "HEWB 134", "REHE 120"]);
  const featured = courses.filter((course) => featuredCodes.has(course.code));

  return (
    <div className="fc-site public-core-page">
      <PublicHeader />

      <main>
        <section className="public-core-hero">
          <div className="public-core-hero-copy">
            <p className="eyebrow">Fourth Canal · Dental study workspace</p>
            <h1><span>Look closer.</span><br /><em>The missing detail matters.</em></h1>
            <p className="public-core-lead">
              Practice tooth identification, calculate the grade you need, and open {courses.length * 2} searchable course guides built to read cleanly on any screen.
            </p>
            <div className="public-core-hero-actions">
              <Link href="/games/tooth-quest" className="public-core-primary-action">
                Play Tooth Quest <span aria-hidden="true">→</span>
              </Link>
              <Link href="/guides" className="public-core-secondary-action">
                Browse {courses.length} courses
              </Link>
            </div>
          </div>

          <PublicSignalPanel />
        </section>

        <section className="public-core-origin" id="why-fourth-canal" aria-labelledby="origin-title">
          <div className="public-core-origin-number" aria-hidden="true">04</div>
          <div>
            <p className="eyebrow">Why Fourth Canal?</p>
            <h2 id="origin-title">A case can look complete and still be missing a canal.</h2>
          </div>
          <div className="public-core-origin-copy">
            <p>
              In an upper molar, a second mesiobuccal canal—often called MB2—can be small, hidden by dentin, and difficult to locate. Finding the full canal system is part of treating the whole tooth.
            </p>
            <p>
              The name is our study rule: look past the obvious answer, find the missing context, and connect it before moving on.
            </p>
            <Link href="/about#why">Read the story <span aria-hidden="true">→</span></Link>
          </div>
        </section>

        <section className="public-core-tools" aria-labelledby="tools-title">
          <div className="public-core-section-heading">
            <div><p className="eyebrow">The core</p><h2 id="tools-title">Everything you need to start.</h2></div>
            <p>No account wall. Open a tool and get to work.</p>
          </div>
          <div className="public-core-tool-grid">
            {CORE_TOOLS.map((tool) => (
              <article key={tool.number}>
                <div className="public-core-tool-index"><span>{tool.number}</span><small>{tool.eyebrow}</small></div>
                <h3>{tool.title}</h3>
                <p>{tool.detail}</p>
                <Link href={tool.href}>{tool.action} <span aria-hidden="true">→</span></Link>
              </article>
            ))}
          </div>
        </section>

        <section className="public-core-featured" aria-labelledby="featured-title">
          <div className="public-core-section-heading">
            <div><p className="eyebrow">Web-native reading</p><h2 id="featured-title">A course guide should feel like a webpage.</h2></div>
            <p>Searchable text, responsive tables, and section navigation replace the PDF-first experience.</p>
          </div>
          <div className="public-core-course-grid">
            {featured.map((course) => (
              <Link href={`/guides/${course.slug}`} key={course.code}>
                <span>{course.code}</span>
                <h3>{course.title}</h3>
                <p>Course Mastery Guide + Textbook Companion</p>
                <b aria-hidden="true">→</b>
              </Link>
            ))}
          </div>
          <Link href="/guides" className="public-core-inline-link">View all {courses.length} courses <span aria-hidden="true">→</span></Link>
        </section>

        <section className="public-core-account" id="account" aria-labelledby="account-title">
          <div>
            <p className="eyebrow">Optional account</p>
            <h2 id="account-title">Use everything now. Sign in when you want it saved.</h2>
            <p>
              Public tools and guides work without an account. Google sign-in adds private progress saving. The original D1 course library remains separate and restricted to approved students.
            </p>
          </div>
          <aside>
            {!profile ? (
              <>
                <h3>Save your progress</h3>
                <p>Any Google account can create a Fourth Canal account.</p>
                <SignInPanel />
                {params.auth_error && <p className="fc-auth-error">Google sign-in failed. Please try again.</p>}
              </>
            ) : (
              <div className="public-core-signed-in">
                <p className="eyebrow">Signed in</p>
                <h3>{profile.name ?? profile.email.split("@")[0]}</h3>
                <p>{profile.email}</p>
                <p>Your public study progress can be saved to this account.</p>
                <div>
                  <Link href="/games/tooth-quest">Continue to Tooth Quest</Link>
                  {profile.status === "approved" && <Link href="/d1">Open private D1 library</Link>}
                </div>
                <form action="/auth/signout" method="post"><button>Sign out</button></form>
              </div>
            )}
          </aside>
        </section>
      </main>
    </div>
  );
}
