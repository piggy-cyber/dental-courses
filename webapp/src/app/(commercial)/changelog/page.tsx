import type { Metadata } from "next";
import { CommercialShell } from "@/components/commercial/CommercialShell";
import { ChangelogPage } from "@/components/commercial/CommercialPages";

export const metadata: Metadata = { title: "Changelog", description: "Verified Fourth Canal private-beta and commercial-foundation milestones." };
export default function Page() { return <CommercialShell><ChangelogPage /></CommercialShell>; }
