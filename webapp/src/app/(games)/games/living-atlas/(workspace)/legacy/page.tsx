import { notFound, redirect } from "next/navigation";
import { getLivingAtlasLegacySessions } from "@/app/(games)/games/living-atlas/actions";
import { LivingAtlasLegacy } from "@/components/games/LivingAtlasLegacy";
import { getOptionalSessionProfile } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function LivingAtlasLegacyPage() {
  const { profile, userId } = await getOptionalSessionProfile();
  if (!userId || profile?.id !== userId || profile.role !== "owner" || profile.status !== "approved") redirect("/games/living-atlas");
  const result = await getLivingAtlasLegacySessions();
  if (!result.ok) notFound();
  return <LivingAtlasLegacy sessions={result.value} />;
}
