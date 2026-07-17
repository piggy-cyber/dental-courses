import type { Metadata } from "next";
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
  const canSaveProgress = Boolean(
    profile && userId && profile.id === userId,
  );
  const progress = canSaveProgress && userId
    ? await getGameProgress(userId, "root-canal-match")
    : null;
  return <RootCanalMatchGame initialProgress={progress} canSaveProgress={canSaveProgress} />;
}
