import type { Metadata } from "next";
import { QueueTerms } from "@/components/queue/QueueInformation";
import { getQueueProfile } from "@/lib/queue-master-server";
export const metadata: Metadata = {
  title: { absolute: "Terms · QueueMaster" },
  description: "Terms for the QueueMaster pilot operated by Fourth Canal.",
  alternates: { canonical: "/queue/terms" },
  robots: { index: true, follow: true },
};
export default async function Page() { return <QueueTerms signedIn={Boolean(await getQueueProfile())} />; }
