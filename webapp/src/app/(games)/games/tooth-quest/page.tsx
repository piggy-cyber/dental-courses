import type { Metadata } from "next";
import { ToothQuestGame } from "@/components/games/ToothQuestGame";
import { getSessionProfile } from "@/lib/access";
import { getGameProgress } from "@/lib/games/progress";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tooth Quest",
  description: "A visual Universal tooth numbering game for permanent and primary dentitions.",
};

export default async function ToothQuestPage() {
  const { profile, userId } = await getSessionProfile();
  const canSaveProgress = Boolean(
    profile && userId && profile.id === userId,
  );
  const progress = canSaveProgress && userId
    ? await getGameProgress(userId, "tooth-quest")
    : null;
  return <ToothQuestGame initialProgress={progress} canSaveProgress={canSaveProgress} />;
}
