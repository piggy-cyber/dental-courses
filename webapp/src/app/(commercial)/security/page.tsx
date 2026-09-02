import type { Metadata } from "next";
import { CommercialShell } from "@/components/commercial/CommercialShell";
import { SecurityPage } from "@/components/commercial/CommercialPages";

export const metadata: Metadata = { title: "Security and Privacy", description: "How Fourth Canal separates browser, Mac, Notion, account, and analytics data." };
export default function Page() { return <CommercialShell><SecurityPage /></CommercialShell>; }
