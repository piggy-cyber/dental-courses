import Link from "next/link";
import Image from "next/image";
import { BrandMarkPublic } from "@/components/BrandMark";
import { PublicHeader } from "@/components/PublicHeader";
import { FourthCanalEntrance } from "@/components/FourthCanalEntrance";
import { getOptionalSessionProfile } from "@/lib/access";
import styles from "./AboutPage.module.css";

export const metadata = {
  title: "About",
  description:
    "Why Fourth Canal exists and how it brings the missing study layer of dental school into view.",
  alternates: { canonical: "/about" },
};

const PRINCIPLES = [
  {
    number: "01",
    title: "Three clear starting points",
    copy: "Play the dental anatomy game, plan a grade, or open a course guide without walking through a course portal first.",
  },
  {
    number: "02",
    title: "The webpage is the document",
    copy: "Course Mastery Guides and Textbook Companions are searchable, responsive reading experiences—not files you have to download first.",
  },
  {
    number: "03",
    title: "Open first. Account second.",
    copy: "The core tools work immediately. Signing in saves progress and preferences without putting the public tools behind a login wall.",
  },
  {
    number: "04",
    title: "Independent by design",
    copy: "This is an independent student-run study tool, not an official university platform.",
  },
] as const;

export const dynamic = "force-dynamic";
export default async function AboutPage() {
  const { profile } = await getOptionalSessionProfile();
  return (
    <div className={`${styles.aboutPage} fc-site`} data-integrated-footer="true">
      <div className={styles.microscopyField} aria-hidden="true" />

      <PublicHeader />

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Independent · Student-built · Course-ready</p>
            <h1>The study layer <span>dental school was missing.</span></h1>
            <p className={styles.lead}>
              Fourth Canal is a public dental study desk: a visual anatomy game, a
              grade calculator, and focused course guides built for the browser.
            </p>
            <div className={styles.heroActions}>
              <Link href="/" className={styles.primaryAction}>
                Open the study desk
                <span aria-hidden="true">→</span>
              </Link>
              <a href="#why" className={styles.secondaryAction}>Why the fourth canal?</a>
            </div>
          </div>

          <div className={styles.specimen} role="img" aria-label="Four anatomical canal traces, with the fourth canal highlighted">
            <div className={styles.specimenHeader}>
              <span>ANATOMICAL TRACE</span>
              <b>04 / 04</b>
            </div>
            <div className={styles.enamelSlice}>
              <Image
                src="/brand/fourth-canal-hero-brand-image-v2.png"
                alt="Enamel microscopy field with four anatomical canal strands"
                fill
                priority
                sizes="(max-width: 900px) 100vw, 44vw"
                className={styles.brandImage}
              />
              <div className={styles.prismBands} aria-hidden="true" />
              <p><strong>The canal that is easiest to miss</strong><small>is the one worth learning to see.</small></p>
            </div>
            <div className={styles.specimenFooter}>
              <span>ENAMEL PRISM FIELD</span>
              <span>FOURTH TRACE ACTIVE</span>
            </div>
          </div>
        </section>

        <section className={styles.origin} id="why">
          {profile?.status === "approved" ? (
            <FourthCanalEntrance />
          ) : (
            <div className={styles.originNumber} aria-hidden="true">04</div>
          )}
          <div className={styles.originCopy}>
            <p className={styles.eyebrow}>Why Fourth Canal?</p>
            <h2>The extra canal that can hide in plain sight.</h2>
            <p>
              A maxillary first molar may contain a second mesiobuccal canal—MB2—beyond
              the three canals students first expect. It can be narrow, covered by
              dentin, and difficult to locate. Endodontic treatment depends on finding,
              cleaning, and sealing the full canal system rather than stopping when the
              tooth only looks complete.
            </p>
            <p>
              Fourth Canal follows the same habit: look again, find the context that was
              easy to miss, and connect it before moving on.
            </p>
          </div>
          <blockquote>
            <span>“</span>
            The name is a reminder that the most useful layer is often the one nobody
            organized for you.
          </blockquote>
        </section>

        <section className={styles.principles} aria-labelledby="principles-title">
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>How it works</p>
            <h2 id="principles-title">A calmer way to start studying.</h2>
          </div>
          <div className={styles.principleGrid}>
            {PRINCIPLES.map((principle) => (
              <article key={principle.number} className={styles.principleCard}>
                <span>{principle.number}</span>
                <h3>{principle.title}</h3>
                <p>{principle.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="app-card mx-auto max-w-5xl p-6 sm:p-8" aria-labelledby="editorial-title">
          <p className="eyebrow">Editorial policy</p>
          <h2 id="editorial-title" className="mt-2 text-2xl font-bold text-brand-navy">Student-built, source-aware, and correctable.</h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-brand-muted">
            Rick Ahn — dental student, founder, and student editor of Fourth Canal. Public study tools and guides are prepared as independent student resources, with source context and clear limits rather than claims of university or faculty endorsement.
          </p>
          <p className="mt-3 max-w-3xl leading-relaxed text-brand-muted">
            Content can be incomplete or need correction. Use official course materials, faculty direction, and clinical sources for decisions that matter, and <Link href="/support" className="font-semibold text-brand-blue underline">send a support report</Link> when something needs review.
          </p>
        </section>

        <section className={styles.closing}>
          <div>
            <p className={styles.eyebrow}>Open dental study desk</p>
            <h2>Spend less time finding the material. Spend more time understanding it.</h2>
          </div>
          <Link href="/" className={styles.primaryAction}>
            Open the study desk
            <span aria-hidden="true">→</span>
          </Link>
        </section>
      </main>

      <footer className={styles.footer}>
        <div>
          <BrandMarkPublic />
          <p>Independent student-run study support. Official course and clinical guidance always controls.</p>
        </div>
        <nav aria-label="Legal and site information">
          <Link href="/legal#privacy">Privacy</Link>
          <Link href="/legal#terms">Terms</Link>
          <Link href="/legal#disclaimer">Disclaimer</Link>
          <Link href="/legal#ai">AI notice</Link>
          <Link href="/support">Support</Link>
        </nav>
      </footer>
    </div>
  );
}
