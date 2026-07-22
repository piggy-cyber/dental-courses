import type { Metadata } from "next";
import { LivingAtlasCatalogue } from "@/components/games/LivingAtlasCatalogue";
import { getOptionalSessionProfile } from "@/lib/access";
import { getLivingAtlasPublicCatalogue } from "@/lib/living-atlas/server/course-catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Living Atlas — Dental Recall and Practice",
  description: "A Fourth Canal learning workspace combining fast recall, reviewed practice questions, repair queues, and visual progress.",
  alternates: { canonical: "/games/living-atlas" },
};

export default async function LivingAtlasPage() {
  const { profile, userId } = await getOptionalSessionProfile();
  const catalogue = await getLivingAtlasPublicCatalogue();
  return <LivingAtlasCatalogue courses={catalogue} signedIn={Boolean(userId && profile?.status !== "revoked")} />;
}
