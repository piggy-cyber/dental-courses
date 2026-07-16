export const GAME_IDS = [
  "tooth-quest",
  "contact-area",
  "eruption-timeline",
  "root-canal-match",
] as const;

export type GameId = (typeof GAME_IDS)[number];

export type MasteryEntry = {
  correct: number;
  attempts: number;
};

export type MasteryMap = Record<string, MasteryEntry>;

export type GameProgress = {
  gameId: GameId;
  bestScore: number;
  bestStreak: number;
  totalCorrect: number;
  totalAttempts: number;
  roundsPlayed: number;
  mastery: MasteryMap;
  lastPlayedAt: string | null;
};

export type GameRoundResult = {
  roundId: string;
  gameId: GameId;
  score: number;
  bestStreak: number;
  correct: number;
  attempts: number;
  masteryDelta: MasteryMap;
};

export type SaveGameRoundResult =
  | { ok: true; progress: GameProgress }
  | { ok: false; error: string };

export function normalizeMastery(value: unknown): MasteryMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const normalized: MasteryMap = {};
  for (const [code, rawEntry] of Object.entries(value)) {
    if (!rawEntry || typeof rawEntry !== "object" || Array.isArray(rawEntry)) continue;
    const entry = rawEntry as Record<string, unknown>;
    const correct = Number(entry.correct);
    const attempts = Number(entry.attempts);
    if (
      Number.isInteger(correct) &&
      Number.isInteger(attempts) &&
      correct >= 0 &&
      attempts >= correct
    ) {
      normalized[code] = { correct, attempts };
    }
  }
  return normalized;
}

export function progressFromRow(row: Record<string, unknown>): GameProgress {
  return {
    gameId: row.game_id as GameId,
    bestScore: Number(row.best_score) || 0,
    bestStreak: Number(row.best_streak) || 0,
    totalCorrect: Number(row.total_correct) || 0,
    totalAttempts: Number(row.total_attempts) || 0,
    roundsPlayed: Number(row.rounds_played) || 0,
    mastery: normalizeMastery(row.mastery),
    lastPlayedAt: typeof row.last_played_at === "string" ? row.last_played_at : null,
  };
}
