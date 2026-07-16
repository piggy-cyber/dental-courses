"use server";

import { revalidatePath } from "next/cache";
import toothCatalogJson from "@/data/games/tooth-data.json";
import { getSessionProfile } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import {
  GAME_IDS,
  progressFromRow,
  type GameRoundResult,
  type SaveGameRoundResult,
} from "@/lib/games/types";
import type { ToothCatalog } from "@/lib/games/tooth-types";

const toothCatalog = toothCatalogJson as ToothCatalog;
const validToothCodes = new Set<string>(
  toothCatalog.teeth.flatMap((tooth) => [tooth.code, tooth.supernumeraryCode]),
);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isBoundedInteger(value: unknown, minimum: number, maximum: number) {
  return Number.isInteger(value) && Number(value) >= minimum && Number(value) <= maximum;
}

function validateRound(input: GameRoundResult): string | null {
  if (!input || typeof input !== "object") return "That round could not be read.";
  if (typeof input.roundId !== "string" || !UUID_PATTERN.test(input.roundId)) {
    return "That round identifier is not valid.";
  }
  if (!GAME_IDS.includes(input.gameId)) return "That game is not available.";
  if (!isBoundedInteger(input.score, 0, 1_000_000)) return "That score is not valid.";
  if (!isBoundedInteger(input.correct, 0, 200)) return "That result is not valid.";
  if (!isBoundedInteger(input.attempts, 0, 200) || input.correct > input.attempts) {
    return "That result is not valid.";
  }
  if (!isBoundedInteger(input.bestStreak, 0, input.correct)) {
    return "That streak is not valid.";
  }
  if (
    !input.masteryDelta ||
    typeof input.masteryDelta !== "object" ||
    Array.isArray(input.masteryDelta) ||
    JSON.stringify(input.masteryDelta).length > 20_000
  ) {
    return "That mastery update is too large.";
  }

  let masteryCorrect = 0;
  let masteryAttempts = 0;
  for (const [code, entry] of Object.entries(input.masteryDelta)) {
    if (!validToothCodes.has(code)) return "That tooth code is not recognized.";
    if (
      !entry ||
      typeof entry !== "object" ||
      !isBoundedInteger(entry.correct, 0, 200) ||
      !isBoundedInteger(entry.attempts, 1, 200) ||
      entry.correct > entry.attempts
    ) {
      return "That mastery update is not valid.";
    }
    masteryCorrect += entry.correct;
    masteryAttempts += entry.attempts;
  }

  if (masteryCorrect !== input.correct || masteryAttempts !== input.attempts) {
    return "That round summary does not match its answers.";
  }
  return null;
}

export async function saveGameRound(input: GameRoundResult): Promise<SaveGameRoundResult> {
  const validationError = validateRound(input);
  if (validationError) return { ok: false, error: validationError };

  const { profile, userId } = await getSessionProfile();
  if (!profile || !userId || profile.id !== userId || profile.status !== "approved") {
    return { ok: false, error: "Your approved Fourth Canal session is required to save." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("record_game_round", {
      p_round_id: input.roundId,
      p_game_id: input.gameId,
      p_score: input.score,
      p_best_streak: input.bestStreak,
      p_correct: input.correct,
      p_attempts: input.attempts,
      p_mastery_delta: input.masteryDelta,
    });

  if (error || !data) {
    return { ok: false, error: "Progress could not be saved yet. Your round is ready to retry." };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") {
    return { ok: false, error: "Progress could not be confirmed yet. Your round is ready to retry." };
  }

  revalidatePath("/games");
  revalidatePath("/games/tooth-quest");
  return { ok: true, progress: progressFromRow(row as Record<string, unknown>) };
}
