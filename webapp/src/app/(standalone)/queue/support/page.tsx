import type { Metadata } from "next";
import { QueueSupport } from "@/components/queue/QueueInformation";
import { getQueueProfile } from "@/lib/queue-master-server";

export const metadata: Metadata = {
  title: { absolute: "Support · QueueMaster" },
  description: "Contact Fourth Canal about QueueMaster access, accessibility, privacy, copyright, security, or site concerns.",
  alternates: { canonical: "/queue/support" },
  robots: { index: false, follow: true, noarchive: true },
};

export default async function QueueSupportPage() {
  return <QueueSupport signedIn={Boolean(await getQueueProfile())} />;
}
