import Link from "next/link";
import { CheckCircle2, CircleX } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { BetaButton } from "@/components/commercial/BetaDialog";
import styles from "./CommercialSite.module.css";

export function PageHero({
  eyebrow,
  title,
  description,
  actions = true,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: boolean;
}) {
  return (
    <header className={styles.pageHero}>
      <div>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
        {actions ? (
          <div className={styles.heroActions}>
            <BetaButton />
            <Link href="/compatibility" className={styles.buttonSecondary}>Check compatibility</Link>
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className={styles.sectionHeading}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {description ? <p className={styles.sectionLead}>{description}</p> : null}
    </div>
  );
}

export function FeatureGrid({ items }: { items: Array<{ icon: LucideIcon; title: string; text: string }> }) {
  return (
    <div className={styles.featureGrid}>
      {items.map(({ icon: Icon, title, text }) => (
        <article key={title} className={styles.featureCard}>
          <Icon aria-hidden="true" />
          <h3>{title}</h3>
          <p>{text}</p>
        </article>
      ))}
    </div>
  );
}

export function CheckList({ items, negative = false }: { items: string[]; negative?: boolean }) {
  const Icon = negative ? CircleX : CheckCircle2;
  return (
    <ul className={`${styles.checkList} ${negative ? styles.negative : ""}`}>
      {items.map((item) => <li key={item}><Icon aria-hidden="true" /><span>{item}</span></li>)}
    </ul>
  );
}

export function CtaBand({ title, description }: { title: string; description: string }) {
  return (
    <section className={styles.ctaBand}>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
        <BetaButton />
      </div>
    </section>
  );
}

export function Notice({ children, warning = false }: { children: ReactNode; warning?: boolean }) {
  return <div className={`${styles.notice} ${warning ? styles.warning : ""}`}>{children}</div>;
}

export { styles };
