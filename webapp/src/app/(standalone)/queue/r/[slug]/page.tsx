import { redirect } from "next/navigation";
import { findLobbyBySlug, getMembership, getQueueHome, getQueueProfile } from "@/lib/queue-master-server";

export default async function QueueLobbyRouter({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await getQueueProfile();
  if (profile) {
    await getQueueHome(profile, null);
    const lobby = await findLobbyBySlug(slug);
    const membership = await getMembership(lobby.id, profile.id);
    if (membership) redirect(`/queue/r/${slug}/admin`);
  }
  redirect(`/queue/r/${slug}/join`);
}
