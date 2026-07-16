"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import toothCatalogJson from "@/data/games/tooth-data.json";
import { saveGameRound } from "@/app/(games)/games/actions";
import type { Dentition, Tooth, ToothCatalog } from "@/lib/games/tooth-types";
import type { GameProgress, GameRoundResult, MasteryMap } from "@/lib/games/types";
import { ToothArch } from "./ToothArch";
import styles from "./ToothQuest.module.css";

const catalog = toothCatalogJson as ToothCatalog;
const PENDING_ROUND_KEY = "fourth-canal:tooth-quest:pending-round";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Mode = "map" | "speed" | "recall" | "bonus";
type Phase = "idle" | "playing" | "review";
type PromptKind = "locate-code" | "locate-name" | "identify-code" | "bonus-code";

type Question = {
  id: string;
  kind: PromptKind;
  tooth: Tooth;
  prompt: string;
  instruction: string;
  expectedAnswer: string;
  answerMode: "click" | "input";
};

type ReviewAnswer = {
  id: string;
  prompt: string;
  submittedAnswer: string;
  correctAnswer: string;
  correct: boolean;
  explanation: string;
};

type RoundState = {
  question: Question | null;
  score: number;
  streak: number;
  bestStreak: number;
  correct: number;
  attempts: number;
  lives: number;
  masteryDelta: MasteryMap;
  review: ReviewAnswer[];
  questionStartedAt: number;
};

type Feedback = {
  correct: boolean;
  message: string;
};

type ToothQuestGameProps = {
  initialProgress: GameProgress | null;
  canSaveProgress: boolean;
};

const MODES: Array<{ id: Mode; label: string; eyebrow: string; description: string }> = [
  {
    id: "map",
    label: "Map",
    eyebrow: "Learn",
    description: "Explore every tooth with labels and morphology study cues.",
  },
  {
    id: "speed",
    label: "Speed",
    eyebrow: "60 sec · 3 lives",
    description: "Answer mixed location and numbering prompts before time runs out.",
  },
  {
    id: "recall",
    label: "Recall",
    eyebrow: "10 questions",
    description: "An untimed mixed set with a complete answer review.",
  },
  {
    id: "bonus",
    label: "Bonus",
    eyebrow: "Supernumerary",
    description: "Practice the adjacent-tooth rule in a focused five-question round.",
  },
];

function emptyRound(): RoundState {
  return {
    question: null,
    score: 0,
    streak: 0,
    bestStreak: 0,
    correct: 0,
    attempts: 0,
    lives: 3,
    masteryDelta: {},
    review: [],
    questionStartedAt: Date.now(),
  };
}

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T;
}

function qualifiedName(tooth: Tooth) {
  const arch = tooth.arch === "maxillary" ? "maxillary" : "mandibular";
  return `${tooth.side} ${arch} ${tooth.name.toLowerCase()}`;
}

function createQuestion(dentition: Dentition, mode: Mode, previousCode?: string): Question {
  const pool = catalog.teeth.filter((tooth) => tooth.dentition === dentition);
  const alternatives = pool.filter((tooth) => tooth.code !== previousCode);
  const tooth = randomItem(alternatives.length ? alternatives : pool);
  const kind: PromptKind =
    mode === "bonus"
      ? "bonus-code"
      : randomItem<PromptKind>(["locate-code", "locate-name", "identify-code"]);
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  if (kind === "locate-code") {
    return {
      id,
      kind,
      tooth,
      prompt: `Find tooth ${tooth.code}`,
      instruction: "Select its crown on the arch.",
      expectedAnswer: tooth.code,
      answerMode: "click",
    };
  }
  if (kind === "locate-name") {
    return {
      id,
      kind,
      tooth,
      prompt: `Find the ${qualifiedName(tooth)}`,
      instruction: "Select its crown on the arch.",
      expectedAnswer: tooth.code,
      answerMode: "click",
    };
  }
  if (kind === "bonus-code") {
    return {
      id,
      kind,
      tooth,
      prompt: "Code the adjacent supernumerary tooth",
      instruction:
        dentition === "permanent"
          ? `Highlighted: ${qualifiedName(tooth)}. Type its number plus 50.`
          : `Highlighted: ${qualifiedName(tooth)}. Type its letter followed by S.`,
      expectedAnswer: tooth.supernumeraryCode,
      answerMode: "input",
    };
  }
  return {
    id,
    kind,
    tooth,
    prompt: "Which Universal code belongs to the highlighted tooth?",
    instruction: `Study cue: ${qualifiedName(tooth)}.`,
    expectedAnswer: tooth.code,
    answerMode: "input",
  };
}

function normalizeAnswer(value: string) {
  return value.trim().replace(/^#/, "").replace(/\s+/g, "").toUpperCase();
}

function storePendingRound(round: GameRoundResult | null) {
  try {
    if (round) sessionStorage.setItem(PENDING_ROUND_KEY, JSON.stringify(round));
    else sessionStorage.removeItem(PENDING_ROUND_KEY);
  } catch {
    // Saving to the account can still proceed when browser storage is unavailable.
  }
}

function isPendingRound(value: unknown): value is GameRoundResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const round = value as Partial<GameRoundResult>;
  if (
    round.gameId !== "tooth-quest" ||
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
  for (const entry of Object.values(round.masteryDelta)) {
    if (
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

export function ToothQuestGame({ initialProgress, canSaveProgress }: ToothQuestGameProps) {
  const [mode, setMode] = useState<Mode>("map");
  const [phase, setPhase] = useState<Phase>("idle");
  const [dentition, setDentition] = useState<Dentition>("permanent");
  const [selectedCode, setSelectedCode] = useState<string | null>("8");
  const [revealedCode, setRevealedCode] = useState<string | null>(null);
  const [selectionCorrect, setSelectionCorrect] = useState<boolean | null>(null);
  const [answerInput, setAnswerInput] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [round, setRound] = useState<RoundState>(emptyRound);
  const [timeLeft, setTimeLeft] = useState(60);
  const [finishReason, setFinishReason] = useState("");
  const [progress, setProgress] = useState<GameProgress | null>(initialProgress);
  const [pendingRound, setPendingRound] = useState<GameRoundResult | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const roundRef = useRef<RoundState>(round);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deadlineRef = useRef<number | null>(null);
  const transitionRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const finishingRef = useRef(false);

  const selectedTooth = useMemo(
    () => catalog.teeth.find((tooth) => tooth.code === selectedCode) ?? null,
    [selectedCode],
  );
  const selectedTemplate = useMemo(
    () =>
      selectedTooth
        ? catalog.morphologyTemplates.find((template) => template.id === selectedTooth.templateId) ?? null
        : null,
    [selectedTooth],
  );
  const masteredCount = progress
    ? Object.values(progress.mastery).filter(
        (entry) => entry.attempts >= 2 && entry.correct / entry.attempts >= 0.8,
      ).length
    : 0;

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
      deadlineRef.current = null;
      if (transitionRef.current) clearTimeout(transitionRef.current);
      setPhase("review");
      setFinishReason(reason);
      setFeedback(null);
      const payload: GameRoundResult = {
        roundId: crypto.randomUUID(),
        gameId: "tooth-quest",
        score: snapshot.score,
        bestStreak: snapshot.bestStreak,
        correct: snapshot.correct,
        attempts: snapshot.attempts,
        masteryDelta: snapshot.masteryDelta,
      };
      if (snapshot.attempts > 0 && canSaveProgress) {
        void persistRound(payload);
      }
    },
    [canSaveProgress, persistRound],
  );

  useEffect(() => {
    if (!canSaveProgress) return;
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
  }, [canSaveProgress]);

  useEffect(() => {
    if (phase === "playing" && round.question?.answerMode === "input" && !feedback) {
      inputRef.current?.focus();
    }
  }, [feedback, phase, round.question]);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (transitionRef.current) clearTimeout(transitionRef.current);
    },
    [],
  );

  function chooseMode(nextMode: Mode) {
    if (phase === "playing") return;
    setMode(nextMode);
    setPhase("idle");
    setFinishReason("");
    setFeedback(null);
    setSelectionCorrect(null);
    setRevealedCode(null);
    const firstCode = dentition === "permanent" ? "8" : "E";
    setSelectedCode(nextMode === "map" ? firstCode : null);
  }

  function chooseDentition(nextDentition: Dentition) {
    if (phase === "playing") return;
    setDentition(nextDentition);
    setSelectedCode(nextDentition === "permanent" ? "8" : "E");
    setRevealedCode(null);
    setSelectionCorrect(null);
  }

  function startRound() {
    if (mode === "map") return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (transitionRef.current) clearTimeout(transitionRef.current);
    finishingRef.current = false;
    const firstQuestion = createQuestion(dentition, mode);
    const nextRound = { ...emptyRound(), question: firstQuestion };
    roundRef.current = nextRound;
    setRound(nextRound);
    setPhase("playing");
    setTimeLeft(60);
    deadlineRef.current = null;
    setFeedback(null);
    setAnswerInput("");
    setSelectedCode(null);
    setRevealedCode(null);
    setSelectionCorrect(null);
    setFinishReason("");

    if (mode === "speed") {
      deadlineRef.current = Date.now() + 60_000;
      timerRef.current = setInterval(() => {
        const deadline = deadlineRef.current;
        if (!deadline) return;
        const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining === 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          deadlineRef.current = null;
          window.setTimeout(() => finishRound(roundRef.current, "Time's up"), 0);
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

  function handleToothSelect(tooth: Tooth) {
    if (mode === "map") {
      setSelectedCode(tooth.code);
      return;
    }
    if (phase !== "playing" || feedback || round.question?.answerMode !== "click") return;
    answerQuestion(tooth.code);
  }

  function submitTypedAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!answerInput.trim()) return;
    answerQuestion(answerInput);
  }

  function answerQuestion(rawAnswer: string) {
    const current = roundRef.current;
    const question = current.question;
    if (!question || phase !== "playing" || feedback || finishingRef.current) return;

    const submittedAnswer = normalizeAnswer(rawAnswer);
    const correctAnswer = normalizeAnswer(question.expectedAnswer);
    const correct = submittedAnswer === correctAnswer;
    const nextStreak = correct ? current.streak + 1 : 0;
    const elapsedTenths = Math.floor((Date.now() - current.questionStartedAt) / 100);
    const speedBonus = mode === "speed" && correct ? Math.max(0, 60 - elapsedTenths) : 0;
    const streakBonus = correct ? Math.min(100, nextStreak * 10) : 0;
    const gainedScore = correct ? 100 + speedBonus + streakBonus : 0;
    const masteryCode = question.kind === "bonus-code" ? question.tooth.supernumeraryCode : question.tooth.code;
    const previousMastery = current.masteryDelta[masteryCode] ?? { correct: 0, attempts: 0 };
    const explanation =
      question.kind === "bonus-code"
        ? dentition === "permanent"
          ? `${question.tooth.code} + 50 = ${question.tooth.supernumeraryCode}.`
          : `Append S to ${question.tooth.code}: ${question.tooth.supernumeraryCode}.`
        : `Tooth ${question.tooth.code} is the ${qualifiedName(question.tooth)}.`;
    const nextRound: RoundState = {
      ...current,
      score: current.score + gainedScore,
      streak: nextStreak,
      bestStreak: Math.max(current.bestStreak, nextStreak),
      correct: current.correct + (correct ? 1 : 0),
      attempts: current.attempts + 1,
      lives: mode === "speed" && !correct ? current.lives - 1 : current.lives,
      masteryDelta: {
        ...current.masteryDelta,
        [masteryCode]: {
          correct: previousMastery.correct + (correct ? 1 : 0),
          attempts: previousMastery.attempts + 1,
        },
      },
      review: [
        ...current.review,
        {
          id: question.id,
          prompt: question.prompt,
          submittedAnswer,
          correctAnswer,
          correct,
          explanation,
        },
      ],
    };
    roundRef.current = nextRound;
    setRound(nextRound);
    setSelectedCode(question.answerMode === "click" ? submittedAnswer : null);
    setRevealedCode(question.tooth.code);
    setSelectionCorrect(correct);
    setAnswerInput("");
    setFeedback({
      correct,
      message: correct ? `Correct · +${gainedScore}` : `Not quite · ${explanation}`,
    });

    const reachedLimit =
      (mode === "recall" && nextRound.attempts >= 10) ||
      (mode === "bonus" && nextRound.attempts >= 5);
    const lostAllLives = mode === "speed" && nextRound.lives <= 0;

    transitionRef.current = setTimeout(() => {
      if (reachedLimit || lostAllLives) {
        finishRound(nextRound, lostAllLives ? "No lives left" : "Round complete");
        return;
      }
      const nextQuestion = createQuestion(dentition, mode, question.tooth.code);
      const advancedRound = {
        ...nextRound,
        question: nextQuestion,
        questionStartedAt: Date.now(),
      };
      roundRef.current = advancedRound;
      setRound(advancedRound);
      setFeedback(null);
      setSelectedCode(null);
      setRevealedCode(null);
      setSelectionCorrect(null);
    }, 720);
  }

  const currentMode = MODES.find((item) => item.id === mode) ?? MODES[0];
  const question = round.question;
  const labelsVisible = mode === "map" || phase !== "playing";
  const archDisabled =
    mode !== "map" &&
    (phase !== "playing" || question?.answerMode !== "click" || Boolean(feedback));

  return (
    <main id="game-content" className={styles.page}>
      <header className={styles.hero}>
        <div>
          <Link href="/games" className={styles.backLink}>
            <span aria-hidden="true">←</span> Study arcade
          </Link>
          <p className={styles.kicker}>Universal numbering lab · Game 01</p>
          <h1>Tooth Quest</h1>
          <p className={styles.heroCopy}>
            Read the arch like a clinician: map it, recall it, then race it.
          </p>
        </div>
        <div className={styles.progressCluster} aria-label="Saved Tooth Quest progress">
          <span><small>Best score</small><strong>{progress?.bestScore.toLocaleString() ?? "—"}</strong></span>
          <span><small>Best streak</small><strong>{progress?.bestStreak ?? "—"}</strong></span>
          <span><small>Mastered</small><strong>{masteredCount}</strong></span>
        </div>
      </header>

      {!canSaveProgress ? (
        <aside className={styles.saveNotice} role="status">
          <div>
            <strong>Playing as a guest.</strong>
            <p>Your game works normally. Sign in when you want scores and mastery saved.</p>
          </div>
          <div className={styles.saveActions}>
            <Link href="/#account">Sign in to save</Link>
          </div>
        </aside>
      ) : null}

      {pendingRound ? (
        <aside className={styles.saveNotice} role="status">
          <div>
            <strong>{saving ? "Syncing your round…" : "A completed round is waiting to sync."}</strong>
            {saveError ? <p>{saveError}</p> : <p>Your result is safely held in this browser.</p>}
          </div>
          <div className={styles.saveActions}>
            <button type="button" disabled={saving} onClick={() => void persistRound(pendingRound)}>
              {saving ? "Saving…" : "Retry save"}
            </button>
            <button type="button" disabled={saving} onClick={discardPendingRound}>
              Discard
            </button>
          </div>
        </aside>
      ) : null}

      <section className={styles.gameFrame} aria-labelledby="mode-heading">
        <div className={styles.controlRail}>
          <div>
            <p className={styles.controlLabel} id="mode-heading">Game mode</p>
            <div className={styles.modeTabs} role="group" aria-label="Tooth Quest modes">
              {MODES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={mode === item.id}
                  className={mode === item.id ? styles.activeMode : ""}
                  disabled={phase === "playing"}
                  onClick={() => chooseMode(item.id)}
                >
                  <small>{item.eyebrow}</small>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className={styles.dentitionControl}>
            <p className={styles.controlLabel}>Dentition</p>
            <div>
              <button
                type="button"
                aria-pressed={dentition === "permanent"}
                className={dentition === "permanent" ? styles.activeDentition : ""}
                disabled={phase === "playing"}
                onClick={() => chooseDentition("permanent")}
              >
                Permanent <span>1–32</span>
              </button>
              <button
                type="button"
                aria-pressed={dentition === "primary"}
                className={dentition === "primary" ? styles.activeDentition : ""}
                disabled={phase === "playing"}
                onClick={() => chooseDentition("primary")}
              >
                Primary <span>A–T</span>
              </button>
            </div>
          </div>
        </div>

        {mode !== "map" && phase === "idle" ? (
          <div className={styles.modeIntro}>
            <div>
              <p>{currentMode.eyebrow}</p>
              <h2>{currentMode.label} mode</h2>
              <span>{currentMode.description}</span>
            </div>
            <button type="button" className={styles.startButton} disabled={Boolean(pendingRound)} onClick={startRound}>
              Start {currentMode.label} <span aria-hidden="true">→</span>
            </button>
          </div>
        ) : null}

        {phase === "playing" && question ? (
          <div className={styles.promptBar}>
            <div className={styles.promptIndex}>
              <span>{mode === "speed" ? "LIVE" : `Q${round.attempts + 1}`}</span>
            </div>
            <div className={styles.promptCopy}>
              <p>{question.prompt}</p>
              <span>{question.instruction}</span>
            </div>
            <div className={styles.liveStats} aria-label="Current round stats">
              {mode === "speed" ? <span><small>Time</small><strong>{timeLeft}</strong></span> : null}
              {mode === "speed" ? <span><small>Lives</small><strong aria-label={`${round.lives} lives`}>{"●".repeat(Math.max(0, round.lives))}</strong></span> : null}
              <span><small>Score</small><strong>{round.score.toLocaleString()}</strong></span>
              <span><small>Streak</small><strong>×{round.streak}</strong></span>
            </div>
          </div>
        ) : null}

        <div className={styles.archStage}>
          <div className={styles.archBackdrop} aria-hidden="true"><span /><span /><span /></div>
          <ToothArch
            catalog={catalog}
            dentition={dentition}
            labelsVisible={labelsVisible}
            highlightedCode={phase === "playing" && question?.answerMode === "input" ? question.tooth.code : null}
            selectedCode={selectedCode}
            revealedCode={revealedCode}
            selectionCorrect={selectionCorrect}
            disabled={archDisabled}
            onSelect={handleToothSelect}
          />
        </div>

        {phase === "playing" && question?.answerMode === "input" ? (
          <form className={styles.answerForm} onSubmit={submitTypedAnswer}>
            <label htmlFor="tooth-answer">Your answer</label>
            <div>
              <input
                ref={inputRef}
                id="tooth-answer"
                value={answerInput}
                inputMode={dentition === "permanent" ? "numeric" : "text"}
                autoComplete="off"
                spellCheck={false}
                maxLength={3}
                placeholder={question.kind === "bonus-code" ? "Code" : dentition === "permanent" ? "1–32" : "A–T"}
                aria-describedby="answer-hint"
                disabled={Boolean(feedback)}
                onChange={(event) => setAnswerInput(event.target.value)}
              />
              <button type="submit" disabled={!answerInput.trim() || Boolean(feedback)}>Lock answer</button>
            </div>
            <span id="answer-hint">Press Enter to submit.</span>
          </form>
        ) : null}

        <div className={`${styles.feedback} ${feedback ? (feedback.correct ? styles.feedbackCorrect : styles.feedbackWrong) : ""}`} aria-live="assertive" aria-atomic="true">
          {feedback?.message ?? ""}
        </div>

        {mode === "map" && selectedTooth && selectedTemplate ? (
          <section className={styles.toothInspector} aria-live="polite">
            <div className={styles.inspectorIdentity}>
              <span className={styles.codeTile}>{selectedTooth.code}</span>
              <div>
                <p>{qualifiedName(selectedTooth)}</p>
                <h2>{selectedTemplate.displayName}</h2>
              </div>
            </div>
            <dl>
              <div><dt>Crown form</dt><dd>{selectedTemplate.crownOutline.replaceAll("-", " ")}</dd></div>
              <div><dt>Typical cusps</dt><dd>{selectedTemplate.cusps.typical || "Incisal edge"}</dd></div>
              <div><dt>Groove cue</dt><dd>{selectedTemplate.groovePattern}</dd></div>
              <div><dt>Landmark cue</dt><dd>{selectedTemplate.landmark}</dd></div>
            </dl>
            <p className={styles.studyCue}>Anatomy notes are study cues, not clinical guidance.</p>
          </section>
        ) : null}

        {phase === "review" ? (
          <section className={styles.reviewPanel}>
            <div className={styles.reviewSummary}>
              <div>
                <p>{finishReason}</p>
                <h2>{round.correct} of {round.attempts} correct</h2>
                <span>Score {round.score.toLocaleString()} · best streak ×{round.bestStreak}</span>
              </div>
              <button type="button" className={styles.startButton} disabled={Boolean(pendingRound)} onClick={startRound}>Play again</button>
            </div>
            <ol className={styles.reviewList}>
              {round.review.map((answer, index) => (
                <li key={answer.id} className={answer.correct ? styles.reviewCorrect : styles.reviewWrong}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <p>{answer.prompt}</p>
                    <small>{answer.explanation}</small>
                  </div>
                  <strong>{answer.correct ? "Correct" : `${answer.submittedAnswer || "—"} → ${answer.correctAnswer}`}</strong>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </section>

      <footer className={styles.gameFooter}>
        <p>
          Use ← → ↑ ↓ to move between teeth, then Enter to select. Numbering follows the practitioner&apos;s view of the open mouth.
        </p>
        <p>
          Source: <a href="https://www.ada.org/-/media/project/ada-organization/ada/ada-org/files/publications/cdt/universal_tooth_designation_system_valueset_2.pdf?hash=4C41BD09B3D776E69F6CDB3854C052F9&amp;rev=5938db8b7a72425a912cc09fff3ea8f0" target="_blank" rel="noreferrer">ADA Universal Tooth Designation System value set</a>. Anatomy notes are study cues, not clinical guidance.
        </p>
      </footer>
    </main>
  );
}
