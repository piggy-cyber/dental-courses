import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./GameShell.module.css";

type GameShellProps = {
  children: ReactNode;
  displayName: string | null;
  signedIn: boolean;
  hasD1Access: boolean;
};

export function GameShell({ children, displayName, signedIn, hasD1Access }: GameShellProps) {
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
          <Link href="/grade-calculator">Calculator</Link>
          <Link href="/guides">Guides</Link>
          {hasD1Access && <Link href="/d1">D1 library</Link>}
          {signedIn ? (
            <>
              <span className={styles.profileLink}>{displayName}</span>
              <form action="/auth/signout" method="post">
                <button type="submit">Sign out</button>
              </form>
            </>
          ) : (
            <Link href="/#account" className={styles.profileLink}>Sign in to save</Link>
          )}
        </nav>
      </header>
      {children}
    </div>
  );
}
