import type { Metadata } from "next";
import { CommercialShell } from "@/components/commercial/CommercialShell";
import { CompatibilityPage } from "@/components/commercial/CommercialPages";

export const metadata: Metadata = { title: "Compatibility", description: "The planned Fourth Canal launch support matrix and explicit limitations." };
export default function Page() { return <CommercialShell><CompatibilityPage /></CommercialShell>; }
