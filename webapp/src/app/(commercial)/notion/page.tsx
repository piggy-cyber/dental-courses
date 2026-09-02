import type { Metadata } from "next";
import { CommercialShell } from "@/components/commercial/CommercialShell";
import { NotionPage } from "@/components/commercial/CommercialPages";

export const metadata: Metadata = { title: "Transcript Library for Notion", description: "Keep the permanent transcript library in a supported database inside your own Notion workspace." };
export default function Page() { return <CommercialShell><NotionPage /></CommercialShell>; }
