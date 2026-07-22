import Link from "next/link";
import type { LivingAtlasResults } from "@/lib/living-atlas/types";
import { ClinicalImageViewer } from "./ClinicalImageViewer";
import styles from "./LivingAtlasPractice.module.css";

function duration(ms: number | null) {
  if (ms === null) return "Building baseline";
  const seconds = Math.round(ms / 1000);
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export function LivingAtlasResultsView({ results }: { results: LivingAtlasResults }) {
  const correct = results.questions.filter((question) => question.correct).length;
  const weakestTopic = [...results.topics].sort((left, right) => left.accuracy - right.accuracy)[0];
  return (
    <div className={styles.resultsPage}>
      <div className={styles.breadcrumb}><Link href={`/games/living-atlas/courses/${results.courseSlug}`}>Question Banks</Link><span>/</span><Link href={`/games/living-atlas/banks/${results.run.bankId}`}>{results.bankTitle}</Link><span>/</span><strong>Results</strong></div>
      <section className={styles.resultsHero}>
        <div>
          <p className={styles.eyebrow}>Session complete · {results.run.mode === "study" ? "Learn as you go" : "Review at end"}</p>
          <h1>Your {results.bankTitle} report</h1>
          <p>Use the topic and pacing breakdown below to decide what to repair next.</p>
        </div>
        <Link href={`/games/living-atlas/banks/${results.run.bankId}`} className={styles.primaryButton}>Practice the full bank again</Link>
      </section>

      <section className={styles.scoreCard}>
        <div className={styles.scoreRing} style={{ "--score": `${results.accuracy * 3.6}deg` } as React.CSSProperties}>
          <div><span>Accuracy</span><strong>{results.accuracy}%</strong><small>{correct} / {results.questions.length} correct</small></div>
        </div>
        <div className={styles.scoreTable}>
          <div><span>Answered</span><strong>{results.questions.length} / {results.run.questionCount}</strong></div>
          <div><span>Average pace</span><strong>{duration(results.averageTimeMs)}</strong></div>
          <div><span>Previous five sessions</span><strong>{duration(results.personalBaselineMs)}</strong></div>
          <div><span>Active Echoes</span><strong>{results.progress.activeEchoes}</strong></div>
          <div><span>Mastered concepts</span><strong>{results.progress.masteredConcepts} / {results.progress.totalConcepts}</strong></div>
          <div><span>Coverage</span><strong>{results.progress.coverage}%</strong></div>
        </div>
      </section>

      <section className={styles.reportSection}>
        <div className={styles.reportHeading}><div><p className={styles.eyebrow}>Topic breakdown</p><h2>Where to focus next</h2></div><p>No fake class averages. Pace compares only against your own prior sessions.</p></div>
        <div className={styles.reportTable}>
          <div className={styles.reportTableHeader}><span>Topic</span><span>Correct / Total</span><span>Accuracy</span><span>Time / Question</span><span>Personal baseline</span></div>
          {results.topics.map((topic) => (
            <div key={topic.topic} className={styles.reportRow}>
              <strong><small>{topic.domain}</small>{topic.topic}</strong><span>{topic.correct} / {topic.answered}</span><span>{topic.accuracy}%</span><span>{duration(topic.averageTimeMs)}</span><span>{duration(topic.personalBaselineMs)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.reportSection}>
        <div className={styles.reportHeading}><div><p className={styles.eyebrow}>Concept map</p><h2>What to repair next</h2></div><p>Echoes and flags stay separate. A correct answer does not silently clear a manual flag.</p></div>
        <div className={styles.conceptGrid}>
          {results.concepts.map((concept) => (
            <article key={concept.conceptId} className={concept.activeEchoes || concept.flaggedQuestions ? styles.conceptNeedsRepair : ""}>
              <small>{concept.domain} · {concept.topic}</small>
              <h3>{concept.objective}</h3>
              <div><span>{concept.correct}/{concept.attempted} correct</span><strong>{concept.accuracy}%</strong></div>
              <p>{concept.knowledgeState.replaceAll("_", " ")} · {concept.activeEchoes} Echoes · {concept.flaggedQuestions} flags</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.reportSection}>
        <div className={styles.reportHeading}><div><p className={styles.eyebrow}>Question breakdown</p><h2>Review each explanation</h2></div></div>
        <div className={styles.questionResults}>
          {results.questions.map((question) => (
            <details key={question.position} className={question.correct ? styles.resultCorrect : styles.resultEcho}>
              <summary>
                <i>{question.correct ? "✓" : "×"}</i><strong>Question {question.position}</strong><span>{question.topic}</span><span>{duration(question.activeTimeMs)}</span>{question.flagged ? <b>Flagged</b> : null}
              </summary>
              <div>
                <h3>{question.stem}</h3>
                <div className={styles.resultTaxonomy}><span>{question.domain}</span><span>{question.topic}</span><span>{question.objective}</span></div>
                <p><strong>Your answer:</strong> {question.selectedChoiceId.toUpperCase()} · <strong>Correct answer:</strong> {question.correctChoiceId.toUpperCase()}</p>
                <p>{question.teachingFeedback}</p>
                <p className={styles.distractorFeedback}>{question.choiceFeedback[question.selectedChoiceId]}</p>
                {question.imagePlacement === "results" ? (
                  question.images?.filter((image) => image.available && image.url).length ? (
                    question.images.filter((image) => image.available && image.url).map((image, index) => (
                      <ClinicalImageViewer key={image.id} src={image.url!} alt={image.alt} label={`Results diagram ${index + 1}`} caption={image.caption} />
                    ))
                  ) : question.imageAvailable && question.imageUrl ? (
                    <ClinicalImageViewer src={question.imageUrl} alt="Diagram shown during results review" label="Results-only diagram" caption={question.imageCaption} />
                  ) : null
                ) : null}
              </div>
            </details>
          ))}
        </div>
      </section>

      <div className={styles.resultsActions}>
        <Link href={`/games/living-atlas/banks/${results.run.bankId}`} className={styles.secondaryButton}>Return to {results.bankTitle}</Link>
        <Link href={`/games/living-atlas/banks/${results.run.bankId}?queue=flags`} className={styles.secondaryButton}>Review flagged</Link>
        {weakestTopic ? <Link href={`/games/living-atlas/banks/${results.run.bankId}?topic=${encodeURIComponent(weakestTopic.topic)}`} className={styles.secondaryButton}>Practice {weakestTopic.topic}</Link> : null}
        <Link href={`/games/living-atlas/banks/${results.run.bankId}?queue=echoes`} className={styles.primaryButton}>Repair Echoes</Link>
      </div>
    </div>
  );
}
