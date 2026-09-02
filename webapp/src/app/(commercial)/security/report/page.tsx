import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { CommercialShell } from "@/components/commercial/CommercialShell";
import { Notice, PageHero, styles } from "@/components/commercial/CommercialPrimitives";
import { PrototypeSecurityReport } from "@/components/commercial/PrototypeSecurityReport";

export const metadata: Metadata = { title: "Report a Security Issue", description: "Preview the Fourth Canal responsible security-reporting flow.", robots: { index: false, follow: false } };
export default function Page() {
  return <CommercialShell><PageHero eyebrow="Draft placeholder · responsible disclosure" title="Report a security issue." description="Use synthetic details to preview the reporting experience. This prototype does not transmit or save the form." actions={false} /><section className={styles.narrowSection}><Notice warning><AlertTriangle aria-hidden="true" /><span>A reviewed security-report endpoint and handling procedure must be approved before this form becomes live.</span></Notice><PrototypeSecurityReport /></section></CommercialShell>;
}
