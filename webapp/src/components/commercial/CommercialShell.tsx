import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMarkPublic } from "@/components/BrandMark";
import { BetaButton } from "@/components/commercial/BetaDialog";
import styles from "./CommercialSite.module.css";

const productLinks = [
  ["VisiLearn", "/visilearn"],
  ["Mac app", "/transcript"],
  ["Notion", "/notion"],
  ["Pricing", "/pricing"],
] as const;

const resourceLinks = [
  ["Compatibility", "/compatibility"],
  ["Security", "/security"],
  ["Support", "/support"],
  ["Changelog", "/changelog"],
  ["QueueMaster", "/queue"],
] as const;

const legalLinks = [
  ["Privacy", "/legal/privacy"],
  ["Terms", "/legal/terms"],
  ["EULA", "/legal/eula"],
  ["Billing", "/legal/billing"],
  ["Acceptable use", "/legal/acceptable-use"],
  ["Third-party services", "/legal/third-party-services"],
  ["Open source", "/legal/open-source"],
] as const;

const primaryLinks = [
  ["Overview", "/"],
  ...productLinks,
  ["Compatibility", "/compatibility"],
  ["Security", "/security"],
  ["Support", "/support"],
] as const;

export function CommercialShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.site}>
      <CommercialHeader />
      <main>{children}</main>
      <CommercialFooter />
    </div>
  );
}

export function CommercialHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <BrandMarkPublic className={styles.brand} />
        <span className={styles.statusLine}>Private beta</span>
        <nav className={styles.desktopNav} aria-label="Fourth Canal products">
          {primaryLinks.map(([label, href]) => <Link key={href} href={href} className={styles.navLink}>{label}</Link>)}
        </nav>
        <div className={styles.headerActions}>
          <Link href="/account" className={styles.navLink}>Account prototype</Link>
          <BetaButton label="Request access" />
        </div>
        <details className={styles.mobileMenu}>
          <summary>Menu</summary>
          <nav className={styles.mobileNav} aria-label="Mobile navigation">
            {primaryLinks.map(([label, href]) => <Link key={href} href={href} className={styles.navLink}>{label}</Link>)}
            <Link href="/account" className={styles.navLink}>Account prototype</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}

export function CommercialFooter() {
  const groups = [["Products", productLinks], ["Resources", resourceLinks], ["Legal drafts", legalLinks]] as const;
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <BrandMarkPublic />
          <p>Chrome captures the files. Your Mac verifies them. Your Notion workspace stores them.</p>
        </div>
        <div className={styles.footerGroups}>
          {groups.map(([title, links]) => (
            <section key={title}>
              <h2>{title}</h2>
              <ul>{links.map(([label, href]) => <li key={href}><Link href={href}>{label}</Link></li>)}</ul>
            </section>
          ))}
        </div>
      </div>
      <div className={styles.footerBottom}>
        <div>© 2026 Fourth Canal. Independent, student-built software. Not affiliated with or endorsed by EchoVideo, Zoom, Notion, Google, Case Western Reserve University, or any educational institution.</div>
      </div>
    </footer>
  );
}
