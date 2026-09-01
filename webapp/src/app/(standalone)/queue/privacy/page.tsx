import type { Metadata } from "next";
import { QueuePrivacy } from "@/components/queue/QueueInformation";
import { getQueueProfile } from "@/lib/queue-master-server";
export const metadata: Metadata = { title: { absolute: "Privacy · QueueMaster" }, robots: "noindex, nofollow, noarchive" };
export default async function Page() { return <QueuePrivacy signedIn={Boolean(await getQueueProfile())} />; }
