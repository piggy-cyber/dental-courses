import type { Metadata } from "next";
import { CommercialAccount } from "@/components/commercial/CommercialAccount";

export const metadata: Metadata = { title: "Billing and Plan Preview" };
export default function Page() { return <CommercialAccount view="billing" />; }
