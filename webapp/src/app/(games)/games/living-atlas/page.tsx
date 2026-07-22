import type { Metadata } from "next";
import Link from "next/link";
import { LivingAtlasDashboardView } from "@/components/games/LivingAtlasDashboard";
import { LivingAtlasShell } from "@/components/games/LivingAtlasShell";
import { WhiteHollandLop } from "@/components/games/WhiteHollandLop";
import { SignInPanel } from "@/components/SignInPanel";
import { getOptionalSessionProfile } from "@/lib/access";
import styles from "@/components/games/LivingAtlasPractice.module.css";
import { getLivingAtlasDashboard } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Living Atlas — Dental Recall and Practice",
  description: "A Fourth Canal learning workspace combining fast recall, reviewed practice questions, repair queues, and visual progress.",
  alternates: { canonical: "/games/living-atlas" },
};

export default async function LivingAtlasPage() {
  const { profile, userId } = await getOptionalSessionProfile();
  const isFounder = Boolean(
    userId &&
    profile &&
    profile.id === userId &&
    profile.role === "owner" &&
    profile.status === "approved",
  );

  if (isFounder) {
    const result = await getLivingAtlasDashboard();
    if (result.ok) {
      return (
        <LivingAtlasShell>
          <LivingAtlasDashboardView dashboard={result.value} />
        </LivingAtlasShell>
      );
    }
  }

  return (
    <main id="game-content" className={styles.atlasRoot}>
      <section className={styles.publicPreviewHero}>
        <div className={styles.publicPreviewCopy}>
          <p className={styles.eyebrow}>Fourth Canal · Product preview</p>
          <h1>Study the detail.<br />Repair what you miss.</h1>
          <p>
            Living Atlas combines fast source-card recall with reviewed dental practice questions,
            focused repair queues, saved progress, and a visual companion that grows with real learning.
          </p>
          <div className={styles.publicPreviewActions}>
            <a href="#atlas-preview" className={styles.primaryButton}>Explore the preview</a>
            <Link href="/games" className={styles.secondaryButton}>Browse study games</Link>
          </div>
        </div>
        <div className={styles.publicPreviewCompanion}>
          <WhiteHollandLop mood="curious" decorative={false} />
          <div><strong>Your field companion</strong><span>Visual progress without fake scores</span></div>
        </div>
      </section>

      <section id="atlas-preview" className={styles.publicPreviewFeatures} aria-label="Living Atlas features">
        <article><span>01</span><h2>Recall Practice</h2><p>Flip preserved source cards instantly, rate recall, and return to weak material through Recall Repair.</p></article>
        <article><span>02</span><h2>Reviewed Questions</h2><p>Use Study feedback immediately or keep explanations sealed until the end of a Test session.</p></article>
        <article><span>03</span><h2>Focused Queues</h2><p>Flags, Echoes, unanswered items, and weak topics stay distinct so the next action remains clear.</p></article>
        <article><span>04</span><h2>Visible Growth</h2><p>Coverage, mastery, recovery, pace, achievements, and companion collectibles reflect stored practice data.</p></article>
      </section>

      <section className={styles.publicPreviewStatus}>
        <div>
          <p className={styles.eyebrow}>Founder build · In active development</p>
          <h2>The preview is public. The working question library is not.</h2>
          <p>Private source material, answer keys, learner records, and editorial tools remain protected while the platform is being reviewed.</p>
        </div>
        <aside>
          {!profile ? (
            <>
              <strong>Founder access</strong>
              <p>The approved founder account can sign in to open the current working build.</p>
              <SignInPanel returnTo="/games/living-atlas" />
            </>
          ) : (
            <>
              <strong>Preview access</strong>
              <p>This account can view the public preview. The working library remains limited to the approved founder account.</p>
              <Link href="/games" className={styles.secondaryButton}>Return to study games</Link>
            </>
          )}
        </aside>
      </section>
    </main>
  );
}
