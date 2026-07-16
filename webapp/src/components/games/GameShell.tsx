import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./GameShell.module.css";

type GameShellProps = {
  children: ReactNode;
  displayName: string;
};

export function GameShell({ children, displayName }: GameShellProps) {
  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#game-content">
        Skip to game content
      </a>
      <header className={styles.header}>
        <Link href="/games" className={styles.brand} aria-label="Fourth Canal games home">
          <span className={styles.brandTile} aria-hidden="true">
            FC
          </span>
          <span>
            <span className={styles.wordmark}>Fourth Canal</span>
            <span className={styles.sectionLabel}>Study Arcade</span>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Game navigation">
          <Link href="/games">Games</Link>
          <Link href="/home">Dashboard</Link>
          <Link href="/profile" className={styles.profileLink}>
            {displayName}
          </Link>
          <form action="/auth/signout" method="post">
            <button type="submit">Sign out</button>
          </form>
        </nav>
      </header>
      {children}
    </div>
  );
}
