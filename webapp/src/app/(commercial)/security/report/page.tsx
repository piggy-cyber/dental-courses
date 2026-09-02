import type { Metadata } from "next";
import { CommercialShell } from "@/components/commercial/CommercialShell";
import { Notice, PageHero, styles } from "@/components/commercial/CommercialPrimitives";
import { PrototypeSecurityReport } from "@/components/commercial/PrototypeSecurityReport";

export const metadata: Metadata = { title: "Report a Security Issue", description: "Preview the Fourth Canal responsible security-reporting flow.", robots: { index: false, follow: false } };
export default function Page() {
  return <CommercialShell><PageHero title="Report a security issue." description="Use synthetic details to test the reporting form. This prototype does not transmit or save the entry." actions={false} status="Draft reporting process. Review required before launch." /><section className={styles.narrowSection}><Notice warning>A security-report endpoint and handling procedure must be approved before this form becomes live.</Notice><PrototypeSecurityReport /></section></CommercialShell>;
}
