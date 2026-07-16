import Link from "next/link";
import Image from "next/image";
import { getSessionProfile } from "@/lib/access";
import { getShellCourses } from "@/lib/shell-courses";
import { AppShell } from "@/components/AppShell";
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

async function WorkspaceAboutPage({ profile }: { profile: NonNullable<Awaited<ReturnType<typeof getSessionProfile>>["profile"]> }) {
  const courses = await getShellCourses();

  return (
    <AppShell profile={profile} courses={courses}>
      <div className={styles.workspaceAbout}>
        <section className={styles.workspaceHero}>
          <div className={styles.workspaceHeroCopy}>
            <p className="eyebrow">About Fourth Canal</p>
            <h1>The study layer dental school was missing.</h1>
            <p>
              Fourth Canal brings lectures, transcripts, mastery guides, course files,
              and class tools into one private workspace built for the way dental
              students actually study.
            </p>
            <div className={styles.workspaceActions}>
              <Link href="/library" className="portal-button-primary">
                Open my courses <span aria-hidden="true">→</span>
              </Link>
              <a href="#workspace-story" className="portal-button">
                Why the fourth canal?
              </a>
            </div>
          </div>

          <figure className={styles.workspaceSpecimen}>
            <div className={styles.workspaceSpecimenImage}>
              <Image
                src="/brand/fourth-canal-hero-brand-image-v2.png"
                alt="Enamel microscopy field with four anatomical canal strands"
                fill
                priority
                sizes="(max-width: 767px) 100vw, 42vw"
              />
            </div>
            <figcaption>
              <span>Anatomical atlas · fourth trace active</span>
              <strong>04 / 04</strong>
            </figcaption>
          </figure>
        </section>

        <section className={styles.workspaceOrigin} id="workspace-story">
          <span aria-hidden="true">04</span>
          <div>
            <p className="eyebrow">Why Fourth Canal?</p>
            <h2>Look for what is easy to miss.</h2>
            <p>
              A canal is a narrow space inside a tooth root that carries pulp. In upper
              first molars, the mesiobuccal root often contains a second, slender canal
              called MB2—the “fourth canal.” It can hide beneath dentin and be easy to
              overlook, but untreated anatomy can allow disease to persist. Fourth Canal
              follows that same clinical habit: keep looking, find the missing context,
              connect it, and make it useful.
            </p>
          </div>
          <blockquote>
            The most useful layer is often the one nobody organized for you.
          </blockquote>
        </section>

        <section className={styles.workspacePrinciples} aria-labelledby="workspace-principles-title">
          <div className={styles.workspaceSectionHeading}>
            <p className="eyebrow">How it works</p>
            <h2 id="workspace-principles-title">A calmer way through the course.</h2>
          </div>
          <div className={styles.workspacePrincipleGrid}>
            {PRINCIPLES.map((principle) => (
              <article key={principle.number}>
                <span>{principle.number}</span>
                <h3>{principle.title}</h3>
                <p>{principle.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.workspaceClosing}>
          <div>
            <p className="eyebrow">Private academic workspace</p>
            <h2>Spend less time finding the material. Spend more time understanding it.</h2>
          </div>
          <Link href="/library" className="portal-button-primary">
            Open my courses <span aria-hidden="true">→</span>
          </Link>
        </section>
      </div>
    </AppShell>
  );
}

export default async function AboutPage() {
  const { profile } = await getSessionProfile();
  if (profile?.status === "approved") {
    return <WorkspaceAboutPage profile={profile} />;
  }

  const backHref = "/";

  return (
    <div className={`${styles.aboutPage} fc-site`} data-integrated-footer="true">
      <div className={styles.microscopyField} aria-hidden="true" />

      <header className={styles.header}>
        <div className={styles.brandLink}>
          <BrandMarkPublic />
          <small>Dental education</small>
        </div>
        <Link href={backHref} className={styles.headerAction}>
          Back to sign in <span aria-hidden="true">→</span>
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
                Return to sign in
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
          <div className={styles.originNumber}>04</div>
          <div className={styles.originCopy}>
            <p className={styles.eyebrow}>Why Fourth Canal?</p>
            <h2>Look for what is easy to miss.</h2>
            <p>
              A canal is a narrow space inside a tooth root that carries pulp. In upper
              first molars, the mesiobuccal root often contains a second, slender canal
              called MB2—the “fourth canal.” It can hide beneath dentin and be easy to
              overlook, but untreated anatomy can allow disease to persist. Fourth Canal
              follows that same clinical habit: keep looking, find the missing context,
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
            Return to sign in
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
