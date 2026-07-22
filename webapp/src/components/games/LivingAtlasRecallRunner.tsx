"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  finishLivingAtlasRecall,
  getLivingAtlasRecallMedia,
  saveAndExitLivingAtlasRecall,
  syncLivingAtlasRecallSession,
} from "@/app/(games)/games/living-atlas/actions";
import type {
  LivingAtlasRecallCachedCard,
  LivingAtlasRecallRating,
  LivingAtlasRecallRunView,
  LivingAtlasRecallSyncPatch,
} from "@/lib/living-atlas/types";
import { ClinicalImageViewer } from "./ClinicalImageViewer";
import styles from "./LivingAtlasPractice.module.css";

type RecallFilter = "all" | "unrated" | "repair";
type RecallSaveState = "saved" | "saving" | "error";

type RecallOutbox = {
  version: 1;
  currentPosition: number;
  patches: Record<string, LivingAtlasRecallSyncPatch>;
};

function duration(ms: number) {
  const seconds = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function outboxKey(sessionId: string) {
  return `living-atlas-recall-outbox:${sessionId}`;
}

function samePatch(left: LivingAtlasRecallSyncPatch | undefined, right: LivingAtlasRecallSyncPatch) {
  if (!left) return false;
  return left.position === right.position
    && left.revealed === right.revealed
    && left.rating === right.rating
    && left.activeTimeMs === right.activeTimeMs;
}

export function LivingAtlasRecallRunner({ initialView }: { initialView: LivingAtlasRecallRunView }) {
  const router = useRouter();
  const [cards, setCards] = useState(initialView.cachedCards);
  const cardsRef = useRef(initialView.cachedCards);
  const [position, setPosition] = useState(initialView.session.currentPosition);
  const positionRef = useRef(initialView.session.currentPosition);
  const [elapsedMs, setElapsedMs] = useState(() => initialView.cachedCards.find((card) => card.position === initialView.session.currentPosition)?.activeTimeMs ?? 0);
  const elapsedMsRef = useRef(elapsedMs);
  const outboxRef = useRef<RecallOutbox>({ version: 1, currentPosition: initialView.session.currentPosition, patches: {} });
  const flushTimerRef = useRef<number | null>(null);
  const flushingRef = useRef(false);
  const flushRef = useRef<() => Promise<boolean>>(async () => false);
  const [saveState, setSaveState] = useState<RecallSaveState>("saved");
  const [filter, setFilter] = useState<RecallFilter>("all");
  const [mobileRailOpen, setMobileRailOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const writeOutbox = useCallback((outbox: RecallOutbox) => {
    outboxRef.current = outbox;
    if (typeof window !== "undefined") window.sessionStorage.setItem(outboxKey(initialView.session.id), JSON.stringify(outbox));
  }, [initialView.session.id]);

  const flush = useCallback(async () => {
    if (flushingRef.current) return false;
    const snapshot = outboxRef.current;
    if (!Object.keys(snapshot.patches).length) {
      setSaveState("saved");
      return true;
    }
    flushingRef.current = true;
    setSaveState("saving");
    try {
      const result = await syncLivingAtlasRecallSession({
        sessionId: initialView.session.id,
        currentPosition: snapshot.currentPosition,
        patches: Object.values(snapshot.patches),
      });
      if (!result.ok) {
        setMessage(result.error);
        setSaveState("error");
        return false;
      }
      const current = outboxRef.current;
      const remaining = { ...current.patches };
      for (const [positionKey, patch] of Object.entries(snapshot.patches)) {
        if (samePatch(remaining[positionKey], patch)) delete remaining[positionKey];
      }
      const nextOutbox: RecallOutbox = {
        version: 1,
        currentPosition: current.currentPosition,
        patches: remaining,
      };
      outboxRef.current = nextOutbox;
      if (typeof window !== "undefined") {
        if (Object.keys(remaining).length) window.sessionStorage.setItem(outboxKey(initialView.session.id), JSON.stringify(nextOutbox));
        else window.sessionStorage.removeItem(outboxKey(initialView.session.id));
      }
      setSaveState(Object.keys(remaining).length ? "saving" : "saved");
      return true;
    } finally {
      flushingRef.current = false;
      if (Object.keys(outboxRef.current.patches).length && !flushTimerRef.current) {
        flushTimerRef.current = window.setTimeout(() => {
          flushTimerRef.current = null;
          void flushRef.current();
        }, 300);
      }
    }
  }, [initialView.session.id]);
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const queueSync = useCallback((patch: LivingAtlasRecallSyncPatch, currentPosition: number) => {
    const previous = outboxRef.current.patches[String(patch.position)];
    const merged: LivingAtlasRecallSyncPatch = {
      position: patch.position,
      revealed: patch.revealed ?? previous?.revealed,
      rating: patch.rating ?? previous?.rating,
      activeTimeMs: Math.max(previous?.activeTimeMs ?? 0, patch.activeTimeMs),
    };
    const nextOutbox: RecallOutbox = {
      version: 1,
      currentPosition,
      patches: { ...outboxRef.current.patches, [String(patch.position)]: merged },
    };
    writeOutbox(nextOutbox);
    setSaveState("saving");
    if (flushTimerRef.current) window.clearTimeout(flushTimerRef.current);
    flushTimerRef.current = window.setTimeout(() => {
      flushTimerRef.current = null;
      void flush();
    }, 160);
  }, [flush, writeOutbox]);

  const setLocalCards = useCallback((nextCards: LivingAtlasRecallCachedCard[]) => {
    cardsRef.current = nextCards;
    setCards(nextCards);
  }, []);

  const setLocalPosition = useCallback((nextPosition: number) => {
    const nextCard = cardsRef.current.find((card) => card.position === nextPosition);
    positionRef.current = nextPosition;
    setPosition(nextPosition);
    elapsedMsRef.current = nextCard?.activeTimeMs ?? 0;
    setElapsedMs(elapsedMsRef.current);
  }, []);

  const updateCard = useCallback((cardPosition: number, update: Partial<LivingAtlasRecallCachedCard>) => {
    setLocalCards(cardsRef.current.map((card) => card.position === cardPosition ? { ...card, ...update } : card));
  }, [setLocalCards]);

  useEffect(() => {
    const requestedPositions = [position - 1, position, position + 1]
      .filter((candidate) => candidate >= 1 && candidate <= initialView.session.cardCount)
      .filter((candidate) => cardsRef.current.find((card) => card.position === candidate)?.card.imagePending);
    if (!requestedPositions.length) return;
    let cancelled = false;
    void getLivingAtlasRecallMedia({ sessionId: initialView.session.id, positions: requestedPositions }).then((result) => {
      if (cancelled || !result.ok) return;
      const byPosition = new Map(result.value.map((item) => [item.position, item]));
      setLocalCards(cardsRef.current.map((item) => {
        const image = byPosition.get(item.position);
        if (!image) return item;
        return {
          ...item,
          card: { ...item.card, imagePlacement: image.imagePlacement, imagePending: false, imageAvailable: image.imageAvailable, imageUrl: image.imageUrl, imageCaption: image.imageCaption },
          reveal: { ...item.reveal, imagePending: false, imageAvailable: image.imageAvailable, imageUrl: image.imageUrl, imageCaption: image.imageCaption },
        };
      }));
    });
    return () => { cancelled = true; };
  }, [initialView.session.cardCount, initialView.session.id, position, setLocalCards]);

  const navigate = useCallback((nextPosition: number) => {
    if (nextPosition < 1 || nextPosition > initialView.session.cardCount || nextPosition === positionRef.current || finalizing) return;
    const current = cardsRef.current.find((card) => card.position === positionRef.current);
    if (current) {
      updateCard(current.position, { activeTimeMs: elapsedMsRef.current });
      queueSync({
        position: current.position,
        revealed: current.revealed,
        rating: current.rating ?? undefined,
        activeTimeMs: elapsedMsRef.current,
      }, nextPosition);
    }
    setMessage(null);
    setMobileRailOpen(false);
    setLocalPosition(nextPosition);
  }, [finalizing, initialView.session.cardCount, queueSync, setLocalPosition, updateCard]);

  const reveal = useCallback(() => {
    const current = cardsRef.current.find((card) => card.position === positionRef.current);
    if (!current || current.revealed || finalizing) return;
    const next = { ...current, revealed: true, activeTimeMs: elapsedMsRef.current };
    updateCard(current.position, next);
    queueSync({ position: current.position, revealed: true, activeTimeMs: elapsedMsRef.current }, positionRef.current);
    setMessage(null);
  }, [finalizing, queueSync, updateCard]);

  const hide = useCallback(() => {
    const current = cardsRef.current.find((card) => card.position === positionRef.current);
    if (!current || !current.revealed || finalizing) return;
    const next = { ...current, revealed: false, activeTimeMs: elapsedMsRef.current };
    updateCard(current.position, next);
    queueSync({ position: current.position, revealed: false, activeTimeMs: elapsedMsRef.current }, positionRef.current);
    setMessage(null);
  }, [finalizing, queueSync, updateCard]);

  const rate = useCallback((rating: LivingAtlasRecallRating) => {
    const current = cardsRef.current.find((card) => card.position === positionRef.current);
    if (!current || !current.revealed || finalizing) return;
    const nextPosition = current.position < initialView.session.cardCount ? current.position + 1 : current.position;
    updateCard(current.position, {
      revealed: true,
      rating,
      needsRecall: rating !== "know_it",
      activeTimeMs: elapsedMsRef.current,
    });
    queueSync({ position: current.position, revealed: true, rating, activeTimeMs: elapsedMsRef.current }, nextPosition);
    setMessage(null);
    if (nextPosition !== current.position) setLocalPosition(nextPosition);
  }, [finalizing, initialView.session.cardCount, queueSync, setLocalPosition, updateCard]);

  useEffect(() => {
    const saved = window.sessionStorage.getItem(outboxKey(initialView.session.id));
    if (!saved) return;
    try {
      const outbox = JSON.parse(saved) as RecallOutbox;
      if (outbox.version !== 1 || !outbox.patches || !Number.isInteger(outbox.currentPosition)) return;
      const recoveredCards = initialView.cachedCards.map((card) => {
        const patch = outbox.patches[String(card.position)];
        if (!patch) return card;
        return {
          ...card,
          revealed: typeof patch.revealed === "boolean" ? patch.revealed : card.revealed,
          rating: patch.rating ?? card.rating,
          needsRecall: patch.rating ? patch.rating !== "know_it" : card.needsRecall,
          activeTimeMs: Math.max(card.activeTimeMs, patch.activeTimeMs),
        };
      });
      const restoreTimer = window.setTimeout(() => {
        setLocalCards(recoveredCards);
        outboxRef.current = outbox;
        setLocalPosition(Math.min(Math.max(outbox.currentPosition, 1), initialView.session.cardCount));
        setSaveState("saving");
        void flush();
      }, 0);
      return () => window.clearTimeout(restoreTimer);
    } catch {
      window.sessionStorage.removeItem(outboxKey(initialView.session.id));
    }
  // Restore only once from the server-rendered active session.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialView.cachedCards, initialView.session.cardCount, setLocalCards, setLocalPosition, queueSync, flush]);

  useEffect(() => {
    const bodyOverflow = document.body.style.overflow;
    const rootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = rootOverflow;
      if (flushTimerRef.current) window.clearTimeout(flushTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (exitOpen || initialView.session.status !== "active") return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        setElapsedMs((current) => {
          const next = current + 1000;
          elapsedMsRef.current = next;
          return next;
        });
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [exitOpen, initialView.session.status]);

  useEffect(() => {
    function saveWhenHidden() {
      if (document.visibilityState !== "hidden") return;
      const current = cardsRef.current.find((card) => card.position === positionRef.current);
      if (current) queueSync({ position: current.position, revealed: current.revealed, rating: current.rating ?? undefined, activeTimeMs: elapsedMsRef.current }, positionRef.current);
      void flush();
    }
    document.addEventListener("visibilitychange", saveWhenHidden);
    return () => document.removeEventListener("visibilitychange", saveWhenHidden);
  }, [flush, queueSync]);

  useEffect(() => {
    function handleRecallShortcut(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat || exitOpen || finalizing) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("input, textarea, select, a, [contenteditable='true']")) return;
      const current = cardsRef.current.find((card) => card.position === positionRef.current);
      if (!current) return;
      if (event.key === " ") {
        event.preventDefault();
      if (!current.revealed) {
        reveal();
        return;
      }
      hide();
      return;
      }
      if (current.revealed && event.key === "1") {
        event.preventDefault();
        rate("again");
      } else if (current.revealed && event.key === "2") {
        event.preventDefault();
        rate("learning");
      } else if (current.revealed && event.key === "3") {
        event.preventDefault();
        rate("know_it");
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        navigate(positionRef.current - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        navigate(positionRef.current + 1);
      } else if (event.key === "Escape") {
        event.preventDefault();
        setExitOpen(true);
      }
    }
    window.addEventListener("keydown", handleRecallShortcut);
    return () => window.removeEventListener("keydown", handleRecallShortcut);
  }, [exitOpen, finalizing, hide, navigate, rate, reveal]);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [position]);

  const ratedCount = cards.filter((card) => card.rating).length;
  const repairCount = cards.filter((card) => card.needsRecall).length;
  const visibleCards = useMemo(() => cards.filter((card) => filter === "all" || (filter === "unrated" && !card.rating) || (filter === "repair" && card.needsRecall)), [cards, filter]);
  const current = cards.find((card) => card.position === position) ?? cards[0];

  async function saveAndExit() {
    setFinalizing(true);
    const synced = await flush();
    if (!synced) {
      setFinalizing(false);
      return;
    }
    const result = await saveAndExitLivingAtlasRecall({ sessionId: initialView.session.id, activeTimeMs: elapsedMsRef.current });
    if (!result.ok) {
      setMessage(result.error);
      setFinalizing(false);
      return;
    }
    router.push(`/games/living-atlas/banks/${result.value.bankId}`);
    router.refresh();
  }

  async function finish() {
    setFinalizing(true);
    const synced = await flush();
    if (!synced) {
      setFinalizing(false);
      return;
    }
    const result = await finishLivingAtlasRecall({ sessionId: initialView.session.id, activeTimeMs: elapsedMsRef.current });
    if (!result.ok) {
      setMessage(result.error);
      setFinalizing(false);
      return;
    }
    router.push(`/games/living-atlas/banks/${initialView.session.bankId}`);
    router.refresh();
  }

  if (!current) return null;
  const showPromptImage = current.card.imagePlacement === "prompt" && current.card.imageAvailable && current.card.imageUrl;
  const showAnswerImage = current.card.imagePlacement === "answer" && current.revealed && current.reveal.imageAvailable && current.reveal.imageUrl;
  const saveLabel = saveState === "saving" ? "Saving…" : saveState === "error" ? "Save needs retry" : "Saved";

  return (
    <div className={`${styles.runnerPage} ${styles.isolatedRunner} ${styles.recallRunner}`}>
      <button type="button" className={styles.mobileRailToggle} onClick={() => setMobileRailOpen(true)} aria-label="Open recall controls">☰</button>
      <button type="button" className={`${styles.railBackdrop} ${mobileRailOpen ? styles.railBackdropOpen : ""}`} onClick={() => setMobileRailOpen(false)} aria-label="Close recall controls" />
      <aside className={`${styles.questionNavigator} ${mobileRailOpen ? styles.mobileRailOpen : ""}`} aria-label="Recall controls and card navigator">
        <div className={styles.navigatorHeader}><button type="button" className={styles.iconButton} onClick={() => setExitOpen(true)} aria-label="End or save Recall Practice">×</button><button type="button" className={styles.mobileRailClose} onClick={() => setMobileRailOpen(false)} aria-label="Close recall controls">×</button></div>
        <p className={styles.navigatorCourse}>{initialView.courseTitle}</p>
        <h2>{initialView.bankTitle}</h2>
        <div className={styles.navigatorProgress}><i style={{ width: `${Math.round((ratedCount / initialView.session.cardCount) * 100)}%` }} /></div>
        <strong>{ratedCount}/{initialView.session.cardCount} self-rated · {repairCount} in Recall Repair</strong>
        <div className={styles.railStats}><span>Unrated <b>{initialView.session.cardCount - ratedCount}</b></span><span>Repair <b>{repairCount}</b></span><span>Time <b>{duration(elapsedMs)}</b></span><span>Card <b>{position}</b></span></div>
        <section className={styles.railSection}><p>Recall Practice</p><span className={styles.railDescription}>Preserved source cards only. Ratings build Recall Repair; they never change Test Mode accuracy, mastery, achievements, or companion stats.</span><span className={`${styles.recallSaveState} ${saveState === "error" ? styles.recallSaveError : ""}`} aria-live="polite">{saveLabel}</span><button type="button" className={styles.railButton} onClick={() => setExitOpen(true)}>End / Save <kbd>Esc</kbd></button></section>
        <div className={styles.navigatorFilters} aria-label="Recall queues">{([ ["all", "All"], ["unrated", "Unrated"], ["repair", "Repair"] ] as const).map(([nextFilter, label]) => <button key={nextFilter} type="button" className={filter === nextFilter ? styles.navigatorFilterActive : ""} onClick={() => setFilter(nextFilter)}><span>{label}</span><b>{nextFilter === "all" ? initialView.session.cardCount : nextFilter === "unrated" ? initialView.session.cardCount - ratedCount : repairCount}</b></button>)}</div>
        <div className={styles.navigatorList}>{visibleCards.length ? visibleCards.map((item) => <button key={item.position} type="button" className={item.position === position ? styles.currentQuestion : ""} onClick={() => navigate(item.position)} disabled={finalizing}><i className={item.rating === "know_it" ? styles.itemCommitted : item.rating ? styles.itemAnswered : ""} /><span>Card {item.position}</span>{item.needsRecall ? <b className={styles.echoDot}>R</b> : null}</button>) : <p className={styles.emptyQueue}>No cards are in this queue yet.</p>}</div>
      </aside>

      <section className={styles.questionWorkspace}>
        <header className={styles.questionHeader}><div><span>Card {position} of {initialView.session.cardCount}</span><small>Recall Practice · preserved source</small></div></header>
        {message ? <div className={styles.notice} role="status">{message}</div> : null}
        <div className={styles.questionBody}>
          <div className={styles.questionTaxonomy}><span>Immutable source card</span><span>Self-rated recall</span></div>
          <h1 ref={headingRef} tabIndex={-1}>{current.card.prompt}</h1>
          {showPromptImage ? <ClinicalImageViewer src={current.card.imageUrl!} alt="Source-card reference image" label="Reference image" caption={current.card.imageCaption} /> : null}
          {current.card.hasImage && current.card.imagePending && current.card.imagePlacement === "prompt" ? <div className={styles.imageFallback}>Loading private reference image…</div> : null}
          {current.card.hasImage && !current.card.imagePending && !showPromptImage && !showAnswerImage && current.card.imagePlacement === "prompt" ? <div className={styles.imageFallback}>The registered source image is temporarily unavailable.</div> : null}
          {!current.revealed ? <section className={styles.recallRevealPanel}><p>Answer stays hidden until you are ready to check your recall.</p><button type="button" className={styles.primaryButton} disabled={finalizing} onClick={reveal} aria-keyshortcuts="Space">Reveal preserved answer <kbd>Space</kbd></button><p className={styles.recallShortcut}>The answer is ready locally. Press <kbd>Space</kbd> to flip instantly.</p></section> : <section className={styles.recallAnswerPanel}><p>Preserved answer</p><h2>{current.reveal.answer}</h2>{showAnswerImage ? <ClinicalImageViewer src={current.reveal.imageUrl ?? ""} alt="Source-card answer reference image" label="Answer reference image" caption={current.reveal.imageCaption ?? null} /> : null}<div className={styles.recallRatingRow}><span>How well did you recall it?</span><button type="button" className={styles.recallAgain} disabled={finalizing} onClick={() => rate("again")} aria-keyshortcuts="1">Again <kbd>1</kbd></button><button type="button" className={styles.recallLearning} disabled={finalizing} onClick={() => rate("learning")} aria-keyshortcuts="2">Learning <kbd>2</kbd></button><button type="button" className={styles.recallKnow} disabled={finalizing} onClick={() => rate("know_it")} aria-keyshortcuts="3">Know it <kbd>3</kbd></button></div><button type="button" className={styles.secondaryButton} disabled={finalizing} onClick={hide} aria-keyshortcuts="Space">Return to card prompt</button><p className={styles.recallDisclosure}>Again and Learning add this card to Recall Repair. This does not affect scored accuracy or the Holland Lop.</p></section>}
          <footer className={styles.questionFooter}><button type="button" className={styles.secondaryButton} disabled={position === 1 || finalizing} onClick={() => navigate(position - 1)}>Previous <kbd>←</kbd></button><button type="button" className={styles.secondaryButton} disabled={position === initialView.session.cardCount || finalizing} onClick={() => navigate(position + 1)}>Next card <kbd>→</kbd></button></footer>
        </div>
      </section>

      {exitOpen ? <div className={styles.modalBackdrop} role="presentation"><section className={styles.exitDialog} role="dialog" aria-modal="true" aria-labelledby="recall-exit-title"><div className={styles.exitIcon}>✓</div><h2 id="recall-exit-title">Leave Recall Practice?</h2><p>Your revealed cards, self-ratings, Repair queue, and position are saved separately from Test Mode.</p><div className={styles.exitSummary}><div><span>Rated</span><strong>{ratedCount} of {initialView.session.cardCount}</strong></div><div><span>Current card</span><strong>{duration(elapsedMs)}</strong></div><div><span>Again / Learning</span><strong>{repairCount}</strong></div><div><span>Know it</span><strong>{cards.filter((item) => item.rating === "know_it").length}</strong></div></div><div className={styles.exitActions}><button type="button" className={styles.secondaryButton} disabled={finalizing} onClick={() => setExitOpen(false)}>Return to cards</button><button type="button" className={styles.secondaryButton} disabled={finalizing} onClick={saveAndExit}>Save &amp; exit for later</button><button type="button" className={styles.primaryButton} disabled={finalizing} onClick={finish}>{ratedCount ? "Finish Recall Practice" : "Discard empty session"}</button></div></section></div> : null}
    </div>
  );
}
