import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ContactAreaGame } from "@/components/games/ContactAreaGame";
import { getSessionProfile } from "@/lib/access";
import { getGameProgress } from "@/lib/games/progress";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact Area",
  description: "A morphology-aware contact-area trainer for dental anatomy.",
};

export default async function ContactAreaPage() {
  const { profile, userId } = await getSessionProfile();
  if (!profile || !userId || profile.id !== userId || profile.status !== "approved") {
    redirect("/");
  }

  const progress = await getGameProgress(userId, "contact-area");
  return <ContactAreaGame initialProgress={progress} />;
}
