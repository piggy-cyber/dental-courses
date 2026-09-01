import type { Metadata } from "next";
import { QueuePrivacy } from "@/components/queue/QueueInformation";
import { getQueueProfile } from "@/lib/queue-master-server";
export const metadata: Metadata = {
  title: { absolute: "Privacy · QueueMaster" },
  description: "How QueueMaster collects, uses, protects, and retains lobby, staff, guest, and support information.",
  alternates: { canonical: "/queue/privacy" },
  robots: { index: true, follow: true },
};
export default async function Page() { return <QueuePrivacy signedIn={Boolean(await getQueueProfile())} />; }
