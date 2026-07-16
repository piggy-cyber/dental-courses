import type { Metadata } from "next";
import { getSessionProfile } from "@/lib/access";
import { GameShell } from "@/components/games/GameShell";

export const metadata: Metadata = {
  title: "Study Games",
  description: "Fast, visual dental study games for Fourth Canal students.",
};

export default async function GamesLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getSessionProfile();
  const displayName = profile
    ? profile.name ?? profile.username ?? profile.email.split("@")[0] ?? "Student"
    : null;

  return (
    <GameShell
      displayName={displayName}
      signedIn={Boolean(profile)}
      hasD1Access={profile?.status === "approved"}
    >
      {children}
    </GameShell>
  );
}
