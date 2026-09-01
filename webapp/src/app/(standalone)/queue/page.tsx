import type { Metadata } from "next";
import { QueueHome } from "@/components/queue/QueueHome";
import { getQueueProfile } from "@/lib/queue-master-server";

export const metadata: Metadata = {
  title: { absolute: "QueueMaster" },
  description: "The quiet, fair, and organized way to manage student questions and classroom help queues.",
  robots: "noindex, nofollow, noarchive",
};

export default async function QueueHomePage() {
  const profile = await getQueueProfile();
  return <QueueHome signedIn={Boolean(profile)} />;
}
