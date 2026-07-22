import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LivingAtlasPerformanceView } from "@/components/games/LivingAtlasPerformance";
import { getSessionProfile } from "@/lib/access";
import { getLivingAtlasPerformance } from "@/app/(games)/games/living-atlas/actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Living Atlas — Field Companion",
  description: "Private founder review of Living Atlas progress and collectibles.",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function LivingAtlasPerformancePage() {
  const { profile, userId } = await getSessionProfile();
  if (!userId || !profile) return null;
  const result = await getLivingAtlasPerformance();
  if (!result.ok) notFound();
  return <LivingAtlasPerformanceView performance={result.value} />;
}
