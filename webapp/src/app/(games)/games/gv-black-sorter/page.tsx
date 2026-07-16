import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GvBlackSorterGame } from "@/components/games/GvBlackSorterGame";
import { getSessionProfile } from "@/lib/access";
import { getGameProgress } from "@/lib/games/progress";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "G.V. Black Classification Sorter",
  description: "A course-verified rapid-fire sorter for G.V. Black Classes I through VI.",
};

export default async function GvBlackSorterPage() {
  const { profile, userId } = await getSessionProfile();
  if (!profile || !userId || profile.id !== userId || profile.status !== "approved") {
    redirect("/");
  }

  const progress = await getGameProgress(userId, "gv-black-sorter");
  return <GvBlackSorterGame initialProgress={progress} />;
}
