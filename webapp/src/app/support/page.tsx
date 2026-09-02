import type { Metadata } from "next";
import { CommercialShell } from "@/components/commercial/CommercialShell";
import { SectionHeading, styles } from "@/components/commercial/CommercialPrimitives";
import { SupportIntro } from "@/components/commercial/CommercialPages";
import { SupportForm } from "@/components/SupportForm";

export const metadata: Metadata = {
  title: "Support",
  description: "Contact Fourth Canal about site access, accessibility, content, privacy, copyright, or security.",
  alternates: { canonical: "/support" },
};

export default function SupportPage() {
  return (
    <CommercialShell>
      <SupportIntro />
      <section className={styles.narrowSection}>
        <SectionHeading eyebrow="Contact support" title="Tell us what needs attention." description="Use the existing reviewed support form for site, account, accessibility, content, privacy, copyright, or security concerns. Do not include patient information, grades, passwords, transcript content, provider links, or other sensitive records." />
        <SupportForm />
        <p className={styles.compatibilityLine}>Standard response target: within two business days. Fourth Canal does not promise emergency service or resolution before an academic or business deadline.</p>
      </section>
    </CommercialShell>
  );
}
