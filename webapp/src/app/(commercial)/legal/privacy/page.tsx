import type { Metadata } from "next";
import { CommercialLegalPage } from "@/components/commercial/CommercialLegalPage";

export const metadata: Metadata = { title: "Draft Privacy Policy" };
export default function Page() { return <CommercialLegalPage kind="privacy" />; }
