import type { Metadata } from "next";
import { QueueGuest } from "@/components/queue/QueueGuest";

export const metadata: Metadata = {
  title: "Join Queue",
  robots: "noindex, nofollow, noarchive",
};

export default async function QueueJoinPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <QueueGuest slug={slug} />;
}
