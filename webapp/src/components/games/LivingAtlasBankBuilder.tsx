"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createLivingAtlasRecallSession, createLivingAtlasRun } from "@/app/(games)/games/living-atlas/actions";
import type { LivingAtlasBankOverview, LivingAtlasRunConfig } from "@/lib/living-atlas/types";
import styles from "./LivingAtlasPractice.module.css";

function wholeBankConfig(bank: LivingAtlasBankOverview): LivingAtlasRunConfig {
  return {
    mode: "study",
    length: bank.reviewQuestionCount,
    topics: [],
    difficulties: [],
    imageOnly: false,
    flaggedOnly: false,
    repairOnly: false,
    unseenOnly: false,
    visibleTimer: false,
  };
}

export function LivingAtlasBankBuilder({
  bank,
  initialQueue,
}: {
  bank: LivingAtlasBankOverview;
  initialQueue?: "echoes" | "flags";
  initialTopic?: string;
}) {
  const router = useRouter();
  const started = useRef(false);
  const isRecall = bank.deliveryKind === "recall";
  const [message, setMessage] = useState(isRecall ? "Preparing preserved source cards for Recall Practice…" : "Loading every approved question into one saved workspace…");

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (isRecall) {
      void createLivingAtlasRecallSession(bank.id).then((result) => {
        if (!result.ok) {
          setMessage(result.error);
          return;
        }
        router.replace(`/games/living-atlas/recall/${result.value.sessionId}`);
        router.refresh();
      });
      return;
    }
    void createLivingAtlasRun(wholeBankConfig(bank), bank.id).then((result) => {
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      const queue = initialQueue ? `?queue=${initialQueue}` : "";
      router.replace(`/games/living-atlas/runs/${result.value.runId}${queue}`);
      router.refresh();
    });
  }, [bank, initialQueue, isRecall, router]);

  return (
    <div className={styles.builderPage}>
      <div className={styles.breadcrumb}><Link href="/games/living-atlas">Question Banks</Link><span>/</span><strong>{bank.title}</strong></div>
      <section className={styles.bankHero}>
        <div>
          <p className={styles.eyebrow}>{isRecall ? "Preparing Recall Practice" : "Preparing complete Test workspace"}</p>
          <h1>{bank.title}</h1>
          <p>{isRecall
            ? `${bank.sourceCardCount} preserved source cards will stay together in one resumable Recall Practice workspace. Reveal each original answer, then rate what you remembered.`
            : `${bank.reviewQuestionCount} reviewed original questions will stay together in one resumable test workspace. Feedback mode, timer, and focused queues are available inside practice.`}</p>
        </div>
      </section>
      <section className={styles.loadingWorkspace} aria-live="polite">
        <span className={styles.loadingPulse} aria-hidden="true" />
        <div><strong>{message}</strong><p>{isRecall ? "This is source recall, not scored MCQ testing." : "No question-count picker and no fragmented sets."}</p></div>
      </section>
      {message.startsWith("Resume") || message.startsWith("This") ? <Link href="/games/living-atlas" className={styles.secondaryButton}>Return to Question Banks</Link> : null}
    </div>
  );
}
