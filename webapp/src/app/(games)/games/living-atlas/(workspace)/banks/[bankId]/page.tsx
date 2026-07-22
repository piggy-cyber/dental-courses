import { notFound, redirect } from "next/navigation";
import { LivingAtlasBankBuilder } from "@/components/games/LivingAtlasBankBuilder";
import { getLivingAtlasBank } from "@/app/(games)/games/living-atlas/actions";

export const dynamic = "force-dynamic";

export default async function LivingAtlasBankPage({ params, searchParams }: { params: Promise<{ bankId: string }>; searchParams: Promise<{ queue?: string; topic?: string }> }) {
  const { bankId } = await params;
  const query = await searchParams;
  const result = await getLivingAtlasBank(bankId);
  if (!result.ok) notFound();
  const initialQueue = query.queue === "echoes" || query.queue === "flags" ? query.queue : undefined;
  if (result.value.activeRecallSession) {
    redirect(`/games/living-atlas/recall/${result.value.activeRecallSession.id}`);
  }
  if (result.value.activeRun) {
    const queue = initialQueue ? `?queue=${initialQueue}` : "";
    redirect(`/games/living-atlas/runs/${result.value.activeRun.id}${queue}`);
  }
  return <LivingAtlasBankBuilder bank={result.value} initialQueue={initialQueue} initialTopic={query.topic} />;
}
