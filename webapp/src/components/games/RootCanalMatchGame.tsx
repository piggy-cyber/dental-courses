"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import rootCanalCatalogJson from "@/data/games/root-canal-match-data.json";
import { saveGameRound } from "@/app/(games)/games/actions";
import {
  ROOT_CANAL_DIFFICULTIES,
  answerForRecord,
  type RootCanalDifficulty,
  type RootCanalMatchCatalog,
  type RootCanalMatchRecord,
} from "@/lib/games/root-canal-match-types";
import type { GameProgress, GameRoundResult, MasteryMap } from "@/lib/games/types";
import { RootCanalTooth } from "./RootCanalTooth";
import styles from "./RootCanalMatch.module.css";

const catalog = rootCanalCatalogJson as RootCanalMatchCatalog;
const verifiedRecords = catalog.records.filter(
  (record) => record.evidenceStatus === "course-verified",
);
const validRecordIds = new Set(verifiedRecords.map((record) => record.id));
const PENDING_ROUND_KEY = "fourth-canal:root-canal-match:pending-round";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Mode = "study" | "challenge";
type Phase = "ready" | "playing" | "review";

type ReviewAnswer = {
  id: string;
  recordId: string;
  prompt: string;
  submittedAnswer: string;
  correctAnswer: string;
  correct: boolean;
  explanation: string;
};

type RoundState = {
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
  points: number;
};

type WeakArea = {
  category: "Tooth family" | "Root count" | "Canal count" | "Variation";
  label: string;
  correct: number;
  attempts: number;
};

type RootCanalMatchGameProps = {
  initialProgress: GameProgress | null;
};

const MODE_OPTIONS: Array<{ id: Mode; label: string; eyebrow: string; description: string }> = [
  {
    id: "study",
    label: "Study",
    eyebrow: "Untimed",
    description: "Work one course-verified pattern at a time with the full explanation after every answer.",
  },
  {
    id: "challenge",
    label: "Challenge",
    eyebrow: "3 matches",
    description: "Score one complete level, then review misses and category-level weak areas.",
  },
];

const DIFFICULTY_COPY: Record<RootCanalDifficulty, { label: string; eyebrow: string }> = {
  basic: { label: "Basic", eyebrow: "Root number" },
  intermediate: { label: "Intermediate", eyebrow: "Root / canal pattern" },
  clinical: { label: "Clinical", eyebrow: "Variation / clue" },
};

function emptyRound(): RoundState {
  return {
    score: 0,
    streak: 0,
    bestStreak: 0,
    correct: 0,
    attempts: 0,
    masteryDelta: {},
    review: [],
  };
}

function recordsForDifficulty(difficulty: RootCanalDifficulty) {
  return verifiedRecords.filter((record) => record.difficulty === difficulty);
}

function promptForRecord(record: RootCanalMatchRecord) {
  if (record.difficulty === "basic") {
    return `Which common root pattern matches the ${record.toothName.toLowerCase()}?`;
  }
  if (record.difficulty === "intermediate") {
    return `Which common canal pattern belongs with this ${record.toothName.toLowerCase()}?`;
  }
  return `Which variation or endodontic clue matters most for this ${record.toothName.toLowerCase()}?`;
}

function hashText(value: string) {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash;
}

function optionsForRecord(record: RootCanalMatchRecord) {
  const options = [...new Set([answerForRecord(record), ...record.wrongOptions])];
  return options.sort(
    (first, second) => hashText(`${record.id}:${first}`) - hashText(`${record.id}:${second}`),
  );
}

function shuffledRecordIds(records: RootCanalMatchRecord[]) {
  const ids = records.map((record) => record.id);
  for (let index = ids.length - 1; index > 0; index -= 1) {
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    const swapIndex = random[0] % (index + 1);
    [ids[index], ids[swapIndex]] = [ids[swapIndex] as string, ids[index] as string];
  }
  return ids;
}

function countLabel(pattern: string, unit: "root" | "canal") {
  const match = pattern.match(new RegExp(`\\b(one|two|three|four)\\s+${unit}s?`, "i"));
  return match ? match[0].toLowerCase() : `${unit} pattern`;
}

function variationLabel(record: RootCanalMatchRecord) {
  if (record.id.startsWith("mx-pm1")) return "premolar root distribution";
  if (record.id.startsWith("mx-m1")) return "MB2 search";
  if (record.id.startsWith("mn-m1")) return "distal-root variation";
  return "second-molar four-canal variation";
}

function areaLabels(record: RootCanalMatchRecord) {
  return [
    {
      category: "Tooth family" as const,
      label: record.toothName.includes("premolar") ? "premolar" : "molar",
    },
    { category: "Root count" as const, label: countLabel(record.commonRootPattern, "root") },
    { category: "Canal count" as const, label: countLabel(record.commonCanalPattern, "canal") },
    { category: "Variation" as const, label: variationLabel(record) },
  ];
}

function weakestAreas(mastery: MasteryMap): WeakArea[] {
  const totals = new Map<string, WeakArea>();
  for (const record of verifiedRecords) {
    const entry = mastery[record.id];
    if (!entry?.attempts) continue;
    for (const area of areaLabels(record)) {
      const key = `${area.category}:${area.label}`;
      const current = totals.get(key) ?? { ...area, correct: 0, attempts: 0 };
      current.correct += entry.correct;
      current.attempts += entry.attempts;
      totals.set(key, current);
    }
  }

  const categories: WeakArea["category"][] = [
    "Tooth family",
    "Root count",
    "Canal count",
    "Variation",
  ];
  return categories.flatMap((category) => {
    const candidates = [...totals.values()]
      .filter((area) => area.category === category)
      .sort((first, second) => {
        const firstAccuracy = first.correct / first.attempts;
        const secondAccuracy = second.correct / second.attempts;
        return firstAccuracy - secondAccuracy || second.attempts - first.attempts;
      });
    return candidates.slice(0, 1);
  });
}

function storePendingRound(round: GameRoundResult | null) {
  try {
    if (round) sessionStorage.setItem(PENDING_ROUND_KEY, JSON.stringify(round));
    else sessionStorage.removeItem(PENDING_ROUND_KEY);
  } catch {
    // The server save can still proceed if browser storage is unavailable.
  }
}

function isPendingRound(value: unknown): value is GameRoundResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const round = value as Partial<GameRoundResult>;
  if (
    round.gameId !== "root-canal-match" ||
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
  for (const [recordId, entry] of Object.entries(round.masteryDelta)) {
    if (
      !validRecordIds.has(recordId) ||
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

export function RootCanalMatchGame({ initialProgress }: RootCanalMatchGameProps) {
  const [mode, setMode] = useState<Mode>("study");
  const [difficulty, setDifficulty] = useState<RootCanalDifficulty>("basic");
  const [phase, setPhase] = useState<Phase>("playing");
  const [studyIndex, setStudyIndex] = useState(0);
  const [questionOrder, setQuestionOrder] = useState<string[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [round, setRound] = useState<RoundState>(emptyRound);
  const [progress, setProgress] = useState<GameProgress | null>(initialProgress);
  const [pendingRound, setPendingRound] = useState<GameRoundResult | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const studyPool = useMemo(() => recordsForDifficulty(difficulty), [difficulty]);
  const question = useMemo(() => {
    if (mode === "study") return studyPool[studyIndex % studyPool.length] ?? null;
    const recordId = questionOrder[questionIndex];
    return verifiedRecords.find((record) => record.id === recordId) ?? null;
  }, [mode, questionIndex, questionOrder, studyIndex, studyPool]);
  const options = useMemo(() => (question ? optionsForRecord(question) : []), [question]);
  const savedAccuracy = progress?.totalAttempts
    ? Math.round((progress.totalCorrect / progress.totalAttempts) * 100)
    : null;
  const roundAccuracy = round.attempts ? Math.round((round.correct / round.attempts) * 100) : 0;
  const savedWeakAreas = useMemo(() => weakestAreas(progress?.mastery ?? {}), [progress]);
  const roundWeakAreas = useMemo(() => weakestAreas(round.masteryDelta), [round.masteryDelta]);

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

  function resetAnswer() {
    setSelectedOption(null);
    setFeedback(null);
  }

  function chooseMode(nextMode: Mode) {
    if (mode === "challenge" && phase === "playing") return;
    setMode(nextMode);
    setRound(emptyRound());
    setQuestionOrder([]);
    setQuestionIndex(0);
    setStudyIndex(0);
    resetAnswer();
    setPhase(nextMode === "study" ? "playing" : "ready");
  }

  function chooseDifficulty(nextDifficulty: RootCanalDifficulty) {
    if (mode === "challenge" && phase === "playing") return;
    setDifficulty(nextDifficulty);
    setRound(emptyRound());
    setQuestionOrder([]);
    setQuestionIndex(0);
    setStudyIndex(0);
    resetAnswer();
    setPhase(mode === "study" ? "playing" : "ready");
  }

  function startChallenge() {
    const pool = recordsForDifficulty(difficulty);
    setQuestionOrder(shuffledRecordIds(pool));
    setQuestionIndex(0);
    setRound(emptyRound());
    resetAnswer();
    setPhase("playing");
  }

  function lockAnswer() {
    if (!question || !selectedOption || feedback) return;
    const correctAnswer = answerForRecord(question);
    const correct = selectedOption === correctAnswer;
    const nextStreak = correct ? round.streak + 1 : 0;
    const points = correct ? 100 + Math.min(100, nextStreak * 10) : 0;
    const previousMastery = round.masteryDelta[question.id] ?? { correct: 0, attempts: 0 };
    const nextRound: RoundState = {
      ...round,
      score: round.score + points,
      streak: nextStreak,
      bestStreak: Math.max(round.bestStreak, nextStreak),
      correct: round.correct + (correct ? 1 : 0),
      attempts: round.attempts + 1,
      masteryDelta: {
        ...round.masteryDelta,
        [question.id]: {
          correct: previousMastery.correct + (correct ? 1 : 0),
          attempts: previousMastery.attempts + 1,
        },
      },
      review: [
        ...round.review,
        {
          id: `${question.id}-${round.attempts + 1}`,
          recordId: question.id,
          prompt: promptForRecord(question),
          submittedAnswer: selectedOption,
          correctAnswer,
          correct,
          explanation: question.explanation,
        },
      ],
    };
    setRound(nextRound);
    setFeedback({ correct, points });
  }

  function finishChallenge() {
    const payload: GameRoundResult = {
      roundId: crypto.randomUUID(),
      gameId: "root-canal-match",
      score: round.score,
      bestStreak: round.bestStreak,
      correct: round.correct,
      attempts: round.attempts,
      masteryDelta: round.masteryDelta,
    };
    setPhase("review");
    resetAnswer();
    void persistRound(payload);
  }

  function moveNext() {
    if (!feedback) return;
    if (mode === "study") {
      setStudyIndex((current) => (current + 1) % studyPool.length);
      resetAnswer();
      return;
    }
    if (questionIndex + 1 >= questionOrder.length) {
      finishChallenge();
      return;
    }
    setQuestionIndex((current) => current + 1);
    resetAnswer();
  }

  function discardPendingRound() {
    if (saving) return;
    setPendingRound(null);
    setSaveError(null);
    storePendingRound(null);
  }

  const missedAnswers = round.review.filter((answer) => !answer.correct);
  const activeMode = MODE_OPTIONS.find((item) => item.id === mode) ?? MODE_OPTIONS[0];

  return (
    <main id="game-content" className={styles.page}>
      <header className={styles.hero}>
        <div>
          <Link href="/games" className={styles.backLink}>
            <span aria-hidden="true">←</span> Study arcade
          </Link>
          <p className={styles.kicker}>Endodontic anatomy lab · Root / canal distinction</p>
          <h1>Root Canal Match</h1>
          <p className={styles.heroCopy}>
            Match the external root plan to the common canal pattern—then keep the important variation in view.
          </p>
        </div>
        <div className={styles.progressCluster} aria-label="Saved Root Canal Match progress">
          <span><small>Best score</small><strong>{progress?.bestScore.toLocaleString() ?? "—"}</strong></span>
          <span><small>Best streak</small><strong>{progress?.bestStreak ?? "—"}</strong></span>
          <span><small>Accuracy</small><strong>{savedAccuracy === null ? "—" : `${savedAccuracy}%`}</strong></span>
        </div>
      </header>

      {pendingRound ? (
        <aside className={styles.saveNotice} role="status">
          <div>
            <strong>{saving ? "Syncing your challenge…" : "A completed challenge is waiting to sync."}</strong>
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

      <section className={styles.gameFrame} aria-labelledby="game-mode-label">
        <div className={styles.controlRail}>
          <div>
            <p className={styles.controlLabel} id="game-mode-label">Mode</p>
            <div className={styles.modeTabs} role="group" aria-label="Root Canal Match modes">
              {MODE_OPTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={mode === item.id}
                  className={mode === item.id ? styles.activeControl : ""}
                  disabled={mode === "challenge" && phase === "playing"}
                  onClick={() => chooseMode(item.id)}
                >
                  <small>{item.eyebrow}</small>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className={styles.controlLabel}>Level</p>
            <div className={styles.levelTabs} role="group" aria-label="Difficulty level">
              {ROOT_CANAL_DIFFICULTIES.map((level) => (
                <button
                  key={level}
                  type="button"
                  aria-pressed={difficulty === level}
                  className={difficulty === level ? styles.activeControl : ""}
                  disabled={mode === "challenge" && phase === "playing"}
                  onClick={() => chooseDifficulty(level)}
                >
                  <small>{DIFFICULTY_COPY[level].eyebrow}</small>
                  <span>{DIFFICULTY_COPY[level].label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {mode === "challenge" && phase === "ready" ? (
          <div className={styles.modeIntro}>
            <div>
              <p>{DIFFICULTY_COPY[difficulty].eyebrow}</p>
              <h2>{DIFFICULTY_COPY[difficulty].label} challenge</h2>
              <span>{activeMode.description}</span>
            </div>
            <button type="button" className={styles.primaryButton} disabled={Boolean(pendingRound)} onClick={startChallenge}>
              Start 3-match round <span aria-hidden="true">→</span>
            </button>
          </div>
        ) : null}

        {phase === "playing" && question ? (
          <>
            <div className={styles.promptBar}>
              <span className={styles.promptIndex}>
                {mode === "challenge" ? `Q${questionIndex + 1}/${questionOrder.length}` : DIFFICULTY_COPY[difficulty].label.slice(0, 3).toUpperCase()}
              </span>
              <div className={styles.promptCopy}>
                <p>{promptForRecord(question)}</p>
                <span>Select one pattern, then lock the match.</span>
              </div>
              <div className={styles.liveStats} aria-label="Current score">
                <span><small>Score</small><strong>{round.score.toLocaleString()}</strong></span>
                <span><small>Streak</small><strong>×{round.streak}</strong></span>
                <span><small>Attempts</small><strong>{round.attempts}</strong></span>
                <span><small>Accuracy</small><strong>{round.attempts ? `${roundAccuracy}%` : "—"}</strong></span>
              </div>
            </div>

            <div className={styles.matchBoard}>
              <article className={styles.toothCard}>
                <div className={styles.toothIdentity}>
                  <span>{question.toothNumber}</span>
                  <div>
                    <p>{DIFFICULTY_COPY[question.difficulty].eyebrow}</p>
                    <h2>{question.toothName}</h2>
                  </div>
                </div>
                <div className={styles.toothStage}>
                  <RootCanalTooth record={question} />
                </div>
                <div className={styles.diagramLegend} aria-label="Diagram legend">
                  <span><i className={styles.rootKey} /> Root outline</span>
                  <span><i className={styles.canalKey} /> Canal path</span>
                  <span>Study silhouette · not a radiograph</span>
                </div>
              </article>

              <form
                className={styles.optionPanel}
                onSubmit={(event) => {
                  event.preventDefault();
                  lockAnswer();
                }}
              >
                <fieldset disabled={Boolean(feedback)}>
                  <legend>Possible root / canal patterns</legend>
                  <p>Root count and canal count are separate anatomy.</p>
                  <div className={styles.optionList}>
                    {options.map((option, index) => (
                      <label key={option} className={selectedOption === option ? styles.selectedOption : ""}>
                        <input
                          type="radio"
                          name="root-canal-pattern"
                          value={option}
                          checked={selectedOption === option}
                          onChange={() => setSelectedOption(option)}
                        />
                        <span className={styles.optionCode}>{String.fromCharCode(65 + index)}</span>
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <button type="submit" className={styles.primaryButton} disabled={!selectedOption || Boolean(feedback)}>
                  Lock match
                </button>
              </form>
            </div>

            <div className={styles.feedbackRegion} aria-live="assertive" aria-atomic="true">
              {feedback ? (
                <div className={feedback.correct ? styles.feedbackCorrect : styles.feedbackWrong}>
                  <div className={styles.feedbackHeader}>
                    <div>
                      <p>{feedback.correct ? `Correct · +${feedback.points}` : "Not quite"}</p>
                      <h3>{question.explanation}</h3>
                    </div>
                    <button type="button" className={styles.primaryButton} onClick={moveNext}>
                      {mode === "challenge" && questionIndex + 1 >= questionOrder.length ? "See review" : "Next match"}
                    </button>
                  </div>
                  <dl className={styles.patternBreakdown}>
                    <div><dt>Common roots</dt><dd>{question.commonRootPattern}</dd></div>
                    <div><dt>Common canals</dt><dd>{question.commonCanalPattern}</dd></div>
                    <div><dt>Important variation</dt><dd>{question.importantVariation}</dd></div>
                    <div><dt>Clinical clue</dt><dd>{question.clinicalNote}</dd></div>
                  </dl>
                  <p className={styles.evidenceLine}>
                    Course verified · {question.sourceRefs.map((source) => `${source.courseCode}, ${source.locator}`).join(" · ")}
                  </p>
                </div>
              ) : null}
            </div>
          </>
        ) : null}

        {phase === "review" ? (
          <section className={styles.reviewPanel}>
            <div className={styles.reviewSummary}>
              <div>
                <p>Challenge complete</p>
                <h2>{round.correct} of {round.attempts} correct</h2>
                <span>Score {round.score.toLocaleString()} · streak ×{round.bestStreak} · accuracy {roundAccuracy}%</span>
              </div>
              <button type="button" className={styles.primaryButton} disabled={Boolean(pendingRound)} onClick={startChallenge}>
                Play this level again
              </button>
            </div>

            <div className={styles.reviewGrid}>
              <section className={styles.weakAreas} aria-labelledby="weak-area-title">
                <p className={styles.sectionEyebrow}>This round</p>
                <h3 id="weak-area-title">Weak-area readout</h3>
                {roundWeakAreas.length ? (
                  <ul>
                    {roundWeakAreas.map((area) => {
                      const accuracy = Math.round((area.correct / area.attempts) * 100);
                      return (
                        <li key={`${area.category}-${area.label}`}>
                          <span><small>{area.category}</small><strong>{area.label}</strong></span>
                          <span>{accuracy}%</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : <p className={styles.emptyState}>Complete a scored match to reveal category signals.</p>}
              </section>

              <section className={styles.missedReview} aria-labelledby="missed-review-title">
                <p className={styles.sectionEyebrow}>Missed-item review</p>
                <h3 id="missed-review-title">{missedAnswers.length ? `${missedAnswers.length} to revisit` : "Clean round"}</h3>
                {missedAnswers.length ? (
                  <ol>
                    {missedAnswers.map((answer) => {
                      const record = verifiedRecords.find((item) => item.id === answer.recordId);
                      return (
                        <li key={answer.id}>
                          <span>{record?.toothNumber ?? "—"}</span>
                          <div>
                            <p>{record?.toothName}</p>
                            <small>{answer.explanation}</small>
                            <strong>Correct match: {answer.correctAnswer}</strong>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                ) : <p className={styles.emptyState}>No missed items in this challenge.</p>}
              </section>
            </div>
          </section>
        ) : null}
      </section>

      <aside className={styles.savedWeakPanel} aria-labelledby="saved-weak-title">
        <div>
          <p className={styles.sectionEyebrow}>Saved performance</p>
          <h2 id="saved-weak-title">Weak areas across completed challenges</h2>
        </div>
        {savedWeakAreas.length ? (
          <ul>
            {savedWeakAreas.map((area) => (
              <li key={`${area.category}-${area.label}`}>
                <small>{area.category}</small>
                <strong>{area.label}</strong>
                <span>{Math.round((area.correct / area.attempts) * 100)}% · {area.attempts} attempts</span>
              </li>
            ))}
          </ul>
        ) : <p>Complete a Challenge round to build tooth-family, root-count, canal-count, and variation signals.</p>}
      </aside>

      <footer className={styles.gameFooter}>
        <p>Keyboard and touch ready: choose a radio option, then lock the match. No drag gesture is required.</p>
        <p>Course facts are paraphrased into original prompts and diagrams. Patterns describe common anatomy and documented variation, never guaranteed absolutes.</p>
      </footer>
    </main>
  );
}
