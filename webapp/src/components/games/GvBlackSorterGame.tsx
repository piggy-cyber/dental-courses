"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { saveGameRound } from "@/app/(games)/games/actions";
import gvBlackCatalogJson from "@/data/games/gv-black-data.json";
import type {
  GvBlackCase,
  GvBlackCatalog,
  GvBlackClassId,
} from "@/lib/games/gv-black-types";
import type { GameProgress, GameRoundResult, MasteryMap } from "@/lib/games/types";
import { GvBlackDiagram } from "./GvBlackDiagram";
import styles from "./GvBlackSorter.module.css";

const catalog = gvBlackCatalogJson as GvBlackCatalog;
const PENDING_ROUND_KEY = "fourth-canal:gv-black-sorter:pending-round";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ROUND_SIZE = 12;
const CHALLENGE_SECONDS = 60;

type Mode = "study" | "challenge";
type Phase = "idle" | "playing" | "review";

type ReviewAnswer = {
  caseId: string;
  prompt: string;
  submittedClass: GvBlackClassId;
  correctClass: GvBlackClassId;
  correct: boolean;
  explanation: string;
};

type RoundState = {
  deck: string[];
  questionIndex: number;
  score: number;
  streak: number;
  bestStreak: number;
  correct: number;
  attempts: number;
  masteryDelta: MasteryMap;
  review: ReviewAnswer[];
  questionStartedAt: number;
};

type Feedback = {
  correct: boolean;
  correctClass: GvBlackClassId;
  explanation: string;
  gainedScore: number;
};

type GvBlackSorterGameProps = {
  initialProgress: GameProgress | null;
};

function emptyRound(): RoundState {
  return {
    deck: [],
    questionIndex: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    correct: 0,
    attempts: 0,
    masteryDelta: {},
    review: [],
    questionStartedAt: Date.now(),
  };
}

function shuffled<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex] as T, result[index] as T];
  }
  return result;
}

function createBalancedDeck(mode: Mode) {
  const eligibleCases = catalog.cases.filter(
    (item) =>
      item.modes.includes(mode) &&
      (mode !== "challenge" || item.evidenceStatus === "course-verified"),
  );

  const deck = catalog.classes.flatMap((classification) =>
    shuffled(eligibleCases.filter((item) => item.classId === classification.id))
      .slice(0, 2)
      .map((item) => item.id),
  );
  return shuffled(deck).slice(0, ROUND_SIZE);
}

function accuracy(correct: number, attempts: number) {
  return attempts ? Math.round((correct / attempts) * 100) : 0;
}

function weakAreasFromMastery(mastery: MasteryMap) {
  return catalog.classes
    .map((classification) => {
      const entry = mastery[classification.masteryKey] ?? { correct: 0, attempts: 0 };
      return {
        id: classification.id,
        attempts: entry.attempts,
        accuracy: accuracy(entry.correct, entry.attempts),
      };
    })
    .filter((item) => item.attempts > 0)
    .sort((left, right) => left.accuracy - right.accuracy || right.attempts - left.attempts)
    .slice(0, 2);
}

function storePendingRound(round: GameRoundResult | null) {
  try {
    if (round) sessionStorage.setItem(PENDING_ROUND_KEY, JSON.stringify(round));
    else sessionStorage.removeItem(PENDING_ROUND_KEY);
  } catch {
    // The server save remains available when browser storage is unavailable.
  }
}

function isPendingRound(value: unknown): value is GameRoundResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const round = value as Partial<GameRoundResult>;
  if (
    round.gameId !== "gv-black-sorter" ||
    typeof round.roundId !== "string" ||
    !UUID_PATTERN.test(round.roundId) ||
    !Number.isInteger(round.score) ||
    Number(round.score) < 0 ||
    !Number.isInteger(round.correct) ||
    Number(round.correct) < 0 ||
    !Number.isInteger(round.attempts) ||
    Number(round.attempts) < 1 ||
    Number(round.correct) > Number(round.attempts) ||
    Number(round.score) > Number(round.correct) * 260 ||
    !Number.isInteger(round.bestStreak) ||
    Number(round.bestStreak) < 0 ||
    Number(round.bestStreak) > Number(round.correct) ||
    !round.masteryDelta ||
    typeof round.masteryDelta !== "object" ||
    Array.isArray(round.masteryDelta)
  ) {
    return false;
  }

  const validKeys = new Set(catalog.classes.map((classification) => classification.masteryKey));
  let correct = 0;
  let attempts = 0;
  for (const [key, entry] of Object.entries(round.masteryDelta)) {
    if (
      !validKeys.has(key) ||
      !entry ||
      typeof entry !== "object" ||
      !Number.isInteger(entry.correct) ||
      !Number.isInteger(entry.attempts) ||
      entry.correct < 0 ||
      entry.attempts < 1 ||
      entry.correct > entry.attempts
    ) {
      return false;
    }
    correct += entry.correct;
    attempts += entry.attempts;
  }
  return correct === round.correct && attempts === round.attempts;
}

function findCase(caseId: string | undefined) {
  return catalog.cases.find((item) => item.id === caseId) ?? null;
}

export function GvBlackSorterGame({ initialProgress }: GvBlackSorterGameProps) {
  const [mode, setMode] = useState<Mode>("study");
  const [phase, setPhase] = useState<Phase>("idle");
  const [round, setRound] = useState<RoundState>(emptyRound);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [timeLeft, setTimeLeft] = useState(CHALLENGE_SECONDS);
  const [finishReason, setFinishReason] = useState("");
  const [progress, setProgress] = useState<GameProgress | null>(initialProgress);
  const [pendingRound, setPendingRound] = useState<GameRoundResult | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const roundRef = useRef<RoundState>(round);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deadlineRef = useRef<number | null>(null);
  const transitionRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishingRef = useRef(false);

  const currentCase = findCase(round.deck[round.questionIndex]);
  const savedAccuracy = progress
    ? accuracy(progress.totalCorrect, progress.totalAttempts)
    : null;
  const savedWeakAreas = useMemo(
    () => weakAreasFromMastery(progress?.mastery ?? {}),
    [progress],
  );
  const roundWeakAreas = useMemo(
    () => weakAreasFromMastery(round.masteryDelta),
    [round.masteryDelta],
  );
  const missedAnswers = useMemo(
    () => round.review.filter((answer) => !answer.correct),
    [round.review],
  );

  const persistRound = useCallback(async (payload: GameRoundResult) => {
    storePendingRound(payload);
    setPendingRound(payload);
    setSaveError(null);
    setSaving(true);
    try {
      const result = await saveGameRound(payload);
      if (result.ok) {
        setProgress(result.progress);
        setPendingRound(null);
        storePendingRound(null);
      } else {
        setSaveError(result.error);
      }
    } catch {
      setSaveError("Progress could not be saved yet. Your round is ready to retry.");
    } finally {
      setSaving(false);
    }
  }, []);

  const finishRound = useCallback(
    (snapshot: RoundState, reason: string) => {
      if (finishingRef.current) return;
      finishingRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
      if (transitionRef.current) clearTimeout(transitionRef.current);
      deadlineRef.current = null;
      roundRef.current = snapshot;
      setRound(snapshot);
      setPhase("review");
      setFinishReason(reason);
      setFeedback(null);

      if (snapshot.attempts > 0) {
        void persistRound({
          roundId: crypto.randomUUID(),
          gameId: "gv-black-sorter",
          score: snapshot.score,
          bestStreak: snapshot.bestStreak,
          correct: snapshot.correct,
          attempts: snapshot.attempts,
          masteryDelta: snapshot.masteryDelta,
        });
      }
    },
    [persistRound],
  );

  useEffect(() => {
    let restoreTimer: ReturnType<typeof setTimeout> | null = null;
    try {
      const raw = sessionStorage.getItem(PENDING_ROUND_KEY);
      if (!raw) return;
      const candidate: unknown = JSON.parse(raw);
      if (isPendingRound(candidate)) {
        restoreTimer = setTimeout(() => setPendingRound(candidate), 0);
      }
    } catch {
      storePendingRound(null);
    }
    return () => {
      if (restoreTimer) clearTimeout(restoreTimer);
    };
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (transitionRef.current) clearTimeout(transitionRef.current);
    },
    [],
  );

  function advanceQuestion(snapshot = roundRef.current) {
    if (finishingRef.current) return;
    if (snapshot.questionIndex + 1 >= snapshot.deck.length) {
      finishRound(snapshot, "Deck complete");
      return;
    }

    const advancedRound = {
      ...snapshot,
      questionIndex: snapshot.questionIndex + 1,
      questionStartedAt: Date.now(),
    };
    roundRef.current = advancedRound;
    setRound(advancedRound);
    setFeedback(null);
  }

  function answerClass(submittedClass: GvBlackClassId) {
    const snapshot = roundRef.current;
    const question = findCase(snapshot.deck[snapshot.questionIndex]);
    if (!question || phase !== "playing" || feedback || finishingRef.current) return;

    const correct = submittedClass === question.classId;
    const nextStreak = correct ? snapshot.streak + 1 : 0;
    const elapsedTenths = Math.floor((Date.now() - snapshot.questionStartedAt) / 100);
    const speedBonus =
      mode === "challenge" && correct ? Math.max(0, 80 - elapsedTenths * 2) : 0;
    const streakBonus = correct ? Math.min(80, nextStreak * 10) : 0;
    const gainedScore = correct ? 100 + speedBonus + streakBonus : 0;
    const classification = catalog.classes.find((item) => item.id === question.classId);
    if (!classification) return;
    const previousMastery = snapshot.masteryDelta[classification.masteryKey] ?? {
      correct: 0,
      attempts: 0,
    };
    const nextRound: RoundState = {
      ...snapshot,
      score: snapshot.score + gainedScore,
      streak: nextStreak,
      bestStreak: Math.max(snapshot.bestStreak, nextStreak),
      correct: snapshot.correct + (correct ? 1 : 0),
      attempts: snapshot.attempts + 1,
      masteryDelta: {
        ...snapshot.masteryDelta,
        [classification.masteryKey]: {
          correct: previousMastery.correct + (correct ? 1 : 0),
          attempts: previousMastery.attempts + 1,
        },
      },
      review: [
        ...snapshot.review,
        {
          caseId: question.id,
          prompt: question.prompt,
          submittedClass,
          correctClass: question.classId,
          correct,
          explanation: question.explanation,
        },
      ],
    };
    roundRef.current = nextRound;
    setRound(nextRound);
    setFeedback({
      correct,
      correctClass: question.classId,
      explanation: question.explanation,
      gainedScore,
    });

    if (mode === "challenge") {
      transitionRef.current = setTimeout(() => advanceQuestion(nextRound), 1050);
    }
  }

  useEffect(() => {
    if (phase !== "playing") return;
    function handleKeyDown(event: KeyboardEvent) {
      if (!feedback && /^[1-6]$/.test(event.key)) {
        const classification = catalog.classes[Number(event.key) - 1];
        if (classification) answerClass(classification.id);
      } else if (mode === "study" && feedback && event.key === "Enter") {
        advanceQuestion();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  function chooseMode(nextMode: Mode) {
    if (phase === "playing") return;
    setMode(nextMode);
    setPhase("idle");
    setFinishReason("");
    setFeedback(null);
  }

  function startRound() {
    if (pendingRound) return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (transitionRef.current) clearTimeout(transitionRef.current);
    finishingRef.current = false;
    const nextRound = {
      ...emptyRound(),
      deck: createBalancedDeck(mode),
    };
    roundRef.current = nextRound;
    setRound(nextRound);
    setPhase("playing");
    setTimeLeft(CHALLENGE_SECONDS);
    setFeedback(null);
    setFinishReason("");
    deadlineRef.current = null;

    if (mode === "challenge") {
      deadlineRef.current = Date.now() + CHALLENGE_SECONDS * 1000;
      timerRef.current = setInterval(() => {
        const deadline = deadlineRef.current;
        if (!deadline) return;
        const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining === 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          deadlineRef.current = null;
          window.setTimeout(() => finishRound(roundRef.current, "Time expired"), 0);
        }
      }, 250);
    }
  }

  function discardPendingRound() {
    if (saving) return;
    setPendingRound(null);
    setSaveError(null);
    storePendingRound(null);
  }

  return (
    <main id="game-content" className={styles.page}>
      <header className={styles.hero}>
        <div>
          <Link href="/games" className={styles.backLink}>
            <span aria-hidden="true">←</span> Study arcade
          </Link>
          <p className={styles.kicker}>Restorative classification lab · Game module</p>
          <h1>G.V. Black Sorter</h1>
          <p className={styles.heroCopy}>
            Read the location. Protect the boundary. Sort Classes I–VI at clinical speed.
          </p>
        </div>
        <div className={styles.progressCluster} aria-label="Saved G.V. Black Sorter progress">
          <span><small>Best score</small><strong>{progress?.bestScore.toLocaleString() ?? "—"}</strong></span>
          <span><small>Accuracy</small><strong>{savedAccuracy === null ? "—" : `${savedAccuracy}%`}</strong></span>
          <span>
            <small>Weak areas</small>
            <strong>{savedWeakAreas.length ? savedWeakAreas.map((item) => item.id).join(" + ") : "—"}</strong>
          </span>
        </div>
      </header>

      {pendingRound ? (
        <aside className={styles.saveNotice} role="status">
          <div>
            <strong>{saving ? "Syncing your round…" : "A completed round is waiting to sync."}</strong>
            <p>{saveError ?? "Your result is safely held in this browser."}</p>
          </div>
          <div className={styles.saveActions}>
            <button type="button" disabled={saving} onClick={() => void persistRound(pendingRound)}>
              {saving ? "Saving…" : "Retry save"}
            </button>
            <button type="button" disabled={saving} onClick={discardPendingRound}>Discard</button>
          </div>
        </aside>
      ) : null}

      <section className={styles.gameFrame} aria-labelledby="mode-heading">
        <div className={styles.controlRail}>
          <div>
            <p className={styles.controlLabel} id="mode-heading">Mode</p>
            <div className={styles.modeTabs} role="group" aria-label="G.V. Black Sorter modes">
              <button
                type="button"
                aria-pressed={mode === "study"}
                className={mode === "study" ? styles.activeMode : ""}
                disabled={phase === "playing"}
                onClick={() => chooseMode("study")}
              >
                <small>Untimed · explanations</small>
                <span>Study</span>
              </button>
              <button
                type="button"
                aria-pressed={mode === "challenge"}
                className={mode === "challenge" ? styles.activeMode : ""}
                disabled={phase === "playing"}
                onClick={() => chooseMode("challenge")}
              >
                <small>60 sec · rapid fire</small>
                <span>Challenge</span>
              </button>
            </div>
          </div>
          <div className={styles.evidenceBadge}>
            <span aria-hidden="true">●</span>
            18 course-verified cases
          </div>
        </div>

        {phase === "idle" ? (
          <>
            <div className={styles.modeIntro}>
              <div>
                <p>{mode === "study" ? "Build the boundary map" : "Race the boundary map"}</p>
                <h2>{mode === "study" ? "Study every answer" : "Sort 12 cases in 60 seconds"}</h2>
                <span>
                  {mode === "study"
                    ? "Answer at your pace, then read the class-defining explanation before advancing."
                    : "Use keys 1–6 or tap a class. Correct streaks and fast decisions raise your score."}
                </span>
              </div>
              <button type="button" className={styles.startButton} disabled={Boolean(pendingRound)} onClick={startRound}>
                Start {mode === "study" ? "study set" : "challenge"} <span aria-hidden="true">→</span>
              </button>
            </div>
            <section className={styles.classAtlas} aria-labelledby="class-atlas-heading">
              <div className={styles.sectionHeading}>
                <p>Course-verified boundary map</p>
                <h2 id="class-atlas-heading">Classes I–VI</h2>
              </div>
              <div className={styles.atlasGrid}>
                {catalog.classes.map((classification) => (
                  <article key={classification.id}>
                    <span>{classification.id}</span>
                    <div>
                      <h3>{classification.title}</h3>
                      <p>{classification.rule}</p>
                      <small>{classification.contrast}</small>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : null}

        {phase === "playing" && currentCase ? (
          <>
            <div className={styles.promptBar}>
              <div className={styles.promptIndex}>
                <span>{String(round.questionIndex + 1).padStart(2, "0")}</span>
                <small>of {round.deck.length}</small>
              </div>
              <div className={styles.liveStats} aria-label="Current round stats">
                {mode === "challenge" ? <span><small>Time</small><strong>{timeLeft}</strong></span> : null}
                <span><small>Score</small><strong>{round.score.toLocaleString()}</strong></span>
                <span><small>Streak</small><strong>×{round.streak}</strong></span>
                <span><small>Attempts</small><strong>{round.attempts}</strong></span>
                <span><small>Accuracy</small><strong>{round.attempts ? `${accuracy(round.correct, round.attempts)}%` : "—"}</strong></span>
              </div>
            </div>

            <div className={styles.scenarioGrid}>
              <GvBlackDiagram diagram={currentCase.diagram} />
              <section className={styles.scenarioCopy} aria-labelledby="scenario-heading">
                <div>
                  <p>Clinical location</p>
                  <span>{currentCase.clinicalCue}</span>
                </div>
                <h2 id="scenario-heading">{currentCase.prompt}</h2>
                <p className={styles.sortPrompt}>Which G.V. Black class fits this lesion location?</p>
                <div className={styles.classChoices} role="group" aria-label="Choose a G.V. Black class">
                  {catalog.classes.map((classification, index) => (
                    <button
                      key={classification.id}
                      type="button"
                      disabled={Boolean(feedback)}
                      onClick={() => answerClass(classification.id)}
                    >
                      <span>{index + 1}</span>
                      <strong>{classification.title}</strong>
                      <small>{classification.rule}</small>
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <div
              className={`${styles.feedback} ${feedback ? (feedback.correct ? styles.feedbackCorrect : styles.feedbackWrong) : ""}`}
              aria-live="assertive"
              aria-atomic="true"
            >
              {feedback ? (
                <>
                  <div>
                    <span>{feedback.correct ? "Correct" : `Correct answer · Class ${feedback.correctClass}`}</span>
                    <strong>{feedback.correct ? `+${feedback.gainedScore}` : "Boundary check"}</strong>
                  </div>
                  <p>{feedback.explanation}</p>
                  {mode === "study" ? (
                    <button type="button" onClick={() => advanceQuestion()}>
                      Next case <span aria-hidden="true">→</span>
                    </button>
                  ) : <small>Advancing…</small>}
                </>
              ) : <span className={styles.keyboardHint}>Press 1–6 to sort with the keyboard.</span>}
            </div>
          </>
        ) : null}

        {phase === "review" ? (
          <section className={styles.reviewPanel}>
            <div className={styles.reviewSummary}>
              <div>
                <p>{finishReason}</p>
                <h2>{round.correct} of {round.attempts} correct</h2>
                <span>
                  Score {round.score.toLocaleString()} · accuracy {accuracy(round.correct, round.attempts)}% · best streak ×{round.bestStreak}
                </span>
              </div>
              <button type="button" className={styles.startButton} disabled={Boolean(pendingRound)} onClick={startRound}>
                Play again
              </button>
            </div>

            <div className={styles.weakAreaPanel}>
              <span>Weak areas</span>
              <strong>
                {roundWeakAreas.length
                  ? roundWeakAreas.map((item) => `Class ${item.id} · ${item.accuracy}%`).join("  /  ")
                  : "No attempts to rank yet"}
              </strong>
              <p>Use the lowest-accuracy class first on your next Study set.</p>
            </div>

            <div className={styles.missedHeader}>
              <div>
                <p>Missed-case review</p>
                <h3>{missedAnswers.length ? `${missedAnswers.length} boundaries to revisit` : "Clean sweep"}</h3>
              </div>
              <span>{missedAnswers.length} missed</span>
            </div>

            {missedAnswers.length ? (
              <ol className={styles.reviewList}>
                {missedAnswers.map((answer, index) => {
                  const item = findCase(answer.caseId) as GvBlackCase;
                  return (
                    <li key={answer.caseId}>
                      <GvBlackDiagram diagram={item.diagram} compact />
                      <div>
                        <span>{String(index + 1).padStart(2, "0")} · {item.clinicalCue}</span>
                        <p>{answer.prompt}</p>
                        <small>{answer.explanation}</small>
                      </div>
                      <strong>Class {answer.submittedClass} → {answer.correctClass}</strong>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className={styles.perfectReview}>
                <span aria-hidden="true">✓</span>
                <div><strong>Every boundary held.</strong><p>No missed cases in this round.</p></div>
              </div>
            )}
          </section>
        ) : null}
      </section>

      <footer className={styles.gameFooter}>
        <p>Keyboard: press 1–6 to choose a class. In Study mode, press Enter after feedback to continue.</p>
        <p>
          Course source: REHE 162, <em>Intro to BP Restorative I 2026</em>, pages 20–28. All lesion diagrams are original redraws of the documented locations; no course slide artwork is reproduced.
        </p>
      </footer>
    </main>
  );
}
