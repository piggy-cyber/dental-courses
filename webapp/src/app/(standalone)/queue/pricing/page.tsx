import type { Metadata } from "next";
import { QueuePricing } from "@/components/queue/QueueHome";
import { getQueueProfile } from "@/lib/queue-master-server";
export const metadata: Metadata = { title: { absolute: "Pricing · QueueMaster" }, robots: "noindex, nofollow, noarchive" };
export default async function Page() { return <QueuePricing signedIn={Boolean(await getQueueProfile())} />; }
