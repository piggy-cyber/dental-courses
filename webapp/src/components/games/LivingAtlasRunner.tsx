"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  commitLivingAtlasAnswer,
  finishLivingAtlasRun,
  getLivingAtlasRunPromptMedia,
  saveAndExitLivingAtlas,
  setLivingAtlasFlag,
  syncLivingAtlasRun,
  useLivingAtlasStudyAid as invokeLivingAtlasStudyAid,
} from "@/app/(games)/games/living-atlas/actions";
import type {
  LivingAtlasAidType,
  LivingAtlasChoice,
  LivingAtlasConfidence,
  LivingAtlasMode,
  LivingAtlasRunView,
  LivingAtlasSafeQuestion,
} from "@/lib/living-atlas/types";
import { ClinicalImageViewer } from "./ClinicalImageViewer";
import styles from "./LivingAtlasPractice.module.css";
import { WhiteHollandLop } from "./WhiteHollandLop";

type NavigatorFilter = "all" | "unanswered" | "echoes" | "flags";
type NavigatorLayout = "list" | "grid";
type BrowserDraft = {
  selectedChoiceId: LivingAtlasChoice["id"] | null;
  confidence: LivingAtlasConfidence | null;
  activeTimeMs: number;
};
type PendingDraft = BrowserDraft & { revision: number };
type PendingSession = {
  revision: number;
  currentPosition: number;
  mode: LivingAtlasMode;
  visibleTimer: boolean;
};
type PromptMedia = Pick<LivingAtlasSafeQuestion, "images" | "imageAvailable" | "imageUrl" | "imageCaption">;
type StoredRecovery = {
  version: 2;
  revision: number;
  drafts: Record<string, BrowserDraft>;
  pending: Record<string, PendingDraft>;
  pendingSession: PendingSession | null;
  currentPosition: number;
  textScale: "small" | "default" | "large";
  answerStatsVisible: boolean;
  navigatorLayout: NavigatorLayout;
};

function duration(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function confidenceLabel(value: LivingAtlasConfidence) {
  return value === 1 ? "Guessing" : value === 2 ? "Unsure" : "Confident";
}

function isStoredRecovery(value: unknown): value is StoredRecovery {
  return Boolean(value && typeof value === "object" && (value as { version?: unknown }).version === 2);
}

export function LivingAtlasRunner({ initialView, initialQueue = "all" }: { initialView: LivingAtlasRunView; initialQueue?: NavigatorFilter }) {
  const router = useRouter();
  const [view, setView] = useState(initialView);
  const [selected, setSelected] = useState<LivingAtlasChoice["id"] | null>(initialView.selectedChoiceId);
  const [confidence, setConfidence] = useState<LivingAtlasConfidence | null>(initialView.confidence);
  const [elapsedMs, setElapsedMs] = useState(initialView.itemActiveTimeMs);
  const [feedback, setFeedback] = useState(initialView.feedback);
  const [checking, setChecking] = useState(false);
  const [navigatorFilter, setNavigatorFilter] = useState<NavigatorFilter>(initialQueue);
  const [navigatorQuery, setNavigatorQuery] = useState("");
  const [navigatorLayout, setNavigatorLayout] = useState<NavigatorLayout>("list");
  const [mobileRailOpen, setMobileRailOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [answerStatsVisible, setAnswerStatsVisible] = useState(true);
  const [textScale, setTextScale] = useState<"small" | "default" | "large">("default");
  const [exitOpen, setExitOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<"saved" | "saving" | "queued">("saved");
  const [isPending, startTransition] = useTransition();
  const [mediaByPosition, setMediaByPosition] = useState<Record<number, PromptMedia>>(() => initialView.question ? {
    [initialView.run.currentPosition]: {
      images: initialView.question.images,
      imageAvailable: initialView.question.imageAvailable,
      imageUrl: initialView.question.imageUrl,
      imageCaption: initialView.question.imageCaption,
    },
  } : {});

  const browserDraftKey = `living-atlas-run:${initialView.run.id}:workspace-v2`;
  const selectedRef = useRef(selected);
  const confidenceRef = useRef(confidence);
  const elapsedRef = useRef(elapsedMs);
  const sessionRef = useRef({
    currentPosition: initialView.run.currentPosition,
    mode: initialView.run.mode,
    visibleTimer: initialView.run.visibleTimer,
  });
  const presentationRef = useRef({ textScale, answerStatsVisible, navigatorLayout });
  const drafts = useRef<Record<string, BrowserDraft>>(Object.fromEntries(initialView.cachedItems.map((item) => [String(item.position), {
    selectedChoiceId: item.selectedChoiceId,
    confidence: item.confidence,
    activeTimeMs: item.activeTimeMs,
  }])));
  const pendingDrafts = useRef(new Map<number, PendingDraft>());
  const pendingSession = useRef<PendingSession | null>(null);
  const revision = useRef(0);
  const flushTimer = useRef<number | null>(null);
  const inFlightSync = useRef<Promise<boolean> | null>(null);
  const checkingTimer = useRef<number | null>(null);

  const currentPosition = view.run.currentPosition;
  const currentItem = view.cachedItems.find((item) => item.position === currentPosition) ?? null;
  const rawQuestion = currentItem?.question ?? view.question;
  const currentMedia = mediaByPosition[currentPosition];
  const question = rawQuestion && currentMedia
    ? { ...rawQuestion, ...currentMedia, imagePending: false }
    : rawQuestion;
  const isStudy = view.run.mode === "study";
  const alreadyCommitted = currentItem?.committed ?? view.alreadyCommitted;
  const manuallyFlagged = currentItem?.flagged ?? view.manuallyFlagged;
  const feedbackOpen = Boolean(feedback);
  const answeredCount = useMemo(() => view.navigator.filter((item) => item.answered).length, [view.navigator]);
  const navigatorCounts = useMemo(() => ({
    all: view.navigator.length,
    unanswered: view.navigator.filter((item) => !item.answered).length,
    echoes: view.navigator.filter((item) => item.activeEcho).length,
    flags: view.navigator.filter((item) => item.flagged).length,
  }), [view.navigator]);
  const visibleNavigator = useMemo(() => view.navigator.filter((item) => {
    const queueMatch = navigatorFilter === "all"
      || (navigatorFilter === "unanswered" && !item.answered)
      || (navigatorFilter === "echoes" && item.activeEcho)
      || (navigatorFilter === "flags" && item.flagged);
    return queueMatch && `question ${item.position}`.includes(navigatorQuery.trim().toLowerCase());
  }), [navigatorFilter, navigatorQuery, view.navigator]);
  const averagePace = answeredCount
    ? Math.round(view.cachedItems.filter((item) => item.selectedChoiceId).reduce((sum, item) => sum + item.activeTimeMs, 0) / answeredCount)
    : 0;
  const promptImages = question?.images?.filter((image) => image.available && image.url) ?? [];
  const feedbackImages = feedback?.images?.filter((image) => image.available && image.url) ?? [];
  const correctChoiceText = feedback && question
    ? question.choices.find((choice) => choice.id === feedback.correctChoiceId)?.text ?? ""
    : "";
  const prismAvailable = question?.itemFormat !== "true_false" && question?.choices.length === 4;

  useEffect(() => { selectedRef.current = selected; }, [selected]);
  useEffect(() => { confidenceRef.current = confidence; }, [confidence]);
  useEffect(() => { elapsedRef.current = elapsedMs; }, [elapsedMs]);
  useEffect(() => { presentationRef.current = { textScale, answerStatsVisible, navigatorLayout }; }, [answerStatsVisible, navigatorLayout, textScale]);

  function persistRecovery() {
    try {
      const stored: StoredRecovery = {
        version: 2,
        revision: revision.current,
        drafts: drafts.current,
        pending: Object.fromEntries(pendingDrafts.current),
        pendingSession: pendingSession.current,
        currentPosition: sessionRef.current.currentPosition,
        ...presentationRef.current,
      };
      window.sessionStorage.setItem(browserDraftKey, JSON.stringify(stored));
    } catch {
      // Session persistence is an enhancement; live saving continues normally.
    }
  }

  function scheduleFlush(delay = 420) {
    if (flushTimer.current) window.clearTimeout(flushTimer.current);
    flushTimer.current = window.setTimeout(() => { void flushWorkspace(); }, delay);
  }

  function queueSync(patch?: { position: number; draft: BrowserDraft }) {
    const nextRevision = ++revision.current;
    if (patch) pendingDrafts.current.set(patch.position, { ...patch.draft, revision: nextRevision });
    pendingSession.current = { revision: nextRevision, ...sessionRef.current };
    persistRecovery();
    setSyncState("queued");
    scheduleFlush();
  }

  async function flushWorkspace(): Promise<boolean> {
    if (inFlightSync.current) {
      await inFlightSync.current;
      return pendingSession.current || pendingDrafts.current.size ? flushWorkspace() : true;
    }
    const sessionSnapshot = pendingSession.current;
    if (!sessionSnapshot && pendingDrafts.current.size === 0) return true;
    const draftSnapshot = Array.from(pendingDrafts.current.entries()).map(([position, draft]) => ({ position, ...draft }));
    setSyncState("saving");
    const request = syncLivingAtlasRun({
      runId: view.run.id,
      revision: sessionSnapshot?.revision ?? Math.max(...draftSnapshot.map((draft) => draft.revision), revision.current),
      currentPosition: sessionSnapshot?.currentPosition ?? sessionRef.current.currentPosition,
      mode: sessionSnapshot?.mode ?? sessionRef.current.mode,
      visibleTimer: sessionSnapshot?.visibleTimer ?? sessionRef.current.visibleTimer,
      patches: draftSnapshot.map((draft) => ({
        position: draft.position,
        selectedChoiceId: draft.selectedChoiceId,
        confidence: draft.confidence,
        activeTimeMs: draft.activeTimeMs,
      })),
    }).then((result) => {
      if (!result.ok) {
        setMessage(result.error);
        setSyncState("queued");
        return false;
      }
      const appliedRevision = result.value.revision;
      for (const [position, draft] of pendingDrafts.current) {
        if (draft.revision <= appliedRevision) pendingDrafts.current.delete(position);
      }
      if (pendingSession.current?.revision && pendingSession.current.revision <= appliedRevision) pendingSession.current = null;
      persistRecovery();
      setSyncState(pendingSession.current || pendingDrafts.current.size ? "queued" : "saved");
      if (pendingSession.current || pendingDrafts.current.size) scheduleFlush(80);
      return true;
    }).catch(() => {
      setSyncState("queued");
      return false;
    }).finally(() => { inFlightSync.current = null; });
    inFlightSync.current = request;
    return request;
  }

  function updateCachedItem(position: number, patch: Partial<BrowserDraft> & { committed?: boolean; flagged?: boolean; activeEcho?: boolean }) {
    setView((current) => ({
      ...current,
      cachedItems: current.cachedItems.map((item) => item.position === position ? {
        ...item,
        ...patch,
        answered: patch.selectedChoiceId === undefined ? item.answered : Boolean(patch.selectedChoiceId),
      } : item),
      navigator: current.navigator.map((item) => item.position === position ? {
        ...item,
        answered: patch.selectedChoiceId === undefined ? item.answered : Boolean(patch.selectedChoiceId),
        committed: patch.committed ?? item.committed,
        flagged: patch.flagged ?? item.flagged,
        activeEcho: patch.activeEcho ?? item.activeEcho,
      } : item),
    }));
  }

  function setLocalSession(next: { currentPosition?: number; mode?: LivingAtlasMode; visibleTimer?: boolean }) {
    sessionRef.current = { ...sessionRef.current, ...next };
    setView((current) => ({
      ...current,
      run: {
        ...current.run,
        currentPosition: sessionRef.current.currentPosition,
        mode: sessionRef.current.mode,
        visibleTimer: sessionRef.current.visibleTimer,
      },
    }));
  }

  function currentDraft(): BrowserDraft {
    return { selectedChoiceId: selectedRef.current, confidence: confidenceRef.current, activeTimeMs: elapsedRef.current };
  }

  function queueCurrentDraft(position = sessionRef.current.currentPosition) {
    const draft = currentDraft();
    drafts.current[String(position)] = draft;
    updateCachedItem(position, draft);
    queueSync({ position, draft });
  }

  function selectAnswer(id: LivingAtlasChoice["id"]) {
    if (alreadyCommitted || checking) return;
    const nextConfidence = confidenceRef.current ?? 2;
    selectedRef.current = id;
    confidenceRef.current = nextConfidence;
    setSelected(id);
    setConfidence(nextConfidence);
    const draft = { selectedChoiceId: id, confidence: nextConfidence, activeTimeMs: elapsedRef.current };
    drafts.current[String(currentPosition)] = draft;
    updateCachedItem(currentPosition, draft);
    queueSync({ position: currentPosition, draft });
  }

  function selectConfidence(value: LivingAtlasConfidence) {
    if (alreadyCommitted || checking) return;
    confidenceRef.current = value;
    setConfidence(value);
    const draft = { selectedChoiceId: selectedRef.current, confidence: value, activeTimeMs: elapsedRef.current };
    drafts.current[String(currentPosition)] = draft;
    updateCachedItem(currentPosition, draft);
    queueSync({ position: currentPosition, draft });
  }

  function navigateTo(position: number, allowAfterFeedback = false) {
    if (position < 1 || position > view.run.questionCount) return;
    if (feedbackOpen && position !== currentPosition && !allowAfterFeedback) return;
    const cached = view.cachedItems.find((item) => item.position === position);
    if (!cached) return;
    queueCurrentDraft(currentPosition);
    const nextDraft = drafts.current[String(position)] ?? {
      selectedChoiceId: cached.selectedChoiceId,
      confidence: cached.confidence,
      activeTimeMs: cached.activeTimeMs,
    };
    setMessage(null);
    setFeedback(null);
    setMobileRailOpen(false);
    setLocalSession({ currentPosition: position });
    selectedRef.current = nextDraft.selectedChoiceId;
    confidenceRef.current = nextDraft.confidence;
    elapsedRef.current = nextDraft.activeTimeMs;
    setSelected(nextDraft.selectedChoiceId);
    setConfidence(nextDraft.confidence);
    setElapsedMs(nextDraft.activeTimeMs);
    queueSync();
  }

  function changeMode(mode: LivingAtlasMode) {
    if (mode === "review" && view.cachedItems.some((item) => item.committed)) {
      setMessage("Review at end cannot be enabled after an explanation has already been revealed.");
      return;
    }
    setLocalSession({ mode });
    setFeedback(null);
    queueSync();
  }

  function changeVisibleTimer(visibleTimer: boolean) {
    setLocalSession({ visibleTimer });
    queueSync();
  }

  function changeAnswerStatsVisible(next: boolean) {
    presentationRef.current = { ...presentationRef.current, answerStatsVisible: next };
    setAnswerStatsVisible(next);
    persistRecovery();
  }

  function changeTextScale(next: "small" | "default" | "large") {
    presentationRef.current = { ...presentationRef.current, textScale: next };
    setTextScale(next);
    persistRecovery();
  }

  function changeNavigatorLayout(next: NavigatorLayout) {
    presentationRef.current = { ...presentationRef.current, navigatorLayout: next };
    setNavigatorLayout(next);
    persistRecovery();
  }

  function toggleFlag() {
    if (!question) return;
    const nextFlagged = !manuallyFlagged;
    updateCachedItem(currentPosition, { flagged: nextFlagged });
    void setLivingAtlasFlag(question.id, nextFlagged, view.run.bankId).then((result) => {
      if (!result.ok) setMessage(result.error);
      if (result.ok) setView((current) => ({ ...current, progress: result.value }));
    });
  }

  function prefetchPromptMedia(positions: number[]) {
    const needed = positions.filter((position) => position >= 1 && position <= view.run.questionCount && !mediaByPosition[position]);
    if (!needed.length) return;
    void getLivingAtlasRunPromptMedia({ runId: view.run.id, positions: needed.slice(0, 3) }).then((result) => {
      if (!result.ok) return;
      setMediaByPosition((current) => {
        const next = { ...current };
        result.value.forEach((media) => {
          next[media.position] = {
            images: media.images,
            imageAvailable: media.imageAvailable,
            imageUrl: media.imageUrl,
            imageCaption: media.imageCaption,
          };
          media.images?.forEach((image) => {
            if (image.url) {
              const preload = new Image();
              preload.src = image.url;
            }
          });
        });
        return next;
      });
    });
  }

  function commitAnswer() {
    if (!selectedRef.current || !confidenceRef.current || checking) return setMessage("Choose an answer and confidence first.");
    setMessage(null);
    const startedChecking = window.setTimeout(() => setChecking(true), 150);
    checkingTimer.current = startedChecking;
    void commitLivingAtlasAnswer({
      runId: view.run.id,
      position: currentPosition,
      selectedChoiceId: selectedRef.current,
      confidence: confidenceRef.current,
      activeTimeMs: elapsedRef.current,
    }).then((result) => {
      if (!result.ok) return setMessage(result.error);
      updateCachedItem(result.value.position, {
        selectedChoiceId: result.value.selectedChoiceId,
        confidence: confidenceRef.current,
        activeTimeMs: elapsedRef.current,
        committed: true,
        activeEcho: result.value.activeEcho,
      });
      setFeedback(result.value.feedback);
      queueCurrentDraft(result.value.position);
    }).catch(() => setMessage("The answer could not be checked. Your local selection is still saved.")).finally(() => {
      if (checkingTimer.current) window.clearTimeout(checkingTimer.current);
      checkingTimer.current = null;
      setChecking(false);
    });
  }

  function activateAid(aidType: LivingAtlasAidType) {
    if (!question || alreadyCommitted || !isStudy) return;
    setMessage(null);
    startTransition(async () => {
      const result = await invokeLivingAtlasStudyAid({ runId: view.run.id, position: currentPosition, aidType });
      if (!result.ok) return setMessage(result.error);
      setView(result.value);
      sessionRef.current = {
        currentPosition: result.value.run.currentPosition,
        mode: result.value.run.mode,
        visibleTimer: result.value.run.visibleTimer,
      };
      const nextDraft = result.value.cachedItems.find((item) => item.position === result.value.run.currentPosition);
      setSelected(nextDraft?.selectedChoiceId ?? result.value.selectedChoiceId);
      setConfidence(nextDraft?.confidence ?? result.value.confidence);
      setElapsedMs(nextDraft?.activeTimeMs ?? result.value.itemActiveTimeMs);
      setFeedback(result.value.feedback);
      persistRecovery();
    });
  }

  async function saveAndExit() {
    setMessage(null);
    const synced = await flushWorkspace();
    if (!synced) return setMessage("Your connection is unavailable. Keep this page open and try Save again.");
    startTransition(async () => {
      const result = await saveAndExitLivingAtlas({
        runId: view.run.id,
        position: sessionRef.current.currentPosition,
        selectedChoiceId: selectedRef.current,
        confidence: confidenceRef.current,
        activeTimeMs: elapsedRef.current,
      });
      if (!result.ok) return setMessage(result.error);
      window.sessionStorage.removeItem(browserDraftKey);
      router.push(`/games/living-atlas/banks/${result.value.bankId}`);
      router.refresh();
    });
  }

  async function finish() {
    setMessage(null);
    const synced = await flushWorkspace();
    if (!synced) return setMessage("Your connection is unavailable. Keep this page open and try Finish again.");
    startTransition(async () => {
      const result = await finishLivingAtlasRun({
        runId: view.run.id,
        position: sessionRef.current.currentPosition,
        selectedChoiceId: selectedRef.current,
        confidence: confidenceRef.current,
        activeTimeMs: elapsedRef.current,
      });
      if (!result.ok) return setMessage(result.error);
      window.sessionStorage.removeItem(browserDraftKey);
      router.push(result.value.status === "abandoned" ? `/games/living-atlas/banks/${view.run.bankId}` : `/games/living-atlas/runs/${view.run.id}/results`);
      router.refresh();
    });
  }

  useEffect(() => {
    const bodyOverflow = document.body.style.overflow;
    const rootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = rootOverflow;
      if (flushTimer.current) window.clearTimeout(flushTimer.current);
      if (checkingTimer.current) window.clearTimeout(checkingTimer.current);
    };
  }, []);

  useEffect(() => {
    try {
      const parsed = JSON.parse(window.sessionStorage.getItem(browserDraftKey) ?? "null") as unknown;
      if (!isStoredRecovery(parsed)) return;
      drafts.current = { ...drafts.current, ...parsed.drafts };
      pendingDrafts.current = new Map(Object.entries(parsed.pending).map(([position, draft]) => [Number(position), draft]));
      pendingSession.current = parsed.pendingSession;
      revision.current = Math.max(parsed.revision, parsed.pendingSession?.revision ?? 0, ...Array.from(pendingDrafts.current.values()).map((draft) => draft.revision));
      presentationRef.current = {
        textScale: parsed.textScale,
        answerStatsVisible: parsed.answerStatsVisible,
        navigatorLayout: parsed.navigatorLayout,
      };
      const restoreFrame = window.requestAnimationFrame(() => {
        setTextScale(parsed.textScale);
        setAnswerStatsVisible(parsed.answerStatsVisible);
        setNavigatorLayout(parsed.navigatorLayout);
      });
      const cached = initialView.cachedItems.find((item) => item.position === parsed.currentPosition);
      if (cached) {
        const draft = drafts.current[String(parsed.currentPosition)] ?? cached;
        sessionRef.current = { ...sessionRef.current, currentPosition: parsed.currentPosition };
        window.requestAnimationFrame(() => setView((current) => ({ ...current, run: { ...current.run, currentPosition: parsed.currentPosition } })));
        selectedRef.current = draft.selectedChoiceId;
        confidenceRef.current = draft.confidence;
        elapsedRef.current = draft.activeTimeMs;
        window.requestAnimationFrame(() => {
          setSelected(draft.selectedChoiceId);
          setConfidence(draft.confidence);
          setElapsedMs(draft.activeTimeMs);
        });
      }
      if (pendingSession.current || pendingDrafts.current.size) scheduleFlush(80);
      return () => window.cancelAnimationFrame(restoreFrame);
    } catch {
      window.sessionStorage.removeItem(browserDraftKey);
    }
    // The recovery snapshot is read exactly once when this isolated workspace mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browserDraftKey]);

  useEffect(() => {
    if (feedbackOpen || exitOpen || view.run.status !== "active") return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      elapsedRef.current += 1000;
      setElapsedMs(elapsedRef.current);
      if (elapsedRef.current % 5000 === 0) queueCurrentDraft(sessionRef.current.currentPosition);
    }, 1000);
    return () => window.clearInterval(timer);
    // The interval reads current values from refs to avoid recreating it per answer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exitOpen, feedbackOpen, view.run.status]);

  useEffect(() => {
    prefetchPromptMedia([currentPosition - 1, currentPosition, currentPosition + 1]);
    // Only the current question and immediate neighbors receive signed media.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPosition]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (exitOpen || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (event.key === "Escape") return setMobileRailOpen(false);
      if (["1", "2", "3", "4"].includes(event.key) && question && !alreadyCommitted) {
        const choice = question.choices[Number(event.key) - 1];
        if (choice) {
          event.preventDefault();
          selectAnswer(choice.id);
        }
      } else if (event.key.toLowerCase() === "f" && question) {
        event.preventDefault();
        toggleFlag();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        navigateTo(currentPosition - 1);
      } else if (event.key === "ArrowRight" && !feedbackOpen) {
        event.preventDefault();
        navigateTo(currentPosition + 1);
      } else if (event.key === "Enter" && isStudy && !feedbackOpen && selectedRef.current && confidenceRef.current) {
        event.preventDefault();
        commitAnswer();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // Keyboard behavior intentionally follows the active in-memory problem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alreadyCommitted, currentPosition, exitOpen, feedbackOpen, isStudy, question]);

  if (!question) return null;

  return (
    <div className={`${styles.runnerPage} ${styles.isolatedRunner}`} data-text-scale={textScale}>
      <button type="button" className={styles.mobileRailToggle} onClick={() => setMobileRailOpen(true)} aria-label="Open session controls">☰</button>
      <button type="button" className={`${styles.railBackdrop} ${mobileRailOpen ? styles.railBackdropOpen : ""}`} onClick={() => setMobileRailOpen(false)} aria-label="Close session controls" />
      <aside className={`${styles.questionNavigator} ${mobileRailOpen ? styles.mobileRailOpen : ""}`} aria-label="Run controls and question navigator">
        <div className={styles.navigatorHeader}>
          <button type="button" className={styles.iconButton} onClick={() => setExitOpen(true)} aria-label="End or save session">×</button>
          <button type="button" className={styles.railGear} onClick={() => setSettingsOpen((open) => !open)} aria-expanded={settingsOpen} aria-controls="atlas-run-settings">⚙</button>
          <button type="button" className={styles.mobileRailClose} onClick={() => setMobileRailOpen(false)} aria-label="Close controls">×</button>
        </div>
        <p className={styles.navigatorCourse}>{view.courseTitle}</p>
        <h2>{view.bankTitle}</h2>
        <div className={styles.navigatorProgress}><i style={{ width: `${Math.round((answeredCount / view.run.questionCount) * 100)}%` }} /></div>
        <strong>{answeredCount}/{view.run.questionCount} answered · {syncState === "saving" ? "saving" : syncState === "queued" ? "saved locally" : "saved"}</strong>
        {answerStatsVisible ? <div className={styles.railStats} aria-label="Current answer statistics"><span>Unanswered <b>{navigatorCounts.unanswered}</b></span><span>Flagged <b>{navigatorCounts.flags}</b></span><span>Echoes <b>{navigatorCounts.echoes}</b></span><span>Pace <b>{averagePace ? duration(averagePace) : "—"}</b></span></div> : null}
        {settingsOpen ? <section id="atlas-run-settings" className={styles.railSection} aria-label="Practice settings">
          <p>Settings</p>
          <div className={styles.railModeButtons}>
            <button type="button" className={isStudy ? styles.navigatorFilterActive : ""} onClick={() => changeMode("study")}>Learn as you go</button>
            <button type="button" className={!isStudy ? styles.navigatorFilterActive : ""} onClick={() => changeMode("review")}>Review at end</button>
          </div>
          <label className={styles.railToggle}><span>Show timer <small>{view.run.visibleTimer ? duration(elapsedMs) : "Still recorded"}</small></span><input type="checkbox" checked={view.run.visibleTimer} onChange={(event) => changeVisibleTimer(event.target.checked)} /></label>
          <label className={styles.railToggle}><span>Answer stats <small>{answerStatsVisible ? "Visible" : "Hidden"}</small></span><input type="checkbox" checked={answerStatsVisible} onChange={(event) => changeAnswerStatsVisible(event.target.checked)} /></label>
          <div className={styles.textSizeControls}><span>Text size</span>{(["small", "default", "large"] as const).map((size) => <button key={size} type="button" className={textScale === size ? styles.navigatorFilterActive : ""} onClick={() => changeTextScale(size)}>{size === "small" ? "A−" : size === "large" ? "A+" : "A"}</button>)}</div>
          <div className={styles.navigatorLayoutToggle}><span>Navigator</span><button type="button" className={navigatorLayout === "list" ? styles.navigatorFilterActive : ""} onClick={() => changeNavigatorLayout("list")}>List</button><button type="button" className={navigatorLayout === "grid" ? styles.navigatorFilterActive : ""} onClick={() => changeNavigatorLayout("grid")}>Grid</button></div>
          <button type="button" className={manuallyFlagged ? styles.railFlagged : styles.railButton} onClick={toggleFlag}>{manuallyFlagged ? "Remove flag" : "Flag current question"}</button>
          <button type="button" className={styles.railButton} onClick={() => setShortcutsOpen((open) => !open)}>Keyboard shortcuts</button>
          {shortcutsOpen ? <p className={styles.shortcutHelp}>1–4 choose · Enter checks in Study · F flags · ←/→ moves · Esc closes the drawer.</p> : null}
        </section> : null}
        <div className={styles.navigatorFilters} aria-label="Question queues">
          {([ ["all", "All"], ["unanswered", "Unanswered"], ["echoes", "Echoes"], ["flags", "Flagged"] ] as const).map(([filter, label]) => <button key={filter} type="button" className={navigatorFilter === filter ? styles.navigatorFilterActive : ""} onClick={() => setNavigatorFilter(filter)}><span>{label}</span><b>{navigatorCounts[filter]}</b></button>)}
        </div>
        <label className={styles.navigatorSearch}><span className="sr-only">Search questions</span><input value={navigatorQuery} onChange={(event) => setNavigatorQuery(event.target.value)} placeholder="Find question…" /></label>
        <div className={styles.navigatorLegend}><span><i className={styles.legendAnswered} />Answered</span><span><i className={styles.legendEcho} />Echo</span><span><i className={styles.legendFlag} />Flagged</span></div>
        <div className={`${styles.navigatorList} ${navigatorLayout === "grid" ? styles.navigatorGrid : ""}`}>
          {visibleNavigator.length ? visibleNavigator.map((item) => <button key={item.position} type="button" className={item.position === currentPosition ? styles.currentQuestion : ""} onClick={() => navigateTo(item.position)} disabled={feedbackOpen && item.position !== currentPosition}><i className={item.committed ? styles.itemCommitted : item.answered ? styles.itemAnswered : ""} /><span>{navigatorLayout === "grid" ? item.position : `Question ${item.position}`}</span>{item.activeEcho ? <b className={styles.echoDot} title="Active Echo">E</b> : null}{item.flagged ? <b className={styles.flagDot} title="Flagged">F</b> : null}</button>) : <p className={styles.emptyQueue}>Nothing is in this queue yet.</p>}
        </div>
      </aside>

      <section className={styles.questionWorkspace}>
        <header className={styles.questionHeader}><div><span>Question {currentPosition} of {view.run.questionCount}</span><small>{isStudy ? "Learn as you go" : "Review at end"}{view.run.visibleTimer ? ` · ${duration(elapsedMs)}` : " · timer recorded"}</small></div></header>
        {message ? <div className={styles.notice} role="status">{message}</div> : null}
        <div className={styles.questionBody}>
          <div className={styles.questionTaxonomy}><span>{question.domain}</span><span>{question.topic}</span><span>{question.difficulty}</span></div>
          <h1>{question.stem}</h1>
          {question.assessmentImagePlacement === "prompt" && (promptImages.length ? promptImages.map((image, index) => <ClinicalImageViewer key={image.id} src={image.url!} alt={image.alt} label={`Question diagram ${index + 1}`} caption={image.caption} />) : question.imageAvailable && question.imageUrl ? <ClinicalImageViewer src={question.imageUrl} alt="Question diagram" label="Question diagram" caption={question.imageCaption} /> : null)}
          {question.imagePending ? <div className={styles.imageLoading}>Loading the registered image…</div> : null}
          {question.assessmentImagePlacement === "prompt" && question.hasSourceImage && !question.imagePending && !promptImages.length && !question.imageAvailable ? <div className={styles.imageFallback}>The registered question image is temporarily unavailable. You can flag this item and continue.</div> : null}

          {isStudy && !feedbackOpen ? <section className={styles.studyAids} aria-label="Optional Study aids"><WhiteHollandLop mood={navigatorCounts.echoes > 0 ? "concerned" : "steady"} className={styles.aidBunny} decorative /><div className={styles.studyAidCopy}><div><p>Companion tools</p><strong>{view.aids.remaining} of 3 Study charges remaining</strong></div><span>Each tool can be used once. Test Mode never uses aids.</span><div className={styles.aidButtons}>{([ ["prism_split", "Prism Split", "Hide two distractors"], ["atlas_chorus", "Atlas Chorus", "Anonymous signal"], ["rift_turn", "Rift Turn", "Move this problem later"] ] as const).map(([aidType, label, detail]) => { const used = view.aids.outcomes.some((outcome) => outcome.aidType === aidType); const unavailable = (aidType === "prism_split" && !prismAvailable) || (aidType === "rift_turn" && Boolean(selected)); return <button key={aidType} type="button" disabled={used || unavailable || view.aids.remaining === 0 || isPending} onClick={() => activateAid(aidType)}><strong>{used ? `${label} · used` : label}</strong><span>{unavailable && aidType === "prism_split" ? "Four choices required" : detail}</span></button>; })}</div>{view.aids.outcomes.filter((outcome) => outcome.position === currentPosition).map((outcome) => <div key={`${outcome.aidType}-${outcome.position}`} className={styles.aidOutcome} role="status"><strong>{outcome.aidType === "atlas_chorus" ? "Atlas Chorus" : outcome.aidType === "rift_turn" ? "Rift Turn" : "Prism Split"}</strong><span>{outcome.note}</span>{outcome.chorus ? outcome.chorus.available ? <div className={styles.chorusRows}>{outcome.chorus.choices.map((choice) => <span key={choice.choiceId}>{choice.choiceId.toUpperCase()} · {choice.percent}%</span>)}</div> : <small>Guild signal is still forming · {outcome.chorus.sampleSize}/{outcome.chorus.minimumSampleSize} distinct opted-in learners.</small> : null}</div>)}</div></section> : null}

          <div className={styles.answerChoices} role="radiogroup" aria-label="Answer choices">{question.choices.map((choice, index) => <button key={choice.id} type="button" role="radio" aria-checked={selected === choice.id} className={selected === choice.id ? styles.answerSelected : ""} disabled={alreadyCommitted || checking} onClick={() => selectAnswer(choice.id)}><span>{choice.id.toUpperCase()}</span><strong>{choice.text}</strong><small>{index + 1}</small></button>)}</div>
          <div className={styles.confidenceRow}><span>Confidence</span>{([1, 2, 3] as LivingAtlasConfidence[]).map((value) => <button key={value} type="button" className={confidence === value ? styles.selectedControl : ""} disabled={alreadyCommitted || checking} onClick={() => selectConfidence(value)}>{confidenceLabel(value)}</button>)}</div>
          {feedback ? <section className={`${styles.feedbackPanel} ${feedback.correct ? styles.feedbackCorrect : styles.feedbackEcho}`}><div className={styles.feedbackCopy}><p>{feedback.correct ? "Correct" : "Echo created"}</p><h2><span>Correct answer</span>{feedback.correctChoiceId.toUpperCase()} · {correctChoiceText}</h2><div className={styles.feedbackLesson}><strong>Why it works</strong><span>{feedback.teachingFeedback}</span></div><div className={styles.feedbackLesson}><strong>{feedback.correct ? "Why your choice fits" : "Why your choice misses"}</strong><span>{feedback.choiceFeedback[feedback.selectedChoiceId]}</span></div></div>{feedbackImages.length ? feedbackImages.map((image, index) => <ClinicalImageViewer key={image.id} src={image.url!} alt={image.alt} label={`Feedback diagram ${index + 1}`} caption={image.caption} className={styles.feedbackImage} />) : feedback.imageAvailable && feedback.imageUrl ? <ClinicalImageViewer src={feedback.imageUrl} alt="Source diagram shown during answer review" label="Feedback diagram" caption={feedback.imageCaption} className={styles.feedbackImage} /> : null}<button type="button" className={styles.primaryButton} onClick={() => currentPosition === view.run.questionCount ? setExitOpen(true) : navigateTo(currentPosition + 1, true)}>{currentPosition === view.run.questionCount ? "Finish session" : "Next question"}</button></section> : <footer className={styles.questionFooter}><button type="button" className={styles.secondaryButton} disabled={currentPosition === 1 || checking} onClick={() => navigateTo(currentPosition - 1)}>Previous</button>{isStudy ? <button type="button" className={styles.primaryButton} disabled={!selected || !confidence || checking} onClick={commitAnswer}>{checking ? "Checking…" : "Check answer"}</button> : currentPosition === view.run.questionCount ? <button type="button" className={styles.primaryButton} onClick={() => setExitOpen(true)}>Finish and review</button> : <button type="button" className={styles.primaryButton} onClick={() => navigateTo(currentPosition + 1)}>Next</button>}</footer>}
        </div>
      </section>

      {exitOpen ? <div className={styles.modalBackdrop} role="presentation"><section className={styles.exitDialog} role="dialog" aria-modal="true" aria-labelledby="exit-title"><div className={styles.exitIcon}>✓</div><h2 id="exit-title">What would you like to do?</h2><p>Your answers, flags, confidence, frozen choice order, and current position are {syncState === "saved" ? "saved" : "stored on this device and syncing"}.</p><div className={styles.exitSummary}><div><span>Answered</span><strong>{answeredCount} of {view.run.questionCount}</strong></div><div><span>Current question</span><strong>{duration(elapsedMs)}</strong></div><div><span>Echoes</span><strong>{navigatorCounts.echoes}</strong></div><div><span>Flagged</span><strong>{navigatorCounts.flags}</strong></div></div>{message ? <div className={styles.notice}>{message}</div> : null}<div className={styles.exitActions}><button type="button" className={styles.secondaryButton} disabled={isPending} onClick={() => setExitOpen(false)}>Return to studying</button><button type="button" className={styles.secondaryButton} disabled={isPending} onClick={saveAndExit}>Save &amp; exit for later</button><button type="button" className={styles.primaryButton} disabled={isPending} onClick={finish}>{answeredCount ? "Finish now · View results" : "Discard empty session"}</button></div></section></div> : null}
    </div>
  );
}
