import type { Metadata } from "next";
import { CommercialShell } from "@/components/commercial/CommercialShell";
import { DownloadPage } from "@/components/commercial/CommercialPages";

export const metadata: Metadata = { title: "Private Beta Downloads", description: "Controlled Fourth Canal installation access for approved private-beta testers." };
export default function Page() { return <CommercialShell><DownloadPage /></CommercialShell>; }
