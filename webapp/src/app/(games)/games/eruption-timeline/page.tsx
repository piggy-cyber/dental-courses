import type { Metadata } from "next";
import { redirect } from "next/navigation";
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
  if (!profile || !userId || profile.id !== userId || profile.status !== "approved") {
    redirect("/");
  }

  const progress = await getGameProgress(userId, "eruption-timeline");
  return <EruptionTimelineGame initialProgress={progress} />;
}
