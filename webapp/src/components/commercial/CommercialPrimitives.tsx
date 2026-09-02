import Link from "next/link";
import type { ReactNode } from "react";
import { BetaButton } from "@/components/commercial/BetaDialog";
import styles from "./CommercialSite.module.css";

export function PageHero({
  title,
  description,
  actions = true,
  status,
}: {
  title: string;
  description: string;
  actions?: boolean;
  status?: string;
}) {
  return (
    <header className={styles.pageHero}>
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
        {actions ? (
          <div className={styles.heroActions}>
            <BetaButton label="Request beta access" />
            <Link href="/compatibility" className={styles.buttonSecondary}>Check compatibility</Link>
          </div>
        ) : null}
        {status ? <p className={styles.statusLine}>{status}</p> : null}
      </div>
    </header>
  );
}

export function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className={styles.sectionHeading}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {description ? <p className={styles.sectionLead}>{description}</p> : null}
    </div>
  );
}

export function FeatureGrid({ items }: { items: Array<{ title: string; text: string }> }) {
  return (
    <div className={styles.featureGrid}>
      {items.map(({ title, text }) => (
        <article key={title} className={styles.featureCard}>
          <h3>{title}</h3>
          <p>{text}</p>
        </article>
      ))}
    </div>
  );
}

export function CheckList({ items, negative = false }: { items: string[]; negative?: boolean }) {
  return (
    <ul className={`${styles.checkList} ${negative ? styles.negative : ""}`}>
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}

export function CtaBand({ title, description }: { title: string; description: string }) {
  return (
    <section className={styles.ctaBand}>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
        <BetaButton label="Request beta access" />
      </div>
    </section>
  );
}

export function Notice({ children, warning = false }: { children: ReactNode; warning?: boolean }) {
  return <div className={`${styles.notice} ${warning ? styles.warning : ""}`}>{children}</div>;
}

export { styles };
