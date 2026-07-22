import { notFound } from "next/navigation";
import { getLivingAtlasFounderReview } from "@/app/(games)/games/living-atlas/actions";
import { LivingAtlasFounderReviewView } from "@/components/games/LivingAtlasFounderReview";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Living Atlas — Founder Review Lab",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function LivingAtlasFounderReviewBankPage({ params }: { params: Promise<{ bankId: string }> }) {
  const { bankId } = await params;
  const review = await getLivingAtlasFounderReview(bankId);
  if (!review.ok) notFound();
  return <LivingAtlasFounderReviewView review={review.value} />;
}
