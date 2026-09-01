import type { Metadata } from "next";
import { QueueTerms } from "@/components/queue/QueueInformation";
import { getQueueProfile } from "@/lib/queue-master-server";
export const metadata: Metadata = { title: { absolute: "Terms · QueueMaster" }, robots: "noindex, nofollow, noarchive" };
export default async function Page() { return <QueueTerms signedIn={Boolean(await getQueueProfile())} />; }
