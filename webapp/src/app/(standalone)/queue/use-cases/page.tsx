import type { Metadata } from "next";
import { QueueUseCases } from "@/components/queue/QueueHome";
import { getQueueProfile } from "@/lib/queue-master-server";
export const metadata: Metadata = { title: { absolute: "Use Cases · QueueMaster" }, robots: "noindex, nofollow, noarchive" };
export default async function Page() { return <QueueUseCases signedIn={Boolean(await getQueueProfile())} />; }
