import { redirect } from "next/navigation";
import { LIVING_ATLAS_OMAR_DERIVED_PILOT_BANK_ID } from "@/lib/living-atlas/server/course-catalog";
import { getOptionalSessionProfile } from "@/lib/access";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Living Atlas — Founder Review Lab",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function LivingAtlasFounderReviewPage() {
  const { profile, userId } = await getOptionalSessionProfile();
  if (!userId || profile?.id !== userId || profile.role !== "owner" || profile.status !== "approved") redirect("/games/living-atlas");
  redirect(`/games/living-atlas/review/${LIVING_ATLAS_OMAR_DERIVED_PILOT_BANK_ID}`);
}
