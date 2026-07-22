"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { setLivingAtlasChorusConsent } from "@/app/(games)/games/living-atlas/actions";
import type { LivingAtlasPerformance } from "@/lib/living-atlas/types";
import { WhiteHollandLop } from "./WhiteHollandLop";
import styles from "./LivingAtlasPractice.module.css";

function duration(ms: number | null) {
  if (ms === null) return "Building baseline";
  const seconds = Math.max(0, Math.round(ms / 1000));
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export function LivingAtlasPerformanceView({ performance }: { performance: LivingAtlasPerformance }) {
  const [chorusOptIn, setChorusOptIn] = useState(performance.companion.chorusOptIn);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const crownUnlocked = performance.collectibles.some((collectible) => collectible.id === "prosthodontic-golden-crown" && !collectible.locked);
  const paceDetail = performance.personalBaselineMs === null
    ? "Complete more sessions to establish your personal rhythm."
    : performance.recentPaceMs === null
      ? "Finish a session to compare your current rhythm."
      : performance.recentPaceMs <= performance.personalBaselineMs
        ? "Your latest completed session was faster than your own recent baseline."
        : "Your latest completed session took longer than your own recent baseline."

  function updateConsent(enabled: boolean) {
    setMessage(null);
    startTransition(async () => {
      const result = await setLivingAtlasChorusConsent(enabled);
      if (!result.ok) return setMessage(result.error);
      setChorusOptIn(result.value.chorusOptIn);
      setMessage(enabled ? "Atlas Chorus contribution is on. Only anonymous first answers to approved items count." : "Atlas Chorus contribution is off.");
    });
  }

  return (
    <div className={styles.performancePage}>
      <div className={styles.breadcrumb}><Link href="/games/living-atlas">Question Banks</Link><span>›</span><strong>Performance</strong></div>

      <section className={styles.companionHero}>
        <div className={styles.companionCopy}>
          <p className={styles.eyebrow}>Field companion</p>
          <h1>Lop’s field journal</h1>
          <p>Your companion grows from real practice data. Cosmetics and lore are collectibles only—they never change correctness, scoring, or study-aid limits.</p>
          <Link href={performance.nextAction.href} className={styles.primaryButton}>{performance.nextAction.label}</Link>
          <small>{performance.nextAction.detail}</small>
        </div>
        <div className={styles.companionPortrait}>
          <WhiteHollandLop mood={performance.companion.mood} crowned={crownUnlocked} decorative={false} />
          <div><strong>{performance.companion.name}</strong><span>{performance.companion.species} · {performance.companion.mood}</span></div>
        </div>
      </section>

      <section className={styles.companionStats} aria-label="Learning measures reflected by your companion">
        <article><span>Survey</span><strong>{performance.progress.coverage}%</strong><small>{performance.progress.attemptedConcepts} / {performance.progress.totalConcepts} concepts encountered</small></article>
        <article><span>Insight</span><strong>{performance.progress.mastery}%</strong><small>{performance.progress.masteredConcepts} concepts mastered</small></article>
        <article><span>Recovery</span><strong>{performance.progress.echoRepairs}</strong><small>{performance.progress.activeEchoes} active Echo{performance.progress.activeEchoes === 1 ? "" : "es"}</small></article>
        <article><span>Rhythm</span><strong>{duration(performance.recentPaceMs)}</strong><small>{paceDetail}</small></article>
      </section>

      <section className={styles.performancePanel}>
        <div className={styles.panelHeading}>
          <div><p className={styles.eyebrow}>Collectible cabinet</p><h2>What the field journal has kept</h2></div>
          <span>Cosmetic and lore rewards</span>
        </div>
        <div className={styles.collectibleGrid}>
          {performance.collectibles.map((collectible) => (
            <article key={collectible.id} className={`${styles.collectibleCard} ${collectible.locked ? styles.collectibleLocked : styles.collectibleUnlocked}`}>
              <i aria-hidden="true">{collectible.kind === "relic" ? "♛" : collectible.kind === "companion" ? "✦" : collectible.kind === "lore" ? "◈" : "●"}</i>
              <div><span>{collectible.locked ? collectible.futureCourse ? `Future · ${collectible.futureCourse}` : "Locked" : "Collected"}</span><h3>{collectible.title}</h3><p>{collectible.description}</p></div>
            </article>
          ))}
        </div>
        <p className={styles.cabinetNote}>Course relics remain locked until reviewed course content exists, at least 75% of its released concepts are mastered, and the learner earns 75% or better on a future original Fourth Canal cumulative Practice Test.</p>
      </section>

      <section className={styles.chorusConsent}>
        <div>
          <p className={styles.eyebrow}>Atlas Chorus</p>
          <h2>Optional anonymous signal</h2>
          <p>When you opt in, only your first answer to an approved item can contribute to an answer-percentage aggregate. No names, individual answers, peer ranks, or crowd data are shown. The Chorus stays unavailable until 20 distinct opted-in learners have answered that exact approved item.</p>
        </div>
        <label className={styles.chorusToggle}>
          <input type="checkbox" checked={chorusOptIn} disabled={isPending} onChange={(event) => updateConsent(event.target.checked)} />
          <span>{chorusOptIn ? "Contribution on" : "Contribution off"}</span>
        </label>
        {message ? <p className={styles.notice} role="status">{message}</p> : null}
      </section>
    </div>
  );
}
