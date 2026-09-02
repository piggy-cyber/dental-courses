import type { Metadata } from "next";
import { CommercialShell } from "@/components/commercial/CommercialShell";
import { VisiLearnPage } from "@/components/commercial/CommercialPages";

export const metadata: Metadata = { title: "VisiLearn", description: "Authorized local transcript and source-media capture on supported Chrome recording pages." };
export default function Page() { return <CommercialShell><VisiLearnPage /></CommercialShell>; }
