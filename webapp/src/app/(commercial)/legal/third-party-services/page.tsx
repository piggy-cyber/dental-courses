import type { Metadata } from "next";
import { CommercialLegalPage } from "@/components/commercial/CommercialLegalPage";

export const metadata: Metadata = { title: "Draft Third-Party Services Policy" };
export default function Page() { return <CommercialLegalPage kind="third-party-services" />; }
