import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LivingAtlasShell } from "@/components/games/LivingAtlasShell";
import { getSessionProfile } from "@/lib/access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false, noarchive: true },
};

export default async function LivingAtlasWorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { profile, userId } = await getSessionProfile().catch(() => ({
    profile: null,
    userId: null,
  }));
  const hasUsableAccount = Boolean(userId && profile?.status !== "revoked");
  if (!hasUsableAccount) redirect("/games/living-atlas/access");
  return <LivingAtlasShell>{children}</LivingAtlasShell>;
}
