import type { Metadata } from "next";
import { CommercialAccount } from "@/components/commercial/CommercialAccount";

export const metadata: Metadata = { title: "Account Downloads Preview" };
export default function Page() { return <CommercialAccount view="downloads" />; }
