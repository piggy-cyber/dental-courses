import type { Metadata } from "next";
import { QueueAdmin } from "@/components/queue/QueueAdmin";

export const metadata: Metadata = {
  title: { absolute: "Queue Admin · QueueMaster" },
  robots: "noindex, nofollow, noarchive",
};

export default async function QueueAdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <QueueAdmin slug={slug} />;
}
