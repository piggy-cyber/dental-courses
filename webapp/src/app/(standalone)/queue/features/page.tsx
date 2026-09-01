import type { Metadata } from "next";
import { QueueFeatures } from "@/components/queue/QueueHome";
import { getQueueProfile } from "@/lib/queue-master-server";
export const metadata: Metadata = { title: { absolute: "Features · QueueMaster" }, robots: "noindex, nofollow, noarchive" };
export default async function Page() { return <QueueFeatures signedIn={Boolean(await getQueueProfile())} />; }
