import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/access";
import { GameShell } from "@/components/games/GameShell";

export const metadata: Metadata = {
  title: "Study Games",
  description: "Fast, visual dental study games for Fourth Canal students.",
};

export default async function GamesLayout({ children }: { children: React.ReactNode }) {
  const { profile, userId } = await getSessionProfile();

  if (!profile || !userId || profile.id !== userId || profile.status !== "approved") {
    redirect("/");
  }

  const displayName = profile.name ?? profile.username ?? profile.email.split("@")[0] ?? "Student";

  return <GameShell displayName={displayName}>{children}</GameShell>;
}
