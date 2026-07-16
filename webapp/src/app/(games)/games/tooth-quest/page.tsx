import type { Metadata } from "next";
import { redirect } from "next/navigation";
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
  if (!profile || !userId || profile.id !== userId || profile.status !== "approved") {
    redirect("/");
  }

  const progress = await getGameProgress(userId, "tooth-quest");
  return <ToothQuestGame initialProgress={progress} />;
}
