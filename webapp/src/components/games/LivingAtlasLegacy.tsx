import Link from "next/link";
import type { LivingAtlasLegacySession } from "@/lib/living-atlas/types";
import styles from "./LivingAtlasPractice.module.css";

export function LivingAtlasLegacy({ sessions }: { sessions: LivingAtlasLegacySession[] }) {
  return (
    <div className={styles.resultsPage}>
      <div className={styles.breadcrumb}><Link href="/games/living-atlas">Question Banks</Link><span>/</span><strong>Legacy conversion record</strong></div>
      <section className={styles.resultsHero}>
        <div>
          <p className={styles.eyebrow}>Founder-only audit</p>
          <h1>Legacy conversion record</h1>
          <p>These runs came from the retired automatic Quizlet-to-MCQ conversion. They remain visible for audit only and never affect current accuracy, pace, mastery, Echoes, achievements, collectibles, or companion stats.</p>
        </div>
      </section>
      <section className={styles.reportSection}>
        <div className={styles.reportHeading}><div><p className={styles.eyebrow}>Retained history</p><h2>{sessions.length ? `${sessions.length} legacy session${sessions.length === 1 ? "" : "s"}` : "No legacy sessions"}</h2></div></div>
        {sessions.length ? <div className={styles.legacyList}>{sessions.map((session) => <article key={session.id}><div><strong>{session.bankTitle}</strong><span>{session.status === "completed" ? "Completed" : "Saved or abandoned"} · {session.answeredCount} answers recorded</span></div><time>{new Date(session.completedAt ?? session.recordedAt).toLocaleDateString()}</time></article>)}</div> : <p className={styles.emptyReport}>There are no historical auto-converted sessions for this founder account.</p>}
      </section>
    </div>
  );
}
