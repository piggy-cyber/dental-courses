"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toothComparisonJson from "@/data/games/tooth-comparison-data.json";
import { saveGameRound } from "@/app/(games)/games/actions";
import type { GameProgress, GameRoundResult, MasteryMap } from "@/lib/games/types";
import {
  getToothComparisonMasteryKey,
  parseToothComparisonMasteryKey,
  type ToothComparisonDataset,
  type ToothComparisonFeatureType,
  type ToothComparisonQuestion,
} from "@/lib/games/tooth-comparison-types";
import { ToothComparisonVisual } from "./ToothComparisonVisual";
import styles from "./ToothComparisonDuel.module.css";

const dataset = toothComparisonJson as ToothComparisonDataset;
const QUESTIONS = dataset.questions;
const CHALLENGE_LENGTH = 10;
const CHALLENGE_SECONDS_PER_QUESTION = 20;
const PENDING_ROUND_KEY = "fourth-canal:tooth-comparison-duel:pending-round";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_MASTERY_KEYS = new Set(QUESTIONS.map(getToothComparisonMasteryKey));

const FEATURE_LABELS: Record<ToothComparisonFeatureType, string> = {
  "crown-shape": "Crown shape",
  symmetry: "Symmetry",
  "lingual-anatomy": "Lingual anatomy",
  "root-pattern": "Root depression / pattern",
  "ridge-groove": "Ridge / groove clue",
  "arch-clue": "Arch clue",
  "clinical-identification": "Clinical identification",
};

type Mode = "study" | "challenge";
type Phase = "ready" | "playing" | "review";

type RoundStats = {
  score: number;
  streak: number;
  bestStreak: number;
  correct: number;
  attempts: number;
  masteryDelta: MasteryMap;
};

type ReviewAnswer = {
  questionId: string;
  prompt: string;
  pairLabel: string;
  family: string;
  featureType: ToothComparisonFeatureType;
  submittedChoice: "A" | "B" | null;
  correctChoice: "A" | "B";
  submittedLabel: string;
  correctLabel: string;
  correct: boolean;
  explanation: string;
};

type ToothComparisonDuelProps = {
  initialProgress: GameProgress | null;
};

function emptyStats(): RoundStats {
  return {
    score: 0,
    streak: 0,
    bestStreak: 0,
    correct: 0,
    attempts: 0,
    masteryDelta: {},
  };
}

function pairKey(question: ToothComparisonQuestion) {
  return `${question.toothA.id}::${question.toothB.id}`;
}

function pairLabel(question: ToothComparisonQuestion) {
  return `${question.toothA.label} vs ${question.toothB.label}`;
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target] as T, copy[index] as T];
  }
  return copy;
}

function accuracy(correct: number, attempts: number) {
  if (!attempts) return 0;
  return Math.round((correct / attempts) * 100);
}

function currentTimeMs() {
  return Date.now();
}

function storePendingRound(round: GameRoundResult | null) {
  try {
    if (round) sessionStorage.setItem(PENDING_ROUND_KEY, JSON.stringify(round));
    else sessionStorage.removeItem(PENDING_ROUND_KEY);
  } catch {
    // Account saving can still work when browser storage is unavailable.
  }
}

function isPendingRound(value: unknown): value is GameRoundResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const round = value as Partial<GameRoundResult>;
  if (
    round.gameId !== "tooth-comparison-duel" ||
    typeof round.roundId !== "string" ||
    !UUID_PATTERN.test(round.roundId) ||
    !Number.isInteger(round.score) ||
    Number(round.score) < 0 ||
    !Number.isInteger(round.correct) ||
    Number(round.correct) < 0 ||
    !Number.isInteger(round.attempts) ||
    Number(round.attempts) < Number(round.correct) ||
    !Number.isInteger(round.bestStreak) ||
    Number(round.bestStreak) < 0 ||
    Number(round.bestStreak) > Number(round.correct) ||
    !round.masteryDelta ||
    typeof round.masteryDelta !== "object" ||
    Array.isArray(round.masteryDelta)
  ) {
    return false;
  }

  let correct = 0;
  let attempts = 0;
  for (const [key, entry] of Object.entries(round.masteryDelta)) {
    if (
      !VALID_MASTERY_KEYS.has(key) ||
      !entry ||
      typeof entry !== "object" ||
      !Number.isInteger(entry.correct) ||
      !Number.isInteger(entry.attempts) ||
      entry.correct < 0 ||
      entry.attempts < entry.correct
    ) {
      return false;
    }
    correct += entry.correct;
    attempts += entry.attempts;
  }
  return correct === round.correct && attempts === round.attempts;
}

export function ToothComparisonDuel({ initialProgress }: ToothComparisonDuelProps) {
  const pairOptions = useMemo(() => {
    const seen = new Set<string>();
    return QUESTIONS.flatMap((question) => {
      const key = pairKey(question);
      if (seen.has(key)) return [];
      seen.add(key);
      return [{ key, label: pairLabel(question), family: question.toothA.family }];
    });
  }, []);
  const [mode, setMode] = useState<Mode>("study");
  const [phase, setPhase] = useState<Phase>("ready");
  const [studyPair, setStudyPair] = useState(pairOptions[0]?.key ?? "");
  const [sequence, setSequence] = useState<ToothComparisonQuestion[]>(QUESTIONS.slice(0, 2));
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<"A" | "B" | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [deadlineMs, setDeadlineMs] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(CHALLENGE_SECONDS_PER_QUESTION);
  const [stats, setStats] = useState<RoundStats>(emptyStats);
  const [review, setReview] = useState<ReviewAnswer[]>([]);
  const [showAllReview, setShowAllReview] = useState(false);
  const [progress, setProgress] = useState<GameProgress | null>(initialProgress);
  const [pendingRound, setPendingRound] = useState<GameRoundResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const resolvedQuestionRef = useRef<string | null>(null);

  const currentQuestion = sequence[questionIndex] ?? null;
  const answerResolved = selectedChoice !== null || timedOut;

  const resolveChallengeAnswer = useCallback((choice: "A" | "B" | null) => {
    if (mode !== "challenge" || phase !== "playing" || !currentQuestion) return;

    const questionToken = `${questionIndex}:${currentQuestion.id}`;
    if (resolvedQuestionRef.current === questionToken) return;
    resolvedQuestionRef.current = questionToken;

    const correct = choice === currentQuestion.correctChoice;
    const masteryKey = getToothComparisonMasteryKey(currentQuestion);
    const choiceLabel = choice
      ? currentQuestion.choices.find((item) => item.id === choice)?.label ?? choice
      : "No answer — time expired";
    const correctLabel =
      currentQuestion.choices.find((item) => item.id === currentQuestion.correctChoice)?.label ??
      currentQuestion.correctChoice;

    setSelectedChoice(choice);
    setTimedOut(choice === null);
    setDeadlineMs(null);
    setStats((previous) => {
      const nextStreak = correct ? previous.streak + 1 : 0;
      const existingMastery = previous.masteryDelta[masteryKey] ?? { correct: 0, attempts: 0 };
      return {
        score: previous.score + (correct ? 100 + previous.streak * 20 : 0),
        streak: nextStreak,
        bestStreak: Math.max(previous.bestStreak, nextStreak),
        correct: previous.correct + (correct ? 1 : 0),
        attempts: previous.attempts + 1,
        masteryDelta: {
          ...previous.masteryDelta,
          [masteryKey]: {
            correct: existingMastery.correct + (correct ? 1 : 0),
            attempts: existingMastery.attempts + 1,
          },
        },
      };
    });
    setReview((previous) => [
      ...previous,
      {
        questionId: currentQuestion.id,
        prompt: currentQuestion.prompt,
        pairLabel: pairLabel(currentQuestion),
        family: currentQuestion.toothA.family,
        featureType: currentQuestion.featureType,
        submittedChoice: choice,
        correctChoice: currentQuestion.correctChoice,
        submittedLabel: choiceLabel,
        correctLabel,
        correct,
        explanation: currentQuestion.explanation,
      },
    ]);
  }, [currentQuestion, mode, phase, questionIndex]);

  useEffect(() => {
    if (
      mode !== "challenge" ||
      phase !== "playing" ||
      !currentQuestion ||
      answerResolved ||
      deadlineMs === null
    ) {
      return undefined;
    }

    const updateTimer = () => {
      const millisecondsLeft = deadlineMs - Date.now();
      setSecondsLeft(Math.max(0, Math.ceil(millisecondsLeft / 1000)));
      if (millisecondsLeft <= 0) resolveChallengeAnswer(null);
    };

    updateTimer();
    const interval = window.setInterval(updateTimer, 250);
    const timeout = window.setTimeout(
      updateTimer,
      Math.max(0, deadlineMs - Date.now()) + 25,
    );
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [answerResolved, currentQuestion, deadlineMs, mode, phase, resolveChallengeAnswer]);

  const persistRound = useCallback(async (payload: GameRoundResult) => {
    storePendingRound(payload);
    setPendingRound(payload);
    setSaving(true);
    setSaveError(null);
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
      setSaveError("Progress could not be saved yet. This round is ready to retry.");
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    let retryTimer: number | null = null;
    try {
      const raw = sessionStorage.getItem(PENDING_ROUND_KEY);
      if (!raw) return undefined;
      const candidate = JSON.parse(raw) as unknown;
      if (!isPendingRound(candidate)) {
        storePendingRound(null);
        return undefined;
      }
      retryTimer = window.setTimeout(() => {
        void persistRound(candidate);
      }, 0);
    } catch {
      storePendingRound(null);
    }

    return () => {
      if (retryTimer !== null) window.clearTimeout(retryTimer);
    };
  }, [persistRound]);

  const savedWeakAreas = useMemo(() => {
    if (!progress) return [];
    return Object.entries(progress.mastery)
      .map(([key, entry]) => ({ parsed: parseToothComparisonMasteryKey(key), entry }))
      .filter(({ parsed, entry }) => parsed && entry.attempts >= 2 && entry.correct / entry.attempts < 0.75)
      .sort((a, b) => a.entry.correct / a.entry.attempts - b.entry.correct / b.entry.attempts)
      .slice(0, 3);
  }, [progress]);

  const roundWeakAreas = useMemo(() => {
    const groups = new Map<string, { family: string; featureType: ToothComparisonFeatureType; missed: number }>();
    for (const answer of review) {
      if (answer.correct) continue;
      const key = `${answer.family}|${answer.featureType}`;
      const current = groups.get(key);
      groups.set(key, {
        family: answer.family,
        featureType: answer.featureType,
        missed: (current?.missed ?? 0) + 1,
      });
    }
    return [...groups.values()].sort((a, b) => b.missed - a.missed);
  }, [review]);

  const missedReview = useMemo(() => review.filter((answer) => !answer.correct), [review]);
  const visibleReview = showAllReview ? review : missedReview;

  function armChallengeTimer() {
    resolvedQuestionRef.current = null;
    setTimedOut(false);
    setSecondsLeft(CHALLENGE_SECONDS_PER_QUESTION);
    setDeadlineMs(Date.now() + CHALLENGE_SECONDS_PER_QUESTION * 1000);
  }

  function startStudy() {
    const nextSequence = QUESTIONS.filter((question) => pairKey(question) === studyPair);
    setMode("study");
    setSequence(nextSequence);
    setQuestionIndex(0);
    setSelectedChoice(null);
    setTimedOut(false);
    setDeadlineMs(null);
    setStats(emptyStats());
    setReview([]);
    setShowAllReview(false);
    resolvedQuestionRef.current = null;
    setPhase("playing");
  }

  function startChallenge() {
    const verified = QUESTIONS.filter((question) => question.evidenceStatus === "course-verified");
    setMode("challenge");
    setSequence(shuffle(verified).slice(0, Math.min(CHALLENGE_LENGTH, verified.length)));
    setQuestionIndex(0);
    setSelectedChoice(null);
    armChallengeTimer();
    setStats(emptyStats());
    setReview([]);
    setShowAllReview(false);
    setPhase("playing");
  }

  function handleChoice(choice: "A" | "B") {
    if (!currentQuestion || answerResolved) return;
    if (mode === "challenge") {
      resolveChallengeAnswer(deadlineMs !== null && currentTimeMs() >= deadlineMs ? null : choice);
      return;
    }
    setSelectedChoice(choice);
  }

  function finishChallenge() {
    if (mode !== "challenge" || !answerResolved || stats.attempts !== sequence.length) return;
    const payload: GameRoundResult = {
      roundId: crypto.randomUUID(),
      gameId: "tooth-comparison-duel",
      score: stats.score,
      bestStreak: stats.bestStreak,
      correct: stats.correct,
      attempts: stats.attempts,
      masteryDelta: stats.masteryDelta,
    };
    setPhase("review");
    setSelectedChoice(null);
    setTimedOut(false);
    setDeadlineMs(null);
    setShowAllReview(false);
    void persistRound(payload);
  }

  function nextQuestion() {
    if (!answerResolved || !currentQuestion) return;
    const isLast = questionIndex >= sequence.length - 1;
    if (mode === "challenge" && isLast) {
      finishChallenge();
      return;
    }
    setQuestionIndex(isLast ? 0 : questionIndex + 1);
    setSelectedChoice(null);
    if (mode === "challenge") armChallengeTimer();
    else setTimedOut(false);
  }

  function resetToReady(nextMode = mode) {
    setMode(nextMode);
    setPhase("ready");
    setQuestionIndex(0);
    setSelectedChoice(null);
    setTimedOut(false);
    setDeadlineMs(null);
    setSecondsLeft(CHALLENGE_SECONDS_PER_QUESTION);
    setStats(emptyStats());
    setReview([]);
    setShowAllReview(false);
    resolvedQuestionRef.current = null;
  }

  const correctChoiceLabel = currentQuestion?.choices.find(
    (choice) => choice.id === currentQuestion.correctChoice,
  )?.label;

  return (
    <main id="game-content" className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Morphology lab · Course-verified comparisons</p>
          <h1>Tooth Comparison Duel</h1>
          <p className={styles.heroCopy}>
            Put two look-alike teeth side by side. Commit to one, then use the full comparison grid to prove the identification.
          </p>
          <div className={styles.heroLinks}>
            <Link href="/games">← Study Arcade</Link>
            <span>{QUESTIONS.length} authored comparison cards</span>
          </div>
        </div>
        <div className={styles.accountPanel} aria-label="Saved duel progress">
          <span>Account record</span>
          <strong>{progress?.roundsPlayed ?? 0} rounds</strong>
          <div>
            <p><b>{progress?.bestScore ?? 0}</b> best score</p>
            <p><b>{accuracy(progress?.totalCorrect ?? 0, progress?.totalAttempts ?? 0)}%</b> accuracy</p>
          </div>
        </div>
      </section>

      {(pendingRound || saveError) && (
        <aside className={styles.saveNotice} aria-live="polite">
          <div>
            <strong>{saving ? "Saving this challenge…" : saveError ? "Round waiting to save" : "Round saved"}</strong>
            <span>{saveError ?? "Your score and weak areas stay attached to this account."}</span>
          </div>
          {pendingRound && saveError && (
            <button type="button" disabled={saving} onClick={() => void persistRound(pendingRound)}>
              Retry save
            </button>
          )}
        </aside>
      )}

      <section className={styles.gameFrame}>
        <div className={styles.controlRail}>
          <div>
            <span className={styles.controlLabel}>Mode</span>
            <div className={styles.modeTabs} role="group" aria-label="Game mode">
              <button
                type="button"
                aria-pressed={mode === "study"}
                className={mode === "study" ? styles.activeMode : ""}
                onClick={() => resetToReady("study")}
              >
                <small>Learn</small>
                <span>Study</span>
              </button>
              <button
                type="button"
                aria-pressed={mode === "challenge"}
                className={mode === "challenge" ? styles.activeMode : ""}
                onClick={() => resetToReady("challenge")}
              >
                <small>20 sec each</small>
                <span>Challenge</span>
              </button>
            </div>
          </div>
          <div className={styles.railStatus}>
            <span>{phase === "playing" ? `${questionIndex + 1} / ${sequence.length}` : "Ready"}</span>
            <strong>{mode === "study" ? "Compare without score pressure" : "Only course-verified cards"}</strong>
            {phase !== "ready" && (
              <button type="button" className={styles.railReset} onClick={() => resetToReady(mode)}>
                Reset current session
              </button>
            )}
          </div>
        </div>

        {phase === "ready" && (
          <section className={styles.readyPanel}>
            <div className={styles.readyCopy}>
              <p>{mode === "study" ? "Study mode" : "Challenge mode"}</p>
              <h2>{mode === "study" ? "Choose a look-alike pair" : "Ten comparisons. Twenty seconds each."}</h2>
              <span>
                {mode === "study"
                  ? "Work one family at a time. Every answer reveals the correct clue, the tempting trap, and a six-row comparison."
                  : "The visible timer resolves an unanswered card as a miss. Score, streak, accuracy, and weak areas update as you answer."}
              </span>
            </div>
            {mode === "study" ? (
              <div className={styles.pairPicker}>
                <label htmlFor="comparison-pair">Comparison pair</label>
                <select
                  id="comparison-pair"
                  value={studyPair}
                  onChange={(event) => setStudyPair(event.target.value)}
                >
                  {pairOptions.map((pair) => (
                    <option key={pair.key} value={pair.key}>{pair.label}</option>
                  ))}
                </select>
                <button type="button" onClick={startStudy}>Open comparison</button>
              </div>
            ) : (
              <div className={styles.challengeLaunch}>
                <div>
                  <span>Question pool</span>
                  <strong>{QUESTIONS.filter((question) => question.evidenceStatus === "course-verified").length} verified cards</strong>
                </div>
                <button type="button" onClick={startChallenge}>Start challenge</button>
              </div>
            )}
            {savedWeakAreas.length > 0 && (
              <div className={styles.savedWeakAreas}>
                <p>Saved weak areas</p>
                <ul>
                  {savedWeakAreas.map(({ parsed, entry }) => parsed && (
                    <li key={`${parsed.family}|${parsed.featureType}`}>
                      <span>{parsed.family} · {FEATURE_LABELS[parsed.featureType]}</span>
                      <b>{accuracy(entry.correct, entry.attempts)}%</b>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {phase === "playing" && currentQuestion && (
          <>
            <div className={styles.liveBar}>
              <div>
                <span>Family</span>
                <strong>{currentQuestion.toothA.family}</strong>
              </div>
              <div>
                <span>Feature</span>
                <strong>{FEATURE_LABELS[currentQuestion.featureType]}</strong>
              </div>
              {mode === "challenge" && (
                <div className={styles.liveStats} aria-label="Live challenge stats">
                  <p
                    className={!answerResolved && secondsLeft <= 5 ? styles.timerUrgent : ""}
                    role="timer"
                    aria-label={`${secondsLeft} seconds remaining`}
                  >
                    <span>{answerResolved ? "Time locked" : "Time"}</span>
                    <b>{timedOut ? "0s" : `${secondsLeft}s`}</b>
                  </p>
                  <p><span>Score</span><b>{stats.score}</b></p>
                  <p><span>Streak</span><b>{stats.streak}</b></p>
                  <p><span>Attempts</span><b>{stats.attempts}</b></p>
                  <p><span>Accuracy</span><b>{accuracy(stats.correct, stats.attempts)}%</b></p>
                </div>
              )}
            </div>

            <div className={styles.duelStage}>
              <ToothComparisonVisual
                card="A"
                label={currentQuestion.toothA.label}
                universal={currentQuestion.toothA.universal}
                visualId={currentQuestion.toothA.visualId}
                revealLandmarks={mode === "study" || answerResolved}
                state={
                  answerResolved
                    ? currentQuestion.correctChoice === "A"
                      ? "correct"
                      : selectedChoice === "A"
                        ? "wrong"
                        : "idle"
                    : "idle"
                }
              />
              <div className={styles.versusMark} aria-hidden="true"><span>VS</span></div>
              <ToothComparisonVisual
                card="B"
                label={currentQuestion.toothB.label}
                universal={currentQuestion.toothB.universal}
                visualId={currentQuestion.toothB.visualId}
                revealLandmarks={mode === "study" || answerResolved}
                state={
                  answerResolved
                    ? currentQuestion.correctChoice === "B"
                      ? "correct"
                      : selectedChoice === "B"
                        ? "wrong"
                        : "idle"
                    : "idle"
                }
              />
            </div>

            <section className={styles.questionPanel} aria-labelledby="duel-prompt">
              <div className={styles.questionHeading}>
                <span>Commit to the better match</span>
                <h2 id="duel-prompt">{currentQuestion.prompt}</h2>
              </div>
              <div className={styles.choiceGrid}>
                {currentQuestion.choices.map((choice) => {
                  const isCorrect = answerResolved && choice.id === currentQuestion.correctChoice;
                  const isWrong = selectedChoice === choice.id && choice.id !== currentQuestion.correctChoice;
                  return (
                    <button
                      key={choice.id}
                      type="button"
                      className={`${isCorrect ? styles.choiceCorrect : ""} ${isWrong ? styles.choiceWrong : ""}`}
                      aria-pressed={selectedChoice === choice.id}
                      disabled={answerResolved}
                      onClick={() => handleChoice(choice.id)}
                    >
                      <span>{choice.id}</span>
                      <strong>{choice.label.replace(/^Tooth [AB] — /, "")}</strong>
                    </button>
                  );
                })}
              </div>
            </section>

            {answerResolved && (
              <section className={styles.feedbackPanel} aria-live="polite">
                <div className={styles.feedbackSummary}>
                  <div className={selectedChoice === currentQuestion.correctChoice ? styles.resultCorrect : styles.resultWrong}>
                    <span>{timedOut ? "Time expired" : selectedChoice === currentQuestion.correctChoice ? "Correct" : "Not this one"}</span>
                    <h2>{correctChoiceLabel}</h2>
                  </div>
                  <div className={styles.explanationGrid}>
                    <article>
                      <span>Why it is correct</span>
                      <p>{currentQuestion.explanation}</p>
                    </article>
                    <article>
                      <span>Why the tempting answer is wrong</span>
                      <p>{currentQuestion.distractorExplanation}</p>
                    </article>
                  </div>
                </div>

                <div className={styles.comparisonBlock}>
                  <div className={styles.comparisonHeading}>
                    <div>
                      <span>Compact comparison</span>
                      <h3>{pairLabel(currentQuestion)}</h3>
                    </div>
                    <p><b>Common trap:</b> {currentQuestion.commonTrap}</p>
                  </div>
                  <div className={styles.tableScroller}>
                    <table>
                      <thead>
                        <tr>
                          <th>Feature</th>
                          <th>Tooth A</th>
                          <th>Tooth B</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentQuestion.comparisonRows.map((row) => (
                          <tr key={row.label}>
                            <th scope="row">{row.label}</th>
                            <td>{row.toothA}</td>
                            <td>{row.toothB}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className={styles.feedbackActions}>
                  <span>{currentQuestion.evidenceStatus === "course-verified" ? "Course-verified record" : "Study-only review record"}</span>
                  <button type="button" onClick={nextQuestion}>
                    {mode === "challenge" && questionIndex === sequence.length - 1
                      ? "Finish challenge"
                      : mode === "study" && questionIndex === sequence.length - 1
                        ? "Loop this pair"
                        : "Next comparison"}
                  </button>
                </div>
              </section>
            )}
          </>
        )}

        {phase === "review" && (
          <section className={styles.reviewPanel}>
            <div className={styles.reviewHero}>
              <div>
                <p>Challenge review</p>
                <h2>{stats.correct} of {stats.attempts} correct</h2>
                <span>{accuracy(stats.correct, stats.attempts)}% accuracy · {stats.score} points · best streak {stats.bestStreak}</span>
              </div>
              <button type="button" onClick={startChallenge}>Run another challenge</button>
            </div>

            <div className={styles.weakAreaPanel}>
              <span>Weak areas from scored answers</span>
              {roundWeakAreas.length ? (
                <ul>
                  {roundWeakAreas.map((area) => (
                    <li key={`${area.family}|${area.featureType}`}>
                      <strong>{area.family}</strong>
                      <span>{FEATURE_LABELS[area.featureType]}</span>
                      <b>{area.missed} missed</b>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No missed family-feature groups in this round.</p>
              )}
            </div>

            <div className={styles.reviewList}>
              <div className={styles.reviewFocus}>
                <div>
                  <span>Missed-item review</span>
                  <strong>
                    {missedReview.length
                      ? `${missedReview.length} miss${missedReview.length === 1 ? "" : "es"} to revisit`
                      : "No misses in this round"}
                  </strong>
                </div>
                {review.length > 0 && (
                  <button type="button" onClick={() => setShowAllReview((current) => !current)}>
                    {showAllReview ? "Show misses only" : "Show all answers"}
                  </button>
                )}
              </div>
              {!showAllReview && missedReview.length === 0 && (
                <p className={styles.perfectReview}>Perfect round — there are no missed items to review.</p>
              )}
              {visibleReview.map((answer, index) => (
                <article key={answer.questionId} className={answer.correct ? styles.reviewCorrect : styles.reviewWrong}>
                  <header>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <p>{answer.pairLabel} · {FEATURE_LABELS[answer.featureType]}</p>
                      <h3>{answer.prompt}</h3>
                    </div>
                    <b>{answer.correct ? "Correct" : "Review"}</b>
                  </header>
                  <div>
                    <p>Your answer: <strong>{answer.submittedLabel}</strong></p>
                    {!answer.correct && <p>Correct answer: <strong>{answer.correctLabel}</strong></p>}
                    <span>{answer.explanation}</span>
                  </div>
                </article>
              ))}
            </div>

            <div className={styles.reviewActions}>
              <button type="button" onClick={() => resetToReady("study")}>Study one pair</button>
              <Link href="/games">Back to Study Arcade</Link>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
