import { notFound } from "next/navigation";
import { LivingAtlasResultsView } from "@/components/games/LivingAtlasResults";
import { getLivingAtlasResults } from "@/app/(games)/games/living-atlas/actions";

export const dynamic = "force-dynamic";

export default async function LivingAtlasResultsPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const result = await getLivingAtlasResults(runId);
  if (!result.ok) notFound();
  return <LivingAtlasResultsView results={result.value} />;
}
