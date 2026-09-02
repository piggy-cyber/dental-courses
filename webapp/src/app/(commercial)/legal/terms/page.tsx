import type { Metadata } from "next";
import { CommercialLegalPage } from "@/components/commercial/CommercialLegalPage";

export const metadata: Metadata = { title: "Draft Terms of Service" };
export default function Page() { return <CommercialLegalPage kind="terms" />; }
