"use server";

import { revalidatePath } from "next/cache";
import eruptionCatalogJson from "@/data/games/eruption-data.json";
import rootCanalCatalogJson from "@/data/games/root-canal-match-data.json";
import toothCatalogJson from "@/data/games/tooth-data.json";
import { getSessionProfile } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import {
  GAME_IDS,
  progressFromRow,
  type GameId,
  type GameRoundResult,
  type SaveGameRoundResult,
} from "@/lib/games/types";
import {
  isValidRootCanalRound,
  type RootCanalMatchCatalog,
} from "@/lib/games/root-canal-match-types";
import type { ToothCatalog } from "@/lib/games/tooth-types";
import type { EruptionCatalog } from "@/lib/games/eruption-types";

const toothCatalog = toothCatalogJson as ToothCatalog;
const rootCanalCatalog = rootCanalCatalogJson as RootCanalMatchCatalog;
const validToothCodes = new Set<string>(
  toothCatalog.teeth.flatMap((tooth) => [tooth.code, tooth.supernumeraryCode]),
);
const CONTACT_MASTERY_PATTERN = /^contact-area\|(maxillary|mandibular)\|(anterior|posterior)\|(mesial|distal)\|(incisal-occlusal|middle|cervical|junction|facial|facial-aspect-middle|facial-to-central-groove|lingual|relationship|height|terminal)$/;
const eruptionCatalog = eruptionCatalogJson as EruptionCatalog;
const validEruptionCodes = new Set(
  eruptionCatalog.records
    .filter((record) => record.evidenceStatus === "course-verified")
    .map((record) => record.id),
);
const validRootCanalRecordIds = new Set<string>(
  rootCanalCatalog.records
    .filter((record) => record.evidenceStatus === "course-verified")
    .map((record) => record.id),
);
const rootCanalRecordDifficulties = new Map(
  rootCanalCatalog.records
    .filter((record) => record.evidenceStatus === "course-verified")
    .map((record) => [record.id, record.difficulty]),
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
  if (!isBoundedInteger(input.score, 0, 26_000)) return "That score is not valid.";
  if (!isBoundedInteger(input.correct, 0, 200)) return "That result is not valid.";
  if (!isBoundedInteger(input.attempts, 1, 100) || input.correct > input.attempts) {
    return "That result is not valid.";
  }
  if (input.score > input.correct * 260) return "That score is not valid.";
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
    const validMasteryCode =
      input.gameId === "tooth-quest"
        ? validToothCodes.has(code)
        : input.gameId === "contact-area"
          ? CONTACT_MASTERY_PATTERN.test(code)
          : input.gameId === "eruption-timeline"
            ? validEruptionCodes.has(code)
            : validRootCanalRecordIds.has(code);
    if (!validMasteryCode) return "That mastery item is not recognized.";
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
  if (input.gameId === "root-canal-match") {
    const masteryEntries = Object.entries(input.masteryDelta).map(([recordId, entry]) => ({
      ...entry,
      difficulty: rootCanalRecordDifficulties.get(recordId),
    }));
    if (!isValidRootCanalRound({ ...input, masteryEntries })) {
      return "That Root Canal Match result is not a possible completed round.";
    }
  }
  return null;
}

export async function saveGameRound(input: GameRoundResult): Promise<SaveGameRoundResult> {
  const validationError = validateRound(input);
  if (validationError) return { ok: false, error: validationError };

  const { profile, userId } = await getSessionProfile();
  if (!profile || !userId || profile.id !== userId) {
    return { ok: false, error: "Sign in to save this round to your Fourth Canal account." };
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
  revalidatePath(`/games/${input.gameId}`);
  return { ok: true, progress: progressFromRow(row as Record<string, unknown>) };
}
