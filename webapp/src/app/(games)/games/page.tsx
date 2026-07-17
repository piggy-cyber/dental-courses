import Link from "next/link";
import styles from "./games.module.css";

export const dynamic = "force-dynamic";

const games = [
  {
    href: "/games/tooth-quest",
    title: "Tooth Quest",
    discipline: "Universal numbering",
    description: "Move from arch position to tooth number and name until recognition becomes automatic.",
    modes: ["Map", "Sprint", "Recall"],
    status: "Play now",
  },
  {
    href: "/games/contact-area",
    title: "Contact Area Lab",
    discipline: "Proximal anatomy",
    description: "Place mesial and distal contacts precisely, then learn why the neighboring contour matters.",
    modes: ["Study", "Placement", "Review"],
    status: "Play now",
  },
  {
    href: "/games/eruption-timeline",
    title: "Eruption Timeline",
    discipline: "Development",
    description: "Sequence primary, mixed, and permanent dentitions without memorizing isolated dates.",
    modes: ["Sequence", "Mixed dentition", "Challenge"],
    status: "Play now",
  },
  {
    href: "/games/root-canal-match",
    title: "Root Canal Match",
    discipline: "Internal anatomy",
    description: "Match teeth to common root and canal configurations—including the anatomy that is easiest to miss.",
    modes: ["Roots", "Canals", "Variations"],
    status: "Play now",
  },
  {
    href: "/games/tooth-comparison-duel",
    title: "Tooth Comparison Duel",
    discipline: "Morphology",
    description: "Put near-neighbor teeth side by side and decide which landmark separates them under pressure.",
    modes: ["Compare", "Timed duel", "Weak areas"],
    status: "Play now",
  },
  {
    href: "/games/gv-black-sorter",
    title: "G.V. Black Sorter",
    discipline: "Operative dentistry",
    description: "Sort clinical descriptions into Classes I–VI and inspect the rule behind every decision.",
    modes: ["Cases", "Six classes", "Missed review"],
    status: "Play now",
  },
  {
    href: "/games/micp-occlusion-trainer",
    title: "MICP Occlusion Trainer",
    discipline: "Occlusion",
    description: "Explore maximum intercuspation contacts through an evidence-gated visual study module.",
    modes: ["Study", "Contact map", "Evidence notes"],
    status: "Study module",
  },
] as const;

export default function GamesHubPage() {
  return (
    <main id="game-content" className={styles.main}>
      <header className={styles.hero}>
        <div>
          <p className={styles.kicker}>Fourth Canal Study Arcade · Seven modules</p>
          <h1>Train your eye for the detail that changes the answer.</h1>
          <p>
            Anatomy is not a list. It is a pattern-recognition skill. Each module isolates one visual decision, makes you act on it, and explains what you almost missed.
          </p>
          <a className={styles.jumpLink} href="#arcade-library">Explore all games <span aria-hidden="true">↓</span></a>
        </div>

        <div className={styles.heroSignal} aria-label="Four canal study sequence">
          <div className={styles.signalHeader}><span>Recognition field</span><strong>04 / 04</strong></div>
          <div className={styles.canalField} aria-hidden="true">
            <i /><i /><i /><i />
          </div>
          <ol>
            <li><span>01</span>Observe</li>
            <li><span>02</span>Compare</li>
            <li><span>03</span>Decide</li>
            <li><span>04</span>Confirm</li>
          </ol>
        </div>
      </header>

      <section id="arcade-library" className={styles.library} aria-label="Dental study games">
        <div className={styles.libraryHeading}>
          <p className={styles.kicker}>Arcade library</p>
          <p>Choose a narrow skill. Finish a short round. Return when recognition needs sharpening.</p>
        </div>

        <div className={styles.grid}>
          {games.map((game, index) => (
            <article className={`${styles.card} ${index === 0 ? styles.featured : ""}`} key={game.href}>
              <div className={styles.cardTopline}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <span>{game.status}</span>
              </div>
              <div className={styles.cardSignal} aria-hidden="true">
                <i /><i /><i /><i />
              </div>
              <p className={styles.cardIndex}>{game.discipline}</p>
              <h2>{game.title}</h2>
              <p className={styles.description}>{game.description}</p>
              <ul className={styles.tags} aria-label={`${game.title} modes`}>
                {game.modes.map((mode) => <li key={mode}>{mode}</li>)}
              </ul>
              <Link href={game.href} className={styles.primaryAction}>
                Open module <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <aside className={styles.note}>
        <span className={styles.noteMarker} aria-hidden="true">04</span>
        <p>
          Play without an account. Sign in to save progress. Fourth Canal games are study aids; official course and clinical guidance control.
        </p>
      </aside>
    </main>
  );
}
