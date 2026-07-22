import { notFound } from "next/navigation";
import { getLivingAtlasLegacySessions } from "@/app/(games)/games/living-atlas/actions";
import { LivingAtlasLegacy } from "@/components/games/LivingAtlasLegacy";

export const dynamic = "force-dynamic";

export default async function LivingAtlasLegacyPage() {
  const result = await getLivingAtlasLegacySessions();
  if (!result.ok) notFound();
  return <LivingAtlasLegacy sessions={result.value} />;
}
