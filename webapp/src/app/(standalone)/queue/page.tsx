import type { Metadata } from "next";
import { QueueHome } from "@/components/queue/QueueHome";
import { getQueueProfile } from "@/lib/queue-master-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "QueueMaster by Fourth Canal" },
  description: "A quiet, fair, and organized way to manage classroom questions, office hours, and help queues.",
  alternates: { canonical: "/queue" },
  robots: { index: true, follow: true },
};

export default async function QueueMasterHomePage() {
  const profile = await getQueueProfile();
  return <QueueHome signedIn={Boolean(profile)} />;
}
