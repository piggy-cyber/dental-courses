import type { Metadata } from "next";
import { cookies } from "next/headers";
import { QueueDashboard } from "@/components/queue/QueueDashboard";
import { getQueueHome, getQueueProfile, QUEUE_GUEST_COOKIE } from "@/lib/queue-master-server";

export const metadata: Metadata = { title: { absolute: "Dashboard · QueueMaster" }, robots: "noindex, nofollow, noarchive" };

export default async function QueueDashboardPage() {
  const profile = await getQueueProfile();
  const token = (await cookies()).get(QUEUE_GUEST_COOKIE)?.value ?? null;
  const { lobbies, guestLobby, promotionRequests } = await getQueueHome(profile, token);
  return <QueueDashboard initialLobbies={lobbies} guestLobby={guestLobby} promotionRequests={promotionRequests} signedIn={Boolean(profile)} />;
}
