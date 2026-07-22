import { notFound, redirect } from "next/navigation";
import { LivingAtlasRunner } from "@/components/games/LivingAtlasRunner";
import { getLivingAtlasRun } from "@/app/(games)/games/living-atlas/actions";

export const dynamic = "force-dynamic";

export default async function LivingAtlasRunPage({ params, searchParams }: { params: Promise<{ runId: string }>; searchParams: Promise<{ queue?: string }> }) {
  const { runId } = await params;
  const query = await searchParams;
  const result = await getLivingAtlasRun(runId);
  if (!result.ok) notFound();
  if (result.value.run.status === "completed") redirect(`/games/living-atlas/runs/${runId}/results`);
  if (result.value.run.status === "abandoned") redirect(`/games/living-atlas/banks/${result.value.run.bankId}`);
  const initialQueue = query.queue === "echoes" || query.queue === "flags" ? query.queue : "all";
  return <LivingAtlasRunner initialView={result.value} initialQueue={initialQueue} />;
}
