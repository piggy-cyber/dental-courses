import "server-only";

import { createClient } from "@/lib/supabase/server";
import { progressFromRow, type GameId, type GameProgress } from "@/lib/games/types";

const PROGRESS_COLUMNS =
  "game_id, best_score, best_streak, total_correct, total_attempts, rounds_played, mastery, last_played_at";

export async function getGameProgress(
  profileId: string,
  gameId: GameId,
): Promise<GameProgress | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("game_progress")
    .select(PROGRESS_COLUMNS)
    .eq("profile_id", profileId)
    .eq("game_id", gameId)
    .maybeSingle();

  if (error || !data) return null;
  return progressFromRow(data as Record<string, unknown>);
}

export { PROGRESS_COLUMNS };
