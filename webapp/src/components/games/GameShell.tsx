import type { ReactNode } from "react";
import { BrandMark } from "@/components/BrandMark";
import { GameNavigation } from "@/components/games/GameNavigation";
import styles from "./GameShell.module.css";

type GameShellProps = {
  children: ReactNode;
  displayName: string | null;
  signedIn: boolean;
};

export function GameShell({ children, displayName, signedIn }: GameShellProps) {
  return (
    <div className={styles.shell} data-game-shell="true">
      <a className={styles.skipLink} href="#game-content">
        Skip to game content
      </a>
      <header className={styles.header}>
        <div className={styles.brand}>
          <BrandMark href="/" inverse className={styles.brandMark} />
          <span className={styles.sectionLabel}>Study Arcade</span>
        </div>

        <GameNavigation
          className={styles.nav}
          displayName={displayName}
          signedIn={signedIn}
        />

        <details className={styles.mobileMenu}>
          <summary>Menu</summary>
          <GameNavigation
            className={styles.mobileNav}
            displayName={displayName}
            signedIn={signedIn}
          />
        </details>
      </header>
      {children}
    </div>
  );
}
