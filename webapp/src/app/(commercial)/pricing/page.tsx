import type { Metadata } from "next";
import { CommercialShell } from "@/components/commercial/CommercialShell";
import { PricingPage } from "@/components/commercial/CommercialPages";

export const metadata: Metadata = { title: "Planned Pricing", description: "Planned Fourth Canal account pricing without transcript-minute metering." };
export default function Page() { return <CommercialShell><PricingPage /></CommercialShell>; }
