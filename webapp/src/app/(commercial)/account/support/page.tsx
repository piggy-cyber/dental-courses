import type { Metadata } from "next";
import { CommercialAccount } from "@/components/commercial/CommercialAccount";

export const metadata: Metadata = { title: "Account Support Preview" };
export default function Page() { return <CommercialAccount view="support" />; }
