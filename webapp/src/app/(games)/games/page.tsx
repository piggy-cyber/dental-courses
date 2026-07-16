import Link from "next/link";
import styles from "./games.module.css";

export const dynamic = "force-dynamic";

export default function GamesHubPage() {
  return (
    <main id="game-content" className={styles.main}>
      <header className={styles.hero}>
        <p className={styles.kicker}>Fourth Canal Study Arcade</p>
        <h1>Turn dental recall into muscle memory.</h1>
        <p>
          Short, visual rounds built for the facts you need to recognize quickly—not another wall of flashcards.
        </p>
      </header>

      <section className={styles.grid} aria-label="Study games">
        <article className={`${styles.card} ${styles.featured}`}>
          <div className={styles.cardVisual} aria-hidden="true">
            <div className={styles.toothEmblem}>
              <span />
            </div>
            <span className={styles.liveBadge}>Playable now</span>
          </div>
          <div className={styles.cardBody}>
            <p className={styles.cardIndex}>Game 01 · Universal numbering</p>
            <h2>Tooth Quest</h2>
            <p>
              Learn permanent and primary dentitions on a real arch map, then race the clock with location, number, and tooth-name prompts.
            </p>
            <ul className={styles.tags} aria-label="Tooth Quest features">
              <li>Map mode</li>
              <li>60-second sprint</li>
              <li>10-question recall</li>
            </ul>
            <Link href="/games/tooth-quest" className={styles.primaryAction}>
              Enter Tooth Quest <span aria-hidden="true">→</span>
            </Link>
          </div>
        </article>

        <article className={`${styles.card} ${styles.upNext}`}>
          <div className={styles.sorterVisual} aria-hidden="true">
            {Array.from({ length: 6 }, (_, index) => (
              <span key={index}>{index + 1}</span>
            ))}
          </div>
          <div className={styles.cardBody}>
            <p className={styles.cardIndex}>Game 02 · Coming next</p>
            <h2>G.V. Black Classification Sorter</h2>
            <p>
              Rapid-fire lesion and restoration scenarios sorted into Classes I–VI, with missed-case review after every round.
            </p>
            <ul className={styles.tags} aria-label="Planned G.V. Black Sorter features">
              <li>Clinical descriptions</li>
              <li>Visual cases</li>
              <li>Six classification bins</li>
            </ul>
            <span className={styles.disabledAction}>In development</span>
          </div>
        </article>
      </section>

      <aside className={styles.note}>
        <span className={styles.noteMarker} aria-hidden="true">i</span>
        <p>
          Your Tooth Quest progress is private to your Fourth Canal account. This is a study aid; official course and clinical guidance control.
        </p>
      </aside>
    </main>
  );
}
