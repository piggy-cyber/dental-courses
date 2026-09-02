import type { Metadata } from "next";
import { CommercialHome } from "@/components/commercial/CommercialHome";

export const metadata: Metadata = {
  title: { absolute: "Fourth Canal: Recording transcripts for Notion" },
  description: "Capture authorized recording files in Chrome, verify them on your Mac, and store transcripts in your own Notion workspace.",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

export default function FourthCanalHomePage() {
  return <CommercialHome />;
}
