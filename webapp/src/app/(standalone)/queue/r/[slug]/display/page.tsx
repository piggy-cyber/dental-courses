import type { Metadata } from "next";
import { QueueDisplay } from "@/components/queue/QueueDisplay";

export const metadata: Metadata = {
  title: { absolute: "Queue Display · QueueMaster" },
  robots: "noindex, nofollow, noarchive",
};

export default async function QueueDisplayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <QueueDisplay slug={slug} />;
}
