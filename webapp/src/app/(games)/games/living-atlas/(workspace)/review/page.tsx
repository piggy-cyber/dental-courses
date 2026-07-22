import { redirect } from "next/navigation";
import { LIVING_ATLAS_OMAR_DERIVED_PILOT_BANK_ID } from "@/lib/living-atlas/server/course-catalog";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Living Atlas — Founder Review Lab",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function LivingAtlasFounderReviewPage() {
  redirect(`/games/living-atlas/review/${LIVING_ATLAS_OMAR_DERIVED_PILOT_BANK_ID}`);
}
