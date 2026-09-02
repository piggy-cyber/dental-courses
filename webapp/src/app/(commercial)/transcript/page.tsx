import type { Metadata } from "next";
import { CommercialShell } from "@/components/commercial/CommercialShell";
import { TranscriptPage } from "@/components/commercial/CommercialPages";

export const metadata: Metadata = { title: "Fourth Canal Transcript for Mac", description: "Local scheduling, validation, Notion organization, and recoverable transcript workflows." };
export default function Page() { return <CommercialShell><TranscriptPage /></CommercialShell>; }
