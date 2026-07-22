"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import styles from "./LivingAtlasPractice.module.css";

const futureSections = ["Practice Tests", "Lessons", "Journal", "Story Mode"];

export function LivingAtlasShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isIsolatedAtlasSession = pathname.startsWith("/games/living-atlas/runs/") || pathname.startsWith("/games/living-atlas/recall/");
  const inPerformance = pathname === "/games/living-atlas/performance";
  const inQuestionBanks = pathname.startsWith("/games/living-atlas") && !inPerformance;
  return (
    <main id="game-content" data-atlas-isolated-session={isIsolatedAtlasSession ? "true" : "false"} className={isIsolatedAtlasSession ? styles.isolatedAtlasRoot : styles.atlasRoot}>
      {!isIsolatedAtlasSession ? <header className={styles.productHeader}>
        <div>
          <Link href="/games/living-atlas" className={styles.productName}>Living Atlas</Link>
          <span>D1 Curriculum</span>
        </div>
        <div className={styles.reviewPill}>Founder Library · Approved Source Edition</div>
      </header> : null}
      {!isIsolatedAtlasSession ? <nav className={styles.productNav} aria-label="Living Atlas sections">
        <Link href="/games/living-atlas" aria-current={inQuestionBanks ? "page" : undefined}>Question Banks</Link>
        <Link href="/games/living-atlas/performance" aria-current={inPerformance ? "page" : undefined}>Performance</Link>
        {futureSections.map((label) => (
          <span key={label} aria-disabled="true" title="Not included in this MVP">
            {label}<small>{label === "Practice Tests" ? "Future original MCQs" : "Later"}</small>
          </span>
        ))}
      </nav> : null}
      {children}
    </main>
  );
}
