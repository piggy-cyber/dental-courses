import type { Metadata } from "next";
import { QueueInstructions } from "@/components/queue/QueueInformation";
import { getQueueProfile } from "@/lib/queue-master-server";

export const metadata: Metadata = {
  title: { absolute: "Instructions · QueueMaster" },
  description: "Brief instructions for QueueMaster lobby owners, guests, staff, and classroom displays.",
  alternates: { canonical: "/queue/instructions" },
  robots: { index: true, follow: true },
};

export default async function QueueInstructionsPage() {
  return <QueueInstructions signedIn={Boolean(await getQueueProfile())} />;
}
