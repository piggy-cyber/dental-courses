import type { Metadata } from "next";
import { EruptionTimelineGame } from "@/components/games/EruptionTimelineGame";
import { getSessionProfile } from "@/lib/access";
import { getGameProgress } from "@/lib/games/progress";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Eruption Timeline",
  description: "An overlap-aware tooth eruption sequence game for primary and permanent dentitions.",
};

export default async function EruptionTimelinePage() {
  const { profile, userId } = await getSessionProfile();
  const canSaveProgress = Boolean(
    profile && userId && profile.id === userId,
  );
  const progress = canSaveProgress && userId
    ? await getGameProgress(userId, "eruption-timeline")
    : null;
  return <EruptionTimelineGame initialProgress={progress} canSaveProgress={canSaveProgress} />;
}
