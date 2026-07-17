import type { ReactNode } from "react";
import { PublicHeader } from "@/components/PublicHeader";
import styles from "./GameShell.module.css";

type GameShellProps = {
  children: ReactNode;
};

export function GameShell({ children }: GameShellProps) {
  return (
    <div className={styles.shell} data-game-shell="true">
      <a className={styles.skipLink} href="#game-content">
        Skip to game content
      </a>
      <PublicHeader />
      {children}
    </div>
  );
}
