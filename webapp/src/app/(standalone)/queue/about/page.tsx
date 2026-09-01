import type { Metadata } from "next";
import { QueueAbout } from "@/components/queue/QueueInformation";
import { getQueueProfile } from "@/lib/queue-master-server";

export const metadata: Metadata = {
  title: { absolute: "About · QueueMaster" },
  description: "About QueueMaster, an independent Fourth Canal queue project for classrooms and shared spaces.",
  alternates: { canonical: "/queue/about" },
  robots: { index: true, follow: true },
};

export default async function QueueAboutPage() {
  return <QueueAbout signedIn={Boolean(await getQueueProfile())} />;
}
