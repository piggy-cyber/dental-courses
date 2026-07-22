import type { Metadata } from "next";
import { GvBlackSorterGame } from "@/components/games/GvBlackSorterGame";
import { getOptionalSessionProfile } from "@/lib/access";
import { getGameProgress } from "@/lib/games/progress";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "G.V. Black Classification Sorter",
  description: "A course-verified rapid-fire sorter for G.V. Black Classes I through VI.",
};

export default async function GvBlackSorterPage() {
  const { profile, userId } = await getOptionalSessionProfile();
  const canSaveProgress = Boolean(
    profile && userId && profile.id === userId,
  );
  const progress = canSaveProgress && userId
    ? await getGameProgress(userId, "gv-black-sorter")
    : null;
  return <GvBlackSorterGame initialProgress={progress} canSaveProgress={canSaveProgress} />;
}
