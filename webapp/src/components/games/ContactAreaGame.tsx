"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import contactAreaJson from "@/data/games/contact-area-data.json";
import toothCatalogJson from "@/data/games/tooth-data.json";
import { saveGameRound } from "@/app/(games)/games/actions";
import {
  buildContactQuestionBank,
  createChallengeRound,
  formatBuccolingualLocation,
  formatContactLocation,
} from "@/lib/games/contact-area-questions";
import type {
  ContactAreaCatalog,
  ContactAreaRecord,
  ContactQuestion,
  ContactSurface,
  ContactZone,
} from "@/lib/games/contact-area-types";
import type { ToothCatalog } from "@/lib/games/tooth-types";
import type { GameProgress, GameRoundResult, MasteryMap } from "@/lib/games/types";
import { ContactArchDiagram, ContactToothDiagram } from "./ContactAreaDiagrams";
import styles from "./ContactArea.module.css";

const contactCatalog = contactAreaJson as unknown as ContactAreaCatalog;
const toothCatalog = toothCatalogJson as ToothCatalog;
const PENDING_ROUND_KEY = "fourth-canal:contact-area:pending-round";
const QUESTION_TIME_SECONDS = 30;
const TIMEOUT_ANSWER = "__timeout__";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONTACT_MASTERY_PATTERN = /^contact-area\|(maxillary|mandibular)\|(anterior|posterior)\|(mesial|distal)\|(incisal-occlusal|middle|cervical|junction|facial|facial-aspect-middle|facial-to-central-groove|lingual|relationship|height|terminal)$/;

type Mode = "study" | "challenge";
type Phase = "idle" | "playing" | "review";

type ReviewAnswer = {
  id: string;
  prompt: string;
  submittedAnswer: string;
  correctAnswer: string;
  correct: boolean;
  explanation: string;
  commonTrap: string;
  sourceCount: number;
};

type RoundState = {
  questions: ContactQuestion[];
  questionIndex: number;
  score: number;
  streak: number;
  bestStreak: number;
  correct: number;
  attempts: number;
  masteryDelta: MasteryMap;
  review: ReviewAnswer[];
};

type Feedback = {
  correct: boolean;
  message: string;
};

type ContactAreaGameProps = {
  initialProgress: GameProgress | null;
  canSaveProgress: boolean;
};

type WeakDimension = "arch" | "segment" | "surface" | "region";

type WeakSummary = {
  label: string;
  correct: number;
  attempts: number;
  accuracy: number;
};

const WEAK_DIMENSIONS: Array<{ id: WeakDimension; label: string }> = [
  { id: "surface", label: "Surface" },
  { id: "region", label: "Region / third" },
  { id: "arch", label: "Arch" },
  { id: "segment", label: "Anterior / posterior" },
];

function emptyRound(): RoundState {
  return {
    questions: [],
    questionIndex: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    correct: 0,
    attempts: 0,
    masteryDelta: {},
    review: [],
  };
}

function accuracy(correct: number, attempts: number) {
  return attempts ? Math.round((correct / attempts) * 100) : 0;
}

function countdownAnnouncement(seconds: number) {
  if (seconds === QUESTION_TIME_SECONDS) return `${seconds} seconds for this question.`;
  if (seconds === 10) return "10 seconds remaining.";
  if (seconds > 0 && seconds <= 5) return `${seconds} second${seconds === 1 ? "" : "s"} remaining.`;
  if (seconds === 0) return "Time expired. This answer counts as an incorrect attempt.";
  return "";
}

function titleCase(value: string) {
  const labels: Record<string, string> = {
    "incisal-occlusal": "Incisal / occlusal third",
    junction: "Third junction",
    middle: "Middle third",
    cervical: "Cervical third",
    facial: "Facial / buccal third",
    "facial-aspect-middle": "Facial aspect of middle third",
    "facial-to-central-groove": "Facial to central groove",
    lingual: "Lingual third",
    relationship: "Adjacent relationship",
    height: "Contact-height comparison",
    terminal: "Terminal contact",
  };
  return labels[value] ?? `${value[0]?.toUpperCase()}${value.slice(1)}`;
}

function summarizeWeakDimension(mastery: MasteryMap, dimension: WeakDimension): WeakSummary | null {
  const index = { arch: 1, segment: 2, surface: 3, region: 4 }[dimension];
  const totals = new Map<string, { correct: number; attempts: number }>();

  for (const [code, entry] of Object.entries(mastery)) {
    const match = code.match(CONTACT_MASTERY_PATTERN);
    if (!match) continue;
    const value = code.split("|")[index];
    if (!value) continue;
    const previous = totals.get(value) ?? { correct: 0, attempts: 0 };
    totals.set(value, {
      correct: previous.correct + entry.correct,
      attempts: previous.attempts + entry.attempts,
    });
  }

  return [...totals.entries()]
    .map(([label, entry]) => ({
      label: titleCase(label),
      correct: entry.correct,
      attempts: entry.attempts,
      accuracy: accuracy(entry.correct, entry.attempts),
    }))
    .sort((left, right) => left.accuracy - right.accuracy || right.attempts - left.attempts)[0] ?? null;
}

function storePendingRound(round: GameRoundResult | null) {
  try {
    if (round) sessionStorage.setItem(PENDING_ROUND_KEY, JSON.stringify(round));
    else sessionStorage.removeItem(PENDING_ROUND_KEY);
  } catch {
    // Account saving still works when browser storage is unavailable.
  }
}

function isPendingRound(value: unknown): value is GameRoundResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const round = value as Partial<GameRoundResult>;
  if (
    round.gameId !== "contact-area" ||
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
  for (const [code, entry] of Object.entries(round.masteryDelta)) {
    if (
      !CONTACT_MASTERY_PATTERN.test(code) ||
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

function acceptedStudyZones(
  record: ContactAreaRecord,
  surface: ContactSurface,
  axis: "incisocervical" | "faciolingual",
) {
  if (axis === "incisocervical") {
    return surface === "mesial"
      ? record.acceptedTargetRegion.mesialIncisocervical
      : record.acceptedTargetRegion.distalIncisocervical;
  }
  return surface === "mesial"
    ? record.acceptedTargetRegion.mesialFaciolingual
    : record.acceptedTargetRegion.distalFaciolingual;
}

function WeakAreaGrid({ mastery, heading }: { mastery: MasteryMap; heading: string }) {
  return (
    <section className={styles.weakSection} aria-labelledby="weak-area-heading">
      <div className={styles.sectionHeading}>
        <p>Scored answers only</p>
        <h3 id="weak-area-heading">{heading}</h3>
      </div>
      <div className={styles.weakGrid}>
        {WEAK_DIMENSIONS.map((dimension) => {
          const summary = summarizeWeakDimension(mastery, dimension.id);
          return (
            <article key={dimension.id}>
              <small>{dimension.label}</small>
              {summary ? (
                <>
                  <strong>{summary.label}</strong>
                  <span>{summary.accuracy}% · {summary.correct}/{summary.attempts}</span>
                </>
              ) : (
                <>
                  <strong>No scored data</strong>
                  <span>Complete a Challenge round.</span>
                </>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function ContactAreaGame({ initialProgress, canSaveProgress }: ContactAreaGameProps) {
  const records = contactCatalog.records;
  const toothNames = useMemo(
    () => new Map(toothCatalog.teeth.map((tooth) => [tooth.code, tooth.name])),
    [],
  );
  const questionBank = useMemo(
    () => buildContactQuestionBank(records, toothNames),
    [records, toothNames],
  );
  const [mode, setMode] = useState<Mode>("study");
  const [phase, setPhase] = useState<Phase>("idle");
  const [studyIndex, setStudyIndex] = useState(0);
  const [studySurface, setStudySurface] = useState<ContactSurface>("mesial");
  const [studyAxis, setStudyAxis] = useState<"incisocervical" | "faciolingual">("incisocervical");
  const [round, setRound] = useState<RoundState>(emptyRound);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<ContactZone | null>(null);
  const [progress, setProgress] = useState<GameProgress | null>(initialProgress);
  const [pendingRound, setPendingRound] = useState<GameRoundResult | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(QUESTION_TIME_SECONDS);
  const questionHeadingRef = useRef<HTMLHeadingElement>(null);
  const answerLockRef = useRef(false);

  const studyRecord = records[studyIndex] ?? records[0];
  const question = round.questions[round.questionIndex] ?? null;
  const missedAnswers = round.review.filter((answer) => !answer.correct);
  const savedAccuracy = progress ? accuracy(progress.totalCorrect, progress.totalAttempts) : null;

  const persistRound = useCallback(async (payload: GameRoundResult) => {
    if (!canSaveProgress) return;
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
  }, [canSaveProgress]);

  useEffect(() => {
    if (!canSaveProgress) return undefined;
    let restoreTimer: ReturnType<typeof setTimeout> | null = null;
    try {
      const raw = sessionStorage.getItem(PENDING_ROUND_KEY);
      if (!raw) return;
      const candidate: unknown = JSON.parse(raw);
      if (isPendingRound(candidate)) {
        restoreTimer = setTimeout(() => setPendingRound(candidate), 0);
      }
      else storePendingRound(null);
    } catch {
      storePendingRound(null);
    }
    return () => {
      if (restoreTimer) clearTimeout(restoreTimer);
    };
  }, [canSaveProgress]);

  useEffect(() => {
    if (mode !== "challenge" || phase !== "playing" || !question) return;
    const focusTimer = window.setTimeout(() => questionHeadingRef.current?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, [mode, phase, question, round.questionIndex]);

  function chooseMode(nextMode: Mode) {
    if (phase === "playing") return;
    setMode(nextMode);
    setPhase("idle");
    setFeedback(null);
    setSelectedAnswer(null);
    setSelectedZone(null);
  }

  function startChallenge() {
    const questions = createChallengeRound(questionBank);
    answerLockRef.current = false;
    setRound({ ...emptyRound(), questions });
    setPhase("playing");
    setFeedback(null);
    setSelectedAnswer(null);
    setSelectedZone(null);
    setTimeRemaining(QUESTION_TIME_SECONDS);
  }

  function finishRound(snapshot: RoundState) {
    setPhase("review");
    setFeedback(null);
    const payload: GameRoundResult = {
      roundId: crypto.randomUUID(),
      gameId: "contact-area",
      score: snapshot.score,
      bestStreak: snapshot.bestStreak,
      correct: snapshot.correct,
      attempts: snapshot.attempts,
      masteryDelta: snapshot.masteryDelta,
    };
    void persistRound(payload);
  }

  const answerQuestion = useCallback((value: string, submittedLabel: string) => {
    if (!question || feedback || answerLockRef.current) return;
    answerLockRef.current = true;
    const timedOut = value === TIMEOUT_ANSWER;
    const correct = !timedOut && (
      question.axis === "choice"
        ? value === question.correctChoice
        : question.acceptedZones.includes(value as ContactZone)
    );
    const nextStreak = correct ? round.streak + 1 : 0;
    const gainedScore = correct ? 100 + Math.min(100, nextStreak * 15) : 0;
    const previousMastery = round.masteryDelta[question.masteryCode] ?? { correct: 0, attempts: 0 };
    const nextRound: RoundState = {
      ...round,
      score: round.score + gainedScore,
      streak: nextStreak,
      bestStreak: Math.max(round.bestStreak, nextStreak),
      correct: round.correct + (correct ? 1 : 0),
      attempts: round.attempts + 1,
      masteryDelta: {
        ...round.masteryDelta,
        [question.masteryCode]: {
          correct: previousMastery.correct + (correct ? 1 : 0),
          attempts: previousMastery.attempts + 1,
        },
      },
      review: [
        ...round.review,
        {
          id: question.id,
          prompt: question.prompt,
          submittedAnswer: submittedLabel,
          correctAnswer: question.correctLabel,
          correct,
          explanation: question.explanation,
          commonTrap: question.commonTrap,
          sourceCount: question.sourceRefs.length,
        },
      ],
    };
    setRound(nextRound);
    if (!timedOut) {
      setSelectedAnswer(value);
      if (question.axis !== "choice") setSelectedZone(value as ContactZone);
    }
    setFeedback({
      correct,
      message: timedOut
        ? `Time expired · ${question.correctLabel}`
        : correct
          ? `Correct · +${gainedScore}`
          : `Not quite · ${question.correctLabel}`,
    });
  }, [feedback, question, round]);

  useEffect(() => {
    if (mode !== "challenge" || phase !== "playing" || !question || feedback) return;
    const countdownTimer = window.setTimeout(() => {
      if (timeRemaining <= 1) {
        setTimeRemaining(0);
        answerQuestion(TIMEOUT_ANSWER, "Timed out");
      } else {
        setTimeRemaining((current) => current - 1);
      }
    }, 1000);
    return () => window.clearTimeout(countdownTimer);
  }, [answerQuestion, feedback, mode, phase, question, timeRemaining]);

  function nextQuestion() {
    if (!feedback) return;
    if (round.attempts >= round.questions.length) {
      finishRound(round);
      return;
    }
    answerLockRef.current = false;
    setRound((current) => ({ ...current, questionIndex: current.questionIndex + 1 }));
    setFeedback(null);
    setSelectedAnswer(null);
    setSelectedZone(null);
    setTimeRemaining(QUESTION_TIME_SECONDS);
  }

  function leaveChallenge() {
    answerLockRef.current = false;
    setRound(emptyRound());
    setPhase("idle");
    setFeedback(null);
    setSelectedAnswer(null);
    setSelectedZone(null);
    setTimeRemaining(QUESTION_TIME_SECONDS);
  }

  function discardPendingRound() {
    if (saving) return;
    setPendingRound(null);
    setSaveError(null);
    storePendingRound(null);
  }

  function moveStudyRecord(direction: -1 | 1) {
    setStudyIndex((current) => (current + direction + records.length) % records.length);
    setStudySurface("mesial");
    setStudyAxis("incisocervical");
  }

  const studyAcceptedZones = studyRecord
    ? acceptedStudyZones(studyRecord, studySurface, studyAxis)
    : [];

  return (
    <main id="game-content" className={styles.page}>
      <header className={styles.hero}>
        <div>
          <Link href="/games/beta" className={styles.backLink}>
            <span aria-hidden="true">←</span> Study arcade
          </Link>
          <p className={styles.kicker}>Interproximal morphology lab · Game 04</p>
          <h1>Contact Area</h1>
          <p className={styles.heroCopy}>
            Read the neighbor, place the contact, and keep the arch relationship intact.
          </p>
        </div>
        <div className={styles.progressCluster} aria-label="Saved Contact Area progress">
          <span><small>Best score</small><strong>{progress?.bestScore.toLocaleString() ?? "—"}</strong></span>
          <span><small>Best streak</small><strong>{progress?.bestStreak ?? "—"}</strong></span>
          <span><small>Accuracy</small><strong>{savedAccuracy === null ? "—" : `${savedAccuracy}%`}</strong></span>
        </div>
      </header>

      {pendingRound ? (
        <aside className={styles.saveNotice} role="status">
          <div>
            <strong>{saving ? "Syncing your round…" : "A completed round is waiting to sync."}</strong>
            <p>{saveError ?? "Your result is safely held in this browser."}</p>
          </div>
          <div>
            <button type="button" disabled={saving} onClick={() => void persistRound(pendingRound)}>
              {saving ? "Saving…" : "Retry save"}
            </button>
            <button type="button" disabled={saving} onClick={discardPendingRound}>Discard</button>
          </div>
        </aside>
      ) : null}

      <section className={styles.gameFrame} aria-labelledby="contact-mode-heading">
        <div className={styles.controlRail}>
          <div>
            <p className={styles.controlLabel} id="contact-mode-heading">Game mode</p>
            <div className={styles.modeTabs} role="group" aria-label="Contact Area modes">
              <button
                type="button"
                aria-pressed={mode === "study"}
                className={mode === "study" ? styles.activeMode : ""}
                disabled={phase === "playing"}
                onClick={() => chooseMode("study")}
              >
                <small>Explore</small><span>Study</span>
              </button>
              <button
                type="button"
                aria-pressed={mode === "challenge"}
                className={mode === "challenge" ? styles.activeMode : ""}
                disabled={phase === "playing"}
                onClick={() => chooseMode("challenge")}
              >
                <small>10 questions</small><span>Challenge</span>
              </button>
            </div>
          </div>
          <div className={styles.evidenceKey}>
            <span aria-hidden="true" />
            Course-verified records only in Challenge
          </div>
        </div>

        {mode === "study" && studyRecord ? (
          <div className={styles.studyLab}>
            <div className={styles.studyToolbar}>
              <button type="button" onClick={() => moveStudyRecord(-1)} aria-label="Previous tooth">←</button>
              <div>
                <p>Tooth {String(studyIndex + 1).padStart(2, "0")} / {records.length}</p>
                <h2>#{studyRecord.toothNumber} · {studyRecord.toothName}</h2>
              </div>
              <button type="button" onClick={() => moveStudyRecord(1)} aria-label="Next tooth">→</button>
            </div>

            <div className={styles.archPanel}>
              <div className={styles.panelHeading}>
                <span>Arch position</span>
                <strong>{studyRecord.arch}</strong>
              </div>
              <ContactArchDiagram catalog={toothCatalog} highlightedNumber={studyRecord.toothNumber} />
            </div>

            <div className={styles.studyGrid}>
              <section className={styles.zonePanel}>
                <div className={styles.zoneControls}>
                  <div>
                    <span>Contact surface</span>
                    <div role="group" aria-label="Choose contact surface">
                      {(["mesial", "distal"] as const).map((surface) => (
                        <button
                          key={surface}
                          type="button"
                          aria-pressed={studySurface === surface}
                          className={studySurface === surface ? styles.activeControl : ""}
                          onClick={() => setStudySurface(surface)}
                        >
                          {surface}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span>Viewing axis</span>
                    <div role="group" aria-label="Choose contact viewing axis">
                      <button
                        type="button"
                        aria-pressed={studyAxis === "incisocervical"}
                        className={studyAxis === "incisocervical" ? styles.activeControl : ""}
                        onClick={() => setStudyAxis("incisocervical")}
                      >
                        Height
                      </button>
                      <button
                        type="button"
                        aria-pressed={studyAxis === "faciolingual"}
                        className={studyAxis === "faciolingual" ? styles.activeControl : ""}
                        onClick={() => setStudyAxis("faciolingual")}
                      >
                        Facial ↔ lingual
                      </button>
                    </div>
                  </div>
                </div>
                <ContactToothDiagram
                  record={studyRecord}
                  axis={studyAxis}
                  surface={studySurface}
                  selectedZone={null}
                  acceptedZones={studyAcceptedZones}
                  revealAccepted
                  disabled
                />
                <p className={styles.zoneLegend}>
                  {studyAcceptedZones.length
                    ? "Course target shown in green. Junction contacts occupy the narrow boundary band between adjoining thirds."
                    : "This terminal record is for neighbor logic; no course-verified target region is plotted."}
                </p>
              </section>

              <section className={styles.studyCard}>
                <div className={styles.verifiedBadge}><span /> Course verified · {studyRecord.sourceRefs.length} locators</div>
                <dl>
                  <div><dt>Mesial neighbor</dt><dd>{studyRecord.mesialContactTooth ? `#${studyRecord.mesialContactTooth}` : "No contact"}</dd></div>
                  <div><dt>Distal neighbor</dt><dd>{studyRecord.distalContactTooth ? `#${studyRecord.distalContactTooth}` : "No contact"}</dd></div>
                  <div><dt>Mesial height</dt><dd>{formatContactLocation(studyRecord.mesialContactLocation)}</dd></div>
                  <div><dt>Distal height</dt><dd>{formatContactLocation(studyRecord.distalContactLocation)}</dd></div>
                  <div><dt>Mesial F-L</dt><dd>{formatBuccolingualLocation(studyRecord.buccolingualContactPosition.mesial)}</dd></div>
                  <div><dt>Distal F-L</dt><dd>{formatBuccolingualLocation(studyRecord.buccolingualContactPosition.distal)}</dd></div>
                </dl>
                <div className={styles.explanationBlock}>
                  <span>Why this placement</span>
                  <p>{studyRecord.explanation}</p>
                </div>
                <div className={styles.trapBlock}>
                  <span>Common trap</span>
                  <p>{studyRecord.commonTrap}</p>
                </div>
              </section>
            </div>

            <aside className={styles.clinicalNote}>
              <strong>Why contacts matter</strong>
              <p>
                Course terminology ties contact areas to papilla protection and embrasure form. With interproximal wear, contacts become broader and flatter; the game therefore teaches regions, not single points.
              </p>
            </aside>
            {progress?.totalAttempts ? <WeakAreaGrid mastery={progress.mastery} heading="Saved weak areas" /> : null}
          </div>
        ) : null}

        {mode === "challenge" && phase === "idle" ? (
          <div className={styles.challengeIntro}>
            <div>
              <p>Course-verified set</p>
              <h2>10 questions · five mechanics</h2>
              <span>Neighbors, contact targets, faciolingual position, cervical comparisons, and terminal teeth. You have 30 seconds per question; a timeout counts as incorrect, resets the streak, and reveals the explanation.</span>
            </div>
            <button type="button" disabled={Boolean(pendingRound)} onClick={startChallenge}>
              Start Challenge <span aria-hidden="true">→</span>
            </button>
          </div>
        ) : null}

        {mode === "challenge" && phase === "playing" && question ? (
          <div className={styles.challengeStage}>
            <div className={styles.promptBar}>
              <div className={styles.promptIndex} aria-hidden="true">Q{round.questionIndex + 1}</div>
              <div>
                <p className={styles.promptPosition} aria-live="polite" aria-atomic="true">
                  Question {round.questionIndex + 1} of {round.questions.length}
                </p>
                <h2 ref={questionHeadingRef} tabIndex={-1}>{question.prompt}</h2>
                <span>{question.instruction}</span>
              </div>
              <div className={styles.challengeMeta}>
                <div
                  className={`${styles.timerCard} ${timeRemaining <= 10 ? styles.timerUrgent : ""}`}
                  role="timer"
                  aria-label={`${timeRemaining} seconds remaining`}
                >
                  <small>Time</small><strong>{timeRemaining}</strong><span>sec</span>
                </div>
                <div className={styles.liveStats} aria-label="Current challenge stats">
                  <span><small>Score</small><strong>{round.score.toLocaleString()}</strong></span>
                  <span><small>Streak</small><strong>×{round.streak}</strong></span>
                  <span><small>Accuracy</small><strong>{round.attempts ? `${accuracy(round.correct, round.attempts)}%` : "—"}</strong></span>
                </div>
                <button
                  type="button"
                  className={styles.leaveRound}
                  onClick={leaveChallenge}
                  aria-describedby="leave-round-note"
                >
                  Leave round
                </button>
              </div>
              <span className={styles.srOnly} aria-live="assertive" aria-atomic="true">
                {countdownAnnouncement(timeRemaining)}
              </span>
            </div>
            <p className={styles.leaveRoundNote} id="leave-round-note">
              Leaving discards this partial round without saving it.
            </p>

            <div className={styles.challengeGrid}>
              <section className={styles.archPanel}>
                <div className={styles.panelHeading}>
                  <span>Target tooth</span>
                  <strong>#{question.record.toothNumber} · {question.record.arch}</strong>
                </div>
                <ContactArchDiagram catalog={toothCatalog} highlightedNumber={question.record.toothNumber} />
              </section>

              <section className={styles.answerPanel}>
                {question.axis === "choice" ? (
                  <div className={styles.choiceGrid} role="group" aria-label="Answer choices">
                    {question.choices.map((choice) => {
                      const chosen = selectedAnswer === choice.value;
                      const correctChoice = feedback && choice.value === question.correctChoice;
                      const wrongChoice = feedback && chosen && choice.value !== question.correctChoice;
                      return (
                        <button
                          key={choice.value}
                          type="button"
                          className={correctChoice ? styles.choiceCorrect : wrongChoice ? styles.choiceWrong : ""}
                          disabled={Boolean(feedback)}
                          onClick={() => answerQuestion(choice.value, choice.label)}
                        >
                          <span>{choice.value.startsWith("#") ? choice.value : ""}</span>
                          {choice.label}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <ContactToothDiagram
                    record={question.record}
                    axis={question.axis}
                    surface={question.surface}
                    selectedZone={selectedZone}
                    acceptedZones={question.acceptedZones}
                    revealAccepted={Boolean(feedback)}
                    disabled={Boolean(feedback)}
                    onSelect={(zone) => answerQuestion(zone, zone.replaceAll("-", " "))}
                  />
                )}
                <div className={styles.touchHint}>
                  <span>{question.surface.toUpperCase()}</span>
                  {question.axis === "choice" ? "Choose one answer." : "Large target regions support touch, click, Enter, and Space."}
                </div>
              </section>
            </div>

            <div
              className={`${styles.feedbackPanel} ${feedback ? (feedback.correct ? styles.feedbackCorrect : styles.feedbackWrong) : ""}`}
              aria-live="assertive"
              aria-atomic="true"
            >
              {feedback ? (
                <>
                  <div className={styles.feedbackMark}>{feedback.correct ? "✓" : "×"}</div>
                  <div>
                    <strong>{feedback.message}</strong>
                    <p>{question.explanation}</p>
                    <span><b>Common trap:</b> {question.commonTrap}</span>
                    <small>Course verified · {question.sourceRefs.length} source locator{question.sourceRefs.length === 1 ? "" : "s"}</small>
                  </div>
                  <button type="button" onClick={nextQuestion}>
                    {round.attempts >= round.questions.length ? "Review round" : "Next question"} <span aria-hidden="true">→</span>
                  </button>
                </>
              ) : (
                <p className={styles.feedbackPlaceholder}>Answer to reveal the contact rule and common trap.</p>
              )}
            </div>
          </div>
        ) : null}

        {mode === "challenge" && phase === "review" ? (
          <div className={styles.reviewPanel}>
            <div className={styles.reviewSummary}>
              <div>
                <p>Round complete</p>
                <h2>{round.correct} of {round.attempts} correct</h2>
                <span>Score {round.score.toLocaleString()} · best streak ×{round.bestStreak} · {accuracy(round.correct, round.attempts)}% accuracy</span>
              </div>
              <button type="button" disabled={Boolean(pendingRound)} onClick={startChallenge}>Play again</button>
            </div>

            <WeakAreaGrid mastery={round.masteryDelta} heading="This round's weak areas" />

            <section className={styles.missedSection}>
              <div className={styles.sectionHeading}>
                <p>Missed-item review</p>
                <h3>{missedAnswers.length ? `${missedAnswers.length} item${missedAnswers.length === 1 ? "" : "s"} to revisit` : "Clean round"}</h3>
              </div>
              {missedAnswers.length ? (
                <ol className={styles.missedList}>
                  {missedAnswers.map((answer, index) => (
                    <li key={answer.id}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <strong>{answer.prompt}</strong>
                        <p>{answer.submittedAnswer} → {answer.correctAnswer}</p>
                        <small>{answer.explanation}</small>
                        <em>Trap: {answer.commonTrap}</em>
                      </div>
                      <b>{answer.sourceCount} refs</b>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className={styles.cleanRound}>No misses. Your surface, region, arch, and segment scores all came from correct answers this round.</p>
              )}
            </section>
          </div>
        ) : null}
      </section>

      <footer className={styles.gameFooter}>
        <p>Keyboard: Tab into a target, then press Enter or Space. Junction scoring uses the narrow boundary band; its larger invisible tap area improves access without accepting either entire third.</p>
        <p>Original diagrams and prompts are based on course-verified contact rules. Course materials remain private; official course and clinical guidance control.</p>
      </footer>
    </main>
  );
}
