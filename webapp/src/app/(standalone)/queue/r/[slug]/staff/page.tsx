import type { Metadata } from "next";
import { QueueStaff } from "@/components/queue/QueueStaff";
export const metadata: Metadata = { title: { absolute: "Staff Join · QueueMaster" }, robots: "noindex, nofollow, noarchive" };
export default async function Page({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; return <QueueStaff slug={slug} />; }
