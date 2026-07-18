import type { Metadata } from "next";
import { ToothComparisonDuel } from "@/components/games/ToothComparisonDuel";
import { getOptionalSessionProfile } from "@/lib/access";
import { getGameProgress } from "@/lib/games/progress";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tooth Comparison Duel",
  description: "Compare look-alike teeth by crown form, lingual anatomy, grooves, roots, and clinical identification clues.",
};

export default async function ToothComparisonDuelPage() {
  const { profile, userId } = await getOptionalSessionProfile();
  const canSaveProgress = Boolean(
    profile && userId && profile.id === userId,
  );
  const progress = canSaveProgress && userId
    ? await getGameProgress(userId, "tooth-comparison-duel")
    : null;
  return <ToothComparisonDuel initialProgress={progress} canSaveProgress={canSaveProgress} />;
}
