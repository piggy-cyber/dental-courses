import type { Metadata } from "next";
import { ContactAreaGame } from "@/components/games/ContactAreaGame";
import { getOptionalSessionProfile } from "@/lib/access";
import { getGameProgress } from "@/lib/games/progress";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact Area",
  description: "A morphology-aware contact-area trainer for dental anatomy.",
};

export default async function ContactAreaPage() {
  const { profile, userId } = await getOptionalSessionProfile();
  const canSaveProgress = Boolean(
    profile && userId && profile.id === userId,
  );
  const progress = canSaveProgress && userId
    ? await getGameProgress(userId, "contact-area")
    : null;
  return <ContactAreaGame initialProgress={progress} canSaveProgress={canSaveProgress} />;
}
