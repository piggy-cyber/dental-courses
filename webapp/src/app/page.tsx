import type { Metadata } from "next";
import { CommercialHome } from "@/components/commercial/CommercialHome";

export const metadata: Metadata = {
  title: { absolute: "Fourth Canal — Local-first transcript workflow" },
  description: "Capture authorized Echo360 and Zoom recording materials in Chrome, verify them on Mac, and keep transcripts in your own Notion workspace.",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

export default function FourthCanalHomePage() {
  return <CommercialHome />;
}
