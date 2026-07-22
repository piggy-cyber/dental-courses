import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LivingAtlasShell } from "@/components/games/LivingAtlasShell";
import { getSessionProfile } from "@/lib/access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false, noarchive: true },
};

export default async function LivingAtlasWorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { profile, userId } = await getSessionProfile();
  const isFounder = Boolean(
    userId &&
    profile &&
    profile.id === userId &&
    profile.role === "owner" &&
    profile.status === "approved",
  );

  if (!isFounder) redirect("/games/living-atlas?access=founder");
  return <LivingAtlasShell>{children}</LivingAtlasShell>;
}
