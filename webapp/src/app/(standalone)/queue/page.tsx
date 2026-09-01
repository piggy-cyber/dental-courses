import type { Metadata } from "next";
import { cookies } from "next/headers";
import { QueueHome } from "@/components/queue/QueueHome";
import { getQueueHome, getQueueProfile, QUEUE_GUEST_COOKIE } from "@/lib/queue-master-server";

export const metadata: Metadata = {
  title: "QueueMaster Pilot",
  description: "Real-time physical-space queues by Fourth Canal.",
  robots: "noindex, nofollow, noarchive",
};

export default async function QueueHomePage() {
  const profile = await getQueueProfile();
  const token = (await cookies()).get(QUEUE_GUEST_COOKIE)?.value ?? null;
  const { lobbies, guestLobby } = await getQueueHome(profile, token);
  return <QueueHome initialLobbies={lobbies} guestLobby={guestLobby} signedIn={Boolean(profile)} />;
}
