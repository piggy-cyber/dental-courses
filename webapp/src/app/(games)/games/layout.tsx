import type { Metadata } from "next";
import { GameShell } from "@/components/games/GameShell";

export const metadata: Metadata = {
  title: "Study Games",
  description: "Fast, visual dental study games for Fourth Canal students.",
};

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return <GameShell>{children}</GameShell>;
}
