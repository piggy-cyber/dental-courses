import type { Metadata } from "next";
import { LivingAtlasCatalogue } from "@/components/games/LivingAtlasCatalogue";
import { getOptionalSessionProfile } from "@/lib/access";
import { getLivingAtlasPublicCatalogue } from "@/lib/living-atlas/server/course-catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Living Atlas — Dental Recall and Practice",
  description: "A Fourth Canal learning workspace combining fast recall, reviewed practice questions, repair queues, and visual progress.",
  alternates: { canonical: "/games/living-atlas" },
  openGraph: {
    type: "website",
    url: "/games/living-atlas",
    siteName: "Fourth Canal",
    title: "Living Atlas — Dental Recall and Practice",
    description: "Browse organized dental study decks, then sign in to save recall practice, repair queues, and visual progress.",
    images: [{
      url: "/brand/living-atlas-social-preview-v1.png",
      width: 1730,
      height: 909,
      alt: "Living Atlas white Holland Lop companion beside a futuristic dental study console",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Living Atlas — Dental Recall and Practice",
    description: "Browse organized dental study decks, then sign in to save recall practice, repair queues, and visual progress.",
    images: ["/brand/living-atlas-social-preview-v1.png"],
  },
};

export default async function LivingAtlasPage() {
  const { profile, userId } = await getOptionalSessionProfile();
  const catalogue = await getLivingAtlasPublicCatalogue();
  return <LivingAtlasCatalogue courses={catalogue} signedIn={Boolean(userId && profile?.status !== "revoked")} />;
}
