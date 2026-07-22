import { notFound, redirect } from "next/navigation";
import { getLivingAtlasRecallSession } from "@/app/(games)/games/living-atlas/actions";
import { LivingAtlasRecallRunner } from "@/components/games/LivingAtlasRecallRunner";

export const dynamic = "force-dynamic";

export default async function LivingAtlasRecallPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const result = await getLivingAtlasRecallSession(sessionId);
  if (!result.ok) notFound();
  if (result.value.session.status !== "active") redirect(`/games/living-atlas/banks/${result.value.session.bankId}`);
  return <LivingAtlasRecallRunner initialView={result.value} />;
}
