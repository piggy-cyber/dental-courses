import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RootCanalMatchGame } from "@/components/games/RootCanalMatchGame";
import { getSessionProfile } from "@/lib/access";
import { getGameProgress } from "@/lib/games/progress";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Root Canal Match",
  description: "A course-verified root and canal anatomy matching game for Fourth Canal students.",
};

export default async function RootCanalMatchPage() {
  const { profile, userId } = await getSessionProfile();
  if (!profile || !userId || profile.id !== userId || profile.status !== "approved") {
    redirect("/");
  }

  const progress = await getGameProgress(userId, "root-canal-match");
  return <RootCanalMatchGame initialProgress={progress} />;
}
