import type { Metadata } from "next";
import { CommercialLegalPage } from "@/components/commercial/CommercialLegalPage";

export const metadata: Metadata = { title: "Draft Open Source Notices" };
export default function Page() { return <CommercialLegalPage kind="open-source" />; }
