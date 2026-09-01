import type { Metadata } from "next";
import { HowQueueMasterWorks } from "@/components/queue/QueueInformation";
import { getQueueProfile } from "@/lib/queue-master-server";
export const metadata: Metadata = { title: { absolute: "How It Works · QueueMaster" }, robots: "noindex, nofollow, noarchive" };
export default async function Page() { return <HowQueueMasterWorks signedIn={Boolean(await getQueueProfile())} />; }
