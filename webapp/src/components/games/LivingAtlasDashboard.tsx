import Link from "next/link";
import type { LivingAtlasDashboard } from "@/lib/living-atlas/types";
import styles from "./LivingAtlasPractice.module.css";

function duration(ms: number) {
  if (!ms) return "No baseline";
  const seconds = Math.round(ms / 1000);
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export function LivingAtlasDashboardView({ dashboard }: { dashboard: LivingAtlasDashboard }) {
  const course = dashboard.course ?? dashboard.courses[0];
  const sourceOnlyCourse = dashboard.recallProgress.totalCards > 0 && dashboard.progress.totalConcepts === 0;
  const recallCoverage = dashboard.recallProgress.totalCards
    ? Math.round((dashboard.recallProgress.ratedCards / dashboard.recallProgress.totalCards) * 100)
    : 0;
  const courseGroups = Array.from(
    dashboard.courses.reduce((groups, item) => {
      const key = `${item.academicYear} · ${item.term}`;
      groups.set(key, [...(groups.get(key) ?? []), item]);
      return groups;
    }, new Map<string, typeof dashboard.courses>()),
  );
  return (
    <div className={styles.dashboardPage}>
      <section className={styles.dashboardHero}>
        <div>
          <p className={styles.eyebrow}>{course ? `${course.academicYear} · ${course.term} · ${course.code}` : "Founder Practice"}</p>
          <h1>{course?.title ?? "Living Atlas"}</h1>
          <p>{course?.description ?? "Choose a course to open its organized question banks."}</p>
        </div>
        <aside className={styles.heroStats} aria-label={`${course?.title ?? "Course"} progress`}>
          {sourceOnlyCourse ? <>
            <div><span>Recall coverage</span><strong>{recallCoverage}%</strong></div>
            <div><span>Know it</span><strong>{dashboard.recallProgress.knownCards}</strong></div>
            <div><span>Recall Repair</span><strong>{dashboard.recallProgress.repairCards}</strong></div>
            <div><span>Source cards</span><strong>{dashboard.recallProgress.totalCards}</strong></div>
          </> : <>
            <div><span>Coverage</span><strong>{dashboard.progress.coverage}%</strong></div>
            <div><span>Recent accuracy</span><strong>{dashboard.progress.recentAccuracy}%</strong></div>
            <div><span>Mastery</span><strong>{dashboard.progress.mastery}%</strong></div>
            <div><span>Active Echoes</span><strong>{dashboard.progress.activeEchoes}</strong></div>
          </>}
        </aside>
      </section>

      <section className={styles.courseHierarchy} aria-label="Courses by dental year and semester">
        {courseGroups.map(([label, items]) => (
          <div key={label} className={styles.courseGroup}>
            <div className={styles.courseGroupHeading}>
              <p className={styles.eyebrow}>Dental curriculum</p>
              <h2>{label}</h2>
              <span>{items.reduce((sum, item) => sum + item.playableBankCount, 0)} available decks</span>
            </div>
            <div className={styles.courseShelf}>
              {items.map((item) => (
                <Link key={item.code} href={`/games/living-atlas/courses/${item.slug}`} className={`${styles.courseCard} ${item.code === course?.code ? styles.courseCardCurrent : ""}`}>
                  <span>{item.academicYear} · {item.term}</span>
                  <strong>{[item.code, ...item.relatedCodes].join(" + ")}</strong>
                  <b>{item.title}</b>
                  <small>{item.playableBankCount} available deck{item.playableBankCount === 1 ? "" : "s"}</small>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className={styles.sectionIntro}>
        <div>
          <p className={styles.eyebrow}>Question Banks</p>
          <h2>{course?.title ?? "Course"} source sets</h2>
          <p>Source decks use Recall Practice. Only independently authored, reviewed MCQs can enter Test Mode.</p>
        </div>
        <div className={styles.sectionActions}>
          <Link className={styles.secondaryButton} href="/games/living-atlas/performance">Lop’s field journal</Link>
          <Link className={styles.secondaryButton} href="/games/living-atlas/review">Founder Review Lab</Link>
          <Link className={styles.secondaryButton} href="/games/living-atlas/legacy">Legacy conversion record</Link>
          {dashboard.activeRun ? (
            <Link className={styles.primaryButton} href={`/games/living-atlas/runs/${dashboard.activeRun.id}`}>
              Continue session · {dashboard.activeRun.currentPosition}/{dashboard.activeRun.questionCount}
            </Link>
          ) : null}
        </div>
      </section>

      <div className={styles.bankShelf}>
        {dashboard.banks.map((bank) => (
          <article key={bank.id} className={`${styles.bankCard} ${bank.playable ? styles.bankPlayable : ""}`}>
            <div className={styles.bankIcon} aria-hidden="true">QB</div>
            <div className={styles.bankCopy}>
              <div className={styles.bankTitleRow}>
                <h3>{bank.title}</h3>
                {bank.playable ? <span className={bank.deliveryKind === "recall" ? styles.sourceBadge : styles.reviewBadge}>{bank.deliveryKind === "recall" ? "Recall Practice" : "Reviewed Test Mode"}</span> : <span className={styles.sourceBadge}>Source captured</span>}
              </div>
              <p>{bank.sourceCardCount} source cards · {bank.playable ? bank.deliveryKind === "recall" ? "preserved-answer recall" : `${bank.reviewQuestionCount} original MCQs` : "questions not generated"}</p>
              {bank.playable ? (
                <>
                  <div className={styles.segmentedProgress} aria-label="Lecture 1 progress">
                    <i style={{ width: `${Math.min(100, Math.round(((bank.deliveryKind === "recall" ? bank.recallRatedCount : bank.attemptedQuestions) / bank.reviewQuestionCount) * 100))}%` }} />
                  </div>
                  <div className={styles.bankMetrics}>
                    {bank.deliveryKind === "recall" ? <><span>{bank.recallRatedCount}/{bank.reviewQuestionCount} self-rated</span><span>{bank.recallKnownCount} Know it</span><span>{bank.recallRepairCount} Recall Repair</span></> : <><span>{bank.attemptedQuestions} attempted</span><span>{bank.recentAccuracy}% recent accuracy</span><span>{duration(bank.averageTimeMs)} average</span><span>{bank.activeEchoes} Echoes</span></>}
                  </div>
                </>
              ) : null}
            </div>
            <div className={styles.bankActions}>
              {bank.sourceUrl ? <a href={bank.sourceUrl} target="_blank" rel="noreferrer" className={styles.secondaryButton}>Open {bank.sourceLabel ?? "source"}</a> : null}
              {bank.playable ? <Link href={`/games/living-atlas/banks/${bank.id}`} className={styles.primaryButton}>{bank.deliveryKind === "recall" ? "Recall all cards" : "Open Test Mode"}</Link> : <button type="button" disabled>Not playable yet</button>}
            </div>
          </article>
        ))}
      </div>

      <section className={styles.futureCard}>
        <p className={styles.eyebrow}>Practice Tests · Later</p>
        <h2>Fourth Canal original MCQs</h2>
        <p>This area is intentionally empty. Independently authored and reviewed Fourth Canal questions will become Practice Tests; Omar’s preserved material remains honest Recall Practice.</p>
      </section>
    </div>
  );
}
