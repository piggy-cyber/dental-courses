import Link from "next/link";
import Image from "next/image";
import { getSessionProfile } from "@/lib/access";
import { BrandMarkPublic } from "@/components/BrandMark";
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
    title: "Everything in its place",
    copy: "Lectures, transcripts, mastery guides, course files, and class tools stay attached to the course context that makes them useful.",
  },
  {
    number: "02",
    title: "Built for the way students actually study",
    copy: "Search by the thing you remember, continue where you stopped, and move between the lecture and its supporting material without rebuilding the trail.",
  },
  {
    number: "03",
    title: "Made by students. Improved by students.",
    copy: "Fourth Canal is cohort infrastructure: maintained by student operators and strengthened by corrections, better notes, and useful contributions.",
  },
  {
    number: "04",
    title: "Independent by design",
    copy: "This is a private student-run study tool, not an official university platform. Faculty instructions, Canvas, syllabi, and clinical guidance always control.",
  },
] as const;

export default async function AboutPage() {
  const { profile } = await getSessionProfile();
  const backHref = profile?.status === "approved" ? "/home" : "/";
  const backLabel = profile?.status === "approved" ? "Open my courses" : "Back to sign in";

  return (
    <div className={`${styles.aboutPage} fc-site`} data-integrated-footer="true">
      <div className={styles.microscopyField} aria-hidden="true" />

      <header className={styles.header}>
        <div className={styles.brandLink}>
          <BrandMarkPublic />
          <small>Dental education</small>
        </div>
        <Link href={backHref} className={styles.headerAction}>
          {backLabel} <span aria-hidden="true">→</span>
        </Link>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Independent · Student-built · Course-ready</p>
            <h1>The study layer <span>dental school was missing.</span></h1>
            <p className={styles.lead}>
              Fourth Canal brings lectures, transcripts, mastery guides, course files,
              and class tools into one private workspace built for the way dental
              students actually study.
            </p>
            <div className={styles.heroActions}>
              <Link href={backHref} className={styles.primaryAction}>
                {profile?.status === "approved" ? "Open my courses" : "Return to sign in"}
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
                src="/brand/fourth-canal-hero-brand-image.png"
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
          <div className={styles.originNumber}>04</div>
          <div className={styles.originCopy}>
            <p className={styles.eyebrow}>Why Fourth Canal?</p>
            <h2>Look for what is easy to miss.</h2>
            <p>
              Dentistry trains us to look beyond what appears complete. A fourth canal
              can be the difference between a case that looks finished and one that
              truly is. Fourth Canal follows the same idea: find the missing context,
              connect it, and make it useful.
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
            <h2 id="principles-title">A calmer way through the course.</h2>
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

        <section className={styles.closing}>
          <div>
            <p className={styles.eyebrow}>Private academic workspace</p>
            <h2>Spend less time finding the material. Spend more time understanding it.</h2>
          </div>
          <Link href={backHref} className={styles.primaryAction}>
            {profile?.status === "approved" ? "Open my courses" : "Return to sign in"}
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
        </nav>
      </footer>
    </div>
  );
}
