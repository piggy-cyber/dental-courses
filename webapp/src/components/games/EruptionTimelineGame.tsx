"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import { saveGameRound } from "@/app/(games)/games/actions";
import {
  eruptionCatalog,
  formatEruptionRange,
  rangeInMonths,
  type EruptionRecord,
  type EruptionToothType,
} from "@/lib/games/eruption-types";
import type { GameProgress, GameRoundResult, MasteryMap } from "@/lib/games/types";
import styles from "./EruptionTimeline.module.css";

const PENDING_ROUND_KEY = "fourth-canal:eruption-timeline:pending-round";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const verifiedRecords = eruptionCatalog.records.filter(
  (record) => record.evidenceStatus === "course-verified",
);
const recordsById = new Map(verifiedRecords.map((record) => [record.id, record]));

type TimelineMode = "permanent" | "primary" | "mixed-sequence" | "random-mixed";
type ExperienceMode = "study" | "challenge";
type Phase = "ready" | "arranging" | "review";

type TimelineRound = {
  id: string;
  label: string;
  items: EruptionRecord[];
};

type AttemptResult = {
  correctIds: Set<string>;
  misplacedIds: Set<string>;
  canonical: EruptionRecord[];
  score: number;
  bestStreak: number;
  timedOut: boolean;
};

type SessionStats = {
  score: number;
  streak: number;
  bestStreak: number;
  correct: number;
  attempts: number;
};

type EruptionTimelineGameProps = {
  initialProgress: GameProgress | null;
};

const MODES: Array<{
  id: TimelineMode;
  label: string;
  eyebrow: string;
  description: string;
}> = [
  {
    id: "permanent",
    label: "Permanent",
    eyebrow: "One arch",
    description: "Order a permanent arch from first molar to third molar.",
  },
  {
    id: "primary",
    label: "Primary",
    eyebrow: "Verified set",
    description: "Build the cross-arch primary sequence from conflict-free course records.",
  },
  {
    id: "mixed-sequence",
    label: "Mixed sequence",
    eyebrow: "6-12 years",
    description: "Connect the early permanent events that shape the mixed dentition.",
  },
  {
    id: "random-mixed",
    label: "Random mix",
    eyebrow: "All records",
    description: "Sort a six-card sample across dentitions, arches, and age units.",
  },
];

const MIXED_SEQUENCE_IDS = [
  "mixed-mandibular-first-molar",
  "mixed-mandibular-central-incisor",
  "mixed-maxillary-first-molar",
  "mixed-maxillary-central-incisor",
  "mixed-mandibular-lateral-incisor",
  "mixed-maxillary-lateral-incisor",
  "mixed-mandibular-canine",
  "mixed-mandibular-first-premolar",
  "mixed-maxillary-canine",
];

const RANDOM_DEFAULT_IDS = [
  "primary-mandibular-central-incisor",
  "primary-maxillary-lateral-incisor",
  "primary-maxillary-first-molar",
  "permanent-mandibular-first-molar",
  "permanent-maxillary-lateral-incisor",
  "permanent-maxillary-canine",
];

function canonicalSort(records: EruptionRecord[]) {
  return [...records].sort((a, b) => {
    const aRange = rangeInMonths(a);
    const bRange = rangeInMonths(b);
    return (
      aRange.min - bRange.min ||
      aRange.max - bRange.max ||
      a.sequenceRank - b.sequenceRank ||
      a.toothName.localeCompare(b.toothName)
    );
  });
}

function shuffled<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex] as T, copy[index] as T];
  }
  return copy;
}

function seededShuffle<T>(items: T[], seed: string) {
  let state = 2_166_136_261;
  for (const character of seed) {
    state ^= character.charCodeAt(0);
    state = Math.imul(state, 16_777_619);
  }

  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    const random = ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
    const swapIndex = Math.floor(random * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex] as T, copy[index] as T];
  }
  return copy;
}

function recordsForIds(ids: string[]) {
  return ids.map((id) => recordsById.get(id)).filter((item): item is EruptionRecord => Boolean(item));
}

function buildRound(mode: TimelineMode, randomize = false, bankSeed = `${mode}-initial`): TimelineRound {
  let items: EruptionRecord[];
  let label: string;

  if (mode === "permanent") {
    const arch = randomize && Math.random() > 0.5 ? "mandibular" : "maxillary";
    items = verifiedRecords.filter(
      (record) => record.dentitionType === "permanent" && record.arch === arch,
    );
    label = `${arch === "maxillary" ? "Maxillary" : "Mandibular"} permanent arch`;
  } else if (mode === "primary") {
    items = verifiedRecords.filter((record) => record.dentitionType === "primary");
    label = "Course-verified primary sequence";
  } else if (mode === "mixed-sequence") {
    items = recordsForIds(MIXED_SEQUENCE_IDS);
    label = "Mixed dentition sequence";
  } else {
    const randomPool = verifiedRecords.filter((record) => record.timelineSet !== "mixed");
    items = randomize ? shuffled(randomPool).slice(0, 6) : recordsForIds(RANDOM_DEFAULT_IDS);
    label = "Random mixed set";
  }

  return {
    id: `${mode}-${bankSeed}`,
    label,
    items: seededShuffle(items, bankSeed),
  };
}

function gradePlacement(round: TimelineRound, placement: Array<string | null>) {
  const placedItems = placement
    .map((id) => (id ? recordsById.get(id) ?? null : null))
    .filter((item): item is EruptionRecord => Boolean(item));
  const misplacedIds = new Set(
    round.items.filter((item) => !placement.includes(item.id)).map((item) => item.id),
  );

  for (let earlierIndex = 0; earlierIndex < placedItems.length; earlierIndex += 1) {
    const earlier = placedItems[earlierIndex] as EruptionRecord;
    const earlierRange = rangeInMonths(earlier);
    for (let laterIndex = earlierIndex + 1; laterIndex < placedItems.length; laterIndex += 1) {
      const later = placedItems[laterIndex] as EruptionRecord;
      const laterRange = rangeInMonths(later);
      if (earlierRange.min > laterRange.max) {
        misplacedIds.add(earlier.id);
        misplacedIds.add(later.id);
      }
    }
  }

  const correctIds = new Set(
    round.items.filter((item) => !misplacedIds.has(item.id) && placement.includes(item.id)).map((item) => item.id),
  );
  return { correctIds, misplacedIds, canonical: canonicalSort(round.items) };
}

function emptyPlacement(round: TimelineRound) {
  return Array<string | null>(round.items.length).fill(null);
}

function storePendingRound(round: GameRoundResult | null) {
  try {
    if (round) sessionStorage.setItem(PENDING_ROUND_KEY, JSON.stringify(round));
    else sessionStorage.removeItem(PENDING_ROUND_KEY);
  } catch {
    // Account saving can continue when browser storage is unavailable.
  }
}

function isPendingRound(value: unknown): value is GameRoundResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const round = value as Partial<GameRoundResult>;
  if (
    round.gameId !== "eruption-timeline" ||
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
  for (const [id, entry] of Object.entries(round.masteryDelta)) {
    if (
      !recordsById.has(id) ||
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

function shortName(record: EruptionRecord) {
  return record.toothName
    .replace("Maxillary ", "Max ")
    .replace("Mandibular ", "Mand ")
    .replace(" permanent", "")
    .replace(" primary", "")
    .replace(" in mixed dentition", "");
}

function ToothGlyph({ type }: { type: EruptionToothType }) {
  return (
    <svg
      className={styles.toothGlyph}
      viewBox="0 0 72 72"
      aria-hidden="true"
      data-diagram-source="original morphology cue; not source-derived"
    >
      {type === "incisor" ? (
        <>
          <path d="M19 9 Q36 3 53 9 L49 35 Q43 42 36 42 Q29 42 23 35 Z" />
          <path d="M29 39 Q36 45 43 39 L40 64 Q36 69 32 64 Z" />
          <path className={styles.detailLine} d="M23 15 Q36 11 49 15" />
        </>
      ) : null}
      {type === "canine" ? (
        <>
          <path d="M15 21 Q24 9 31 12 L36 4 L42 12 Q51 10 57 22 L50 39 Q43 45 36 44 Q27 44 20 38 Z" />
          <path d="M29 41 Q36 46 43 41 L39 67 Q36 70 33 67 Z" />
          <path className={styles.detailLine} d="M22 27 Q36 18 50 27" />
        </>
      ) : null}
      {type === "premolar" ? (
        <>
          <path d="M13 25 Q15 10 29 11 Q36 4 43 11 Q57 11 59 25 Q58 42 45 47 Q36 51 25 46 Q14 41 13 25 Z" />
          <path d="M26 44 Q31 49 35 46 L32 66 Q29 69 27 65 Z" />
          <path d="M37 46 Q42 49 47 44 L44 65 Q41 69 39 65 Z" />
          <path className={styles.detailLine} d="M22 28 Q28 17 35 28 Q42 16 50 28 M20 34 Q36 40 52 34" />
        </>
      ) : null}
      {type === "molar" ? (
        <>
          <path d="M8 24 Q10 10 23 12 Q29 4 36 12 Q45 4 51 13 Q63 12 64 26 L58 43 Q49 51 36 49 Q21 52 12 42 Z" />
          <path d="M17 43 Q24 51 30 47 L27 66 Q23 71 20 65 Z" />
          <path d="M33 48 Q39 53 45 47 L43 67 Q39 71 36 66 Z" />
          <path d="M48 45 Q55 47 59 42 L56 62 Q52 68 49 63 Z" />
          <path className={styles.detailLine} d="M18 27 Q24 16 31 27 Q37 15 44 27 Q51 17 57 29 M15 35 Q28 42 39 34 Q49 42 59 34" />
        </>
      ) : null}
    </svg>
  );
}

export function EruptionTimelineGame({ initialProgress }: EruptionTimelineGameProps) {
  const initialRound = useMemo(() => buildRound("permanent"), []);
  const [mode, setMode] = useState<TimelineMode>("permanent");
  const [experience, setExperience] = useState<ExperienceMode>("study");
  const [phase, setPhase] = useState<Phase>("arranging");
  const [round, setRound] = useState<TimelineRound>(initialRound);
  const [placement, setPlacement] = useState<Array<string | null>>(() => emptyPlacement(initialRound));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [stats, setStats] = useState<SessionStats>({
    score: 0,
    streak: 0,
    bestStreak: 0,
    correct: 0,
    attempts: 0,
  });
  const [sessionMastery, setSessionMastery] = useState<MasteryMap>({});
  const [progress, setProgress] = useState<GameProgress | null>(initialProgress);
  const [pendingRound, setPendingRound] = useState<GameRoundResult | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const roundRef = useRef(round);
  const placementRef = useRef(placement);
  const timeLeftRef = useRef(timeLeft);
  const finishingRef = useRef(false);

  useEffect(() => {
    roundRef.current = round;
  }, [round]);

  useEffect(() => {
    placementRef.current = placement;
  }, [placement]);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  const persistRound = useCallback(async (payload: GameRoundResult) => {
    storePendingRound(payload);
    setPendingRound(payload);
    setSaveError(null);
    setSaving(true);
    try {
      const saved = await saveGameRound(payload);
      if (saved.ok) {
        setProgress(saved.progress);
        setPendingRound(null);
        storePendingRound(null);
      } else {
        setSaveError(saved.error);
      }
    } catch {
      setSaveError("Progress could not be saved yet. Your timeline is ready to retry.");
    } finally {
      setSaving(false);
    }
  }, []);

  const finishAttempt = useCallback(
    (timedOut = false) => {
      if (finishingRef.current) return;
      finishingRef.current = true;
      const currentRound = roundRef.current;
      const currentPlacement = placementRef.current;
      const graded = gradePlacement(currentRound, currentPlacement);
      const orderedCorrectness = currentPlacement.map(
        (id) => Boolean(id) && graded.correctIds.has(id as string),
      );
      let runningStreak = 0;
      let attemptBestStreak = 0;
      for (const correct of orderedCorrectness) {
        runningStreak = correct ? runningStreak + 1 : 0;
        attemptBestStreak = Math.max(attemptBestStreak, runningStreak);
      }
      const correctCount = graded.correctIds.size;
      const complete = correctCount === currentRound.items.length;
      const score =
        correctCount * 100 +
        (complete ? 200 : 0) +
        (experience === "challenge" ? Math.max(0, timeLeftRef.current) * 2 : 0);
      const masteryDelta: MasteryMap = {};
      for (const item of currentRound.items) {
        masteryDelta[item.id] = {
          correct: graded.correctIds.has(item.id) ? 1 : 0,
          attempts: 1,
        };
      }

      setResult({
        ...graded,
        score,
        bestStreak: attemptBestStreak,
        timedOut,
      });
      setPhase("review");
      setSelectedId(null);
      setStats((current) => ({
        score: current.score + score,
        streak: runningStreak,
        bestStreak: Math.max(current.bestStreak, attemptBestStreak),
        correct: current.correct + correctCount,
        attempts: current.attempts + currentRound.items.length,
      }));
      setSessionMastery((current) => {
        const next = { ...current };
        for (const [id, delta] of Object.entries(masteryDelta)) {
          const prior = next[id] ?? { correct: 0, attempts: 0 };
          next[id] = {
            correct: prior.correct + delta.correct,
            attempts: prior.attempts + delta.attempts,
          };
        }
        return next;
      });

      const payload: GameRoundResult = {
        roundId: crypto.randomUUID(),
        gameId: "eruption-timeline",
        score,
        bestStreak: attemptBestStreak,
        correct: correctCount,
        attempts: currentRound.items.length,
        masteryDelta,
      };
      void persistRound(payload);
    },
    [experience, persistRound],
  );

  useEffect(() => {
    if (experience !== "challenge" || phase !== "arranging") return;
    let remaining = 60;
    const tick = () => {
      remaining = Math.max(0, remaining - 1);
      timeLeftRef.current = remaining;
      setTimeLeft(remaining);
      if (remaining === 0) finishAttempt(true);
    };
    const timer = window.setInterval(tick, 1_000);
    return () => window.clearInterval(timer);
  }, [experience, finishAttempt, phase]);

  useEffect(() => {
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
  }, []);

  const bankItems = useMemo(
    () => round.items.filter((item) => !placement.includes(item.id)),
    [placement, round.items],
  );
  const allPlaced = bankItems.length === 0;
  const accuracy = stats.attempts ? Math.round((stats.correct / stats.attempts) * 100) : 0;
  const savedAccuracy = progress?.totalAttempts
    ? Math.round((progress.totalCorrect / progress.totalAttempts) * 100)
    : null;

  const weakAreas = useMemo(() => {
    const categories = new Map<string, { label: string; correct: number; attempts: number }>();
    for (const [id, mastery] of Object.entries(sessionMastery)) {
      const record = recordsById.get(id);
      if (!record) continue;
      const labels = [
        `${record.dentitionType} dentition`,
        `${record.arch} arch`,
        `${record.sequenceBand.replace("-", " ")} sequence`,
      ];
      for (const label of labels) {
        const current = categories.get(label) ?? { label, correct: 0, attempts: 0 };
        current.correct += mastery.correct;
        current.attempts += mastery.attempts;
        categories.set(label, current);
      }
    }
    return [...categories.values()]
      .filter((category) => category.attempts > 0)
      .sort(
        (a, b) =>
          a.correct / a.attempts - b.correct / b.attempts || b.attempts - a.attempts,
      )
      .slice(0, 3);
  }, [sessionMastery]);

  function resetWithRound(nextRound: TimelineRound, nextPhase: Phase) {
    finishingRef.current = false;
    roundRef.current = nextRound;
    const nextPlacement = emptyPlacement(nextRound);
    placementRef.current = nextPlacement;
    setRound(nextRound);
    setPlacement(nextPlacement);
    setSelectedId(null);
    setDraggedId(null);
    setResult(null);
    setTimeLeft(60);
    timeLeftRef.current = 60;
    setPhase(nextPhase);
  }

  function chooseMode(nextMode: TimelineMode) {
    setMode(nextMode);
    resetWithRound(
      buildRound(nextMode, false, crypto.randomUUID()),
      experience === "challenge" ? "ready" : "arranging",
    );
  }

  function chooseExperience(nextExperience: ExperienceMode) {
    setExperience(nextExperience);
    resetWithRound(
      buildRound(mode, false, crypto.randomUUID()),
      nextExperience === "challenge" ? "ready" : "arranging",
    );
  }

  function startRound() {
    const nextRound = buildRound(mode, true, crypto.randomUUID());
    resetWithRound(nextRound, "arranging");
  }

  function placeCard(id: string, targetIndex: number) {
    if (phase !== "arranging") return;
    setPlacement((current) => {
      const next = [...current];
      const currentIndex = next.indexOf(id);
      const displaced = next[targetIndex];
      if (currentIndex >= 0) next[currentIndex] = displaced;
      next[targetIndex] = id;
      placementRef.current = next;
      return next;
    });
    setSelectedId(null);
  }

  function removeCard(index: number) {
    if (phase !== "arranging") return;
    setPlacement((current) => {
      const next = [...current];
      next[index] = null;
      placementRef.current = next;
      return next;
    });
  }

  function moveCard(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (phase !== "arranging" || target < 0 || target >= placement.length) return;
    setPlacement((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      placementRef.current = next;
      return next;
    });
  }

  function handleDragStart(event: DragEvent<HTMLElement>, id: string) {
    if (phase !== "arranging") return;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
    setDraggedId(id);
  }

  function handleDrop(event: DragEvent<HTMLElement>, targetIndex: number) {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain") || draggedId;
    if (id && recordsById.has(id)) placeCard(id, targetIndex);
    setDraggedId(null);
  }

  function handleZoneKeyDown(event: KeyboardEvent<HTMLButtonElement>, targetIndex: number) {
    if (!selectedId || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    placeCard(selectedId, targetIndex);
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
          <p className={styles.kicker}>Eruption sequence lab</p>
          <h1>Eruption Timeline</h1>
          <p className={styles.heroCopy}>
            Place the age bands, respect the overlaps, and learn the sequence without false precision.
          </p>
        </div>
        <div className={styles.progressCluster} aria-label="Saved Eruption Timeline progress">
          <span>
            <small>Best score</small>
            <strong>{progress?.bestScore.toLocaleString() ?? "—"}</strong>
          </span>
          <span>
            <small>Best streak</small>
            <strong>{progress?.bestStreak ?? "—"}</strong>
          </span>
          <span>
            <small>Accuracy</small>
            <strong>{savedAccuracy === null ? "—" : `${savedAccuracy}%`}</strong>
          </span>
        </div>
      </header>

      {pendingRound ? (
        <aside className={styles.saveNotice} role="status">
          <div>
            <strong>{saving ? "Syncing your timeline…" : "A scored timeline is waiting to sync."}</strong>
            <p>{saveError ?? "Your result is safely held in this browser."}</p>
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

      <section className={styles.gameFrame} aria-labelledby="timeline-controls-heading">
        <div className={styles.controlRail}>
          <div>
            <p className={styles.controlLabel} id="timeline-controls-heading">
              Learning mode
            </p>
            <div className={styles.experienceTabs} role="group" aria-label="Learning mode">
              <button
                type="button"
                aria-pressed={experience === "study"}
                className={experience === "study" ? styles.activeControl : ""}
                onClick={() => chooseExperience("study")}
              >
                Study <span>ranges shown</span>
              </button>
              <button
                type="button"
                aria-pressed={experience === "challenge"}
                className={experience === "challenge" ? styles.activeControl : ""}
                onClick={() => chooseExperience("challenge")}
              >
                Challenge <span>60 seconds</span>
              </button>
            </div>
          </div>
          <div className={styles.liveStats} aria-label="Current session score">
            <span>
              <small>Score</small>
              <strong>{stats.score.toLocaleString()}</strong>
            </span>
            <span>
              <small>Streak</small>
              <strong>{stats.streak}</strong>
            </span>
            <span>
              <small>Attempts</small>
              <strong>{stats.attempts}</strong>
            </span>
            <span>
              <small>Accuracy</small>
              <strong>{stats.attempts ? `${accuracy}%` : "—"}</strong>
            </span>
          </div>
        </div>

        <div className={styles.modeRail} role="group" aria-label="Eruption timeline sets">
          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={mode === item.id}
              className={mode === item.id ? styles.activeMode : ""}
              onClick={() => chooseMode(item.id)}
            >
              <small>{item.eyebrow}</small>
              <strong>{item.label}</strong>
              <span>{item.description}</span>
            </button>
          ))}
        </div>

        {phase === "ready" ? (
          <div className={styles.readyPanel}>
            <div>
              <p>Challenge mode</p>
              <h2>{MODES.find((item) => item.id === mode)?.label}</h2>
              <span>Ranges and hints stay hidden until you submit. Valid overlap ties still score.</span>
            </div>
            <button type="button" onClick={startRound}>
              Start 60-second challenge
            </button>
          </div>
        ) : (
          <>
            <div className={styles.timelineHeader}>
              <div>
                <p>{round.label}</p>
                <h2>{phase === "review" ? "Placement review" : "Earliest → latest"}</h2>
                <span>
                  Drag cards into the timeline, or select a card and then choose a numbered zone.
                </span>
              </div>
              <div className={styles.timer} data-warning={timeLeft <= 10}>
                <small>{experience === "challenge" ? "Time left" : "Study pace"}</small>
                <strong>{experience === "challenge" ? `${timeLeft}s` : "Untimed"}</strong>
              </div>
            </div>

            <div className={styles.timelineScroller} aria-label="Eruption order timeline">
              <div
                className={styles.timeline}
                style={{ gridTemplateColumns: `repeat(${round.items.length}, minmax(156px, 1fr))` }}
              >
                {placement.map((id, index) => {
                  const item = id ? recordsById.get(id) ?? null : null;
                  const reviewState =
                    phase === "review" && id
                      ? result?.correctIds.has(id)
                        ? "correct"
                        : "misplaced"
                      : undefined;
                  return (
                    <div
                      className={styles.dropZone}
                      data-review={reviewState}
                      key={`${round.id}-zone-${index}`}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => handleDrop(event, index)}
                    >
                      <span className={styles.zoneNumber}>{index + 1}</span>
                      {item ? (
                        <article
                          className={styles.placedCard}
                          draggable={phase === "arranging"}
                          onDragStart={(event) => handleDragStart(event, item.id)}
                          onDragEnd={() => setDraggedId(null)}
                        >
                          <ToothGlyph type={item.toothType} />
                          <strong>{shortName(item)}</strong>
                          <small>{item.toothNumber}</small>
                          {experience === "study" || phase === "review" ? (
                            <span className={styles.range}>{formatEruptionRange(item)}</span>
                          ) : (
                            <span className={styles.hiddenRange}>Range hidden</span>
                          )}
                          {phase === "arranging" ? (
                            <div className={styles.cardMoves} aria-label={`Move ${item.toothName}`}>
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => moveCard(index, -1)}
                                aria-label={`Move ${item.toothName} earlier`}
                              >
                                ←
                              </button>
                              <button
                                type="button"
                                onClick={() => removeCard(index)}
                                aria-label={`Return ${item.toothName} to card bank`}
                              >
                                ×
                              </button>
                              <button
                                type="button"
                                disabled={index === placement.length - 1}
                                onClick={() => moveCard(index, 1)}
                                aria-label={`Move ${item.toothName} later`}
                              >
                                →
                              </button>
                            </div>
                          ) : null}
                        </article>
                      ) : (
                        <button
                          type="button"
                          className={styles.emptyZone}
                          aria-label={`Eruption order position ${index + 1}${selectedId ? ", place selected card" : ""}`}
                          onClick={() => selectedId && placeCard(selectedId, index)}
                          onKeyDown={(event) => handleZoneKeyDown(event, index)}
                        >
                          <span>Drop zone</span>
                          <small>{selectedId ? "Place selected card" : "Select a card below"}</small>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles.cardBank} aria-label="Tooth cards">
              <div className={styles.bankHeading}>
                <div>
                  <p>Card bank</p>
                  <span>
                    {phase === "review"
                      ? `${bankItems.length} card${bankItems.length === 1 ? "" : "s"} remained unplaced`
                      : `${bankItems.length} to place · tap selection works on touch and keyboard`}
                  </span>
                </div>
                {selectedId ? <strong>Card selected — choose a zone</strong> : null}
              </div>
              <div className={styles.bankGrid}>
                {bankItems.map((item) => (
                  <article
                    key={item.id}
                    className={styles.bankCard}
                    data-selected={selectedId === item.id}
                    data-review={phase === "review" ? "misplaced" : undefined}
                    draggable={phase === "arranging"}
                    onDragStart={(event) => handleDragStart(event, item.id)}
                    onDragEnd={() => setDraggedId(null)}
                  >
                    <ToothGlyph type={item.toothType} />
                    <div>
                      <strong>{shortName(item)}</strong>
                      <small>{item.toothNumber}</small>
                      {experience === "study" || phase === "review" ? (
                        <span>{formatEruptionRange(item)}</span>
                      ) : (
                        <span>Range hidden</span>
                      )}
                    </div>
                    {phase === "arranging" ? (
                      <button
                        type="button"
                        aria-label={`${selectedId === item.id ? "Deselect" : "Select"} ${item.toothName}`}
                        aria-pressed={selectedId === item.id}
                        onClick={() => setSelectedId(selectedId === item.id ? null : item.id)}
                      >
                        {selectedId === item.id ? "Selected" : "Select"}
                      </button>
                    ) : null}
                  </article>
                ))}
                {bankItems.length === 0 ? (
                  <div className={styles.bankEmpty} role="status">
                    All cards placed. Check your sequence, then submit.
                  </div>
                ) : null}
              </div>
            </div>

            {phase === "arranging" ? (
              <div className={styles.submitBar}>
                <p>
                  Overlapping source ranges may trade places. The grader only flags a card when its order is definitely impossible.
                </p>
                <div>
                  <button type="button" className={styles.secondaryButton} onClick={startRound}>
                    New set
                  </button>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    disabled={!allPlaced}
                    onClick={() => finishAttempt(false)}
                  >
                    Submit timeline
                  </button>
                </div>
              </div>
            ) : null}

            {phase === "review" && result ? (
              <section className={styles.reviewPanel} aria-live="polite">
                <div className={styles.reviewSummary}>
                  <div>
                    <p>{result.timedOut ? "Time expired" : "Timeline scored"}</p>
                    <h2>
                      {result.correctIds.size}/{round.items.length} cards held a valid position
                    </h2>
                    <span>
                      +{result.score.toLocaleString()} points · best placement streak {result.bestStreak}
                    </span>
                  </div>
                  <button type="button" onClick={startRound}>
                    {experience === "challenge" ? "Next challenge" : "New study set"}
                  </button>
                </div>

                <div className={styles.correctOrder}>
                  <p>One valid reference placement</p>
                  <ol>
                    {result.canonical.map((item) => (
                      <li key={item.id}>
                        <ToothGlyph type={item.toothType} />
                        <strong>{shortName(item)}</strong>
                        <span>{formatEruptionRange(item)}</span>
                      </li>
                    ))}
                  </ol>
                  <small>
                    Neighboring ranges that overlap may also reverse and still be valid.
                  </small>
                </div>

                <div className={styles.explanationGrid}>
                  {result.canonical.map((item) => {
                    const correct = result.correctIds.has(item.id);
                    return (
                      <article key={item.id} data-correct={correct}>
                        <p>{correct ? "Valid placement" : "Review this card"}</p>
                        <h3>{item.toothName}</h3>
                        <strong>{formatEruptionRange(item)}</strong>
                        <span>{item.explanation}</span>
                        {!correct ? <small>Common confusion: {item.commonConfusion}</small> : null}
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </>
        )}
      </section>

      <aside className={styles.weakPanel} aria-labelledby="weak-areas-heading">
        <div>
          <p className={styles.controlLabel}>Session review</p>
          <h2 id="weak-areas-heading">Weak areas</h2>
          <span>Grouped from scored cards by dentition, arch, and sequence band.</span>
        </div>
        {weakAreas.length ? (
          <ul>
            {weakAreas.map((area) => (
              <li key={area.label}>
                <span>{area.label}</span>
                <strong>{Math.round((area.correct / area.attempts) * 100)}%</strong>
                <small>{area.correct}/{area.attempts} valid placements</small>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyWeak}>Submit a timeline to map your weak areas.</p>
        )}
      </aside>

      <footer className={styles.sourceNote}>
        <p>
          Challenge uses course-verified eruption records only. Ranges are learning guides, not predictions for an individual child; official course and clinical guidance control.
        </p>
      </footer>
    </main>
  );
}
