import Link from "next/link";
import { BrandMarkPublic } from "@/components/BrandMark";

const PUBLIC_LINKS = [
  { href: "/games", label: "Games" },
  { href: "/grade-calculator", label: "Grade calculator" },
  { href: "/guides", label: "Study guides" },
  { href: "/about", label: "About" },
] as const;

export function PublicHeader() {
  return (
    <header className="public-core-header">
      <BrandMarkPublic />
      <nav aria-label="Main navigation">
        {PUBLIC_LINKS.map((link) => (
          <Link key={link.href} href={link.href}>{link.label}</Link>
        ))}
      </nav>
      <details className="public-core-mobile-menu">
        <summary>Menu</summary>
        <nav aria-label="Mobile navigation">
          {PUBLIC_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>{link.label}</Link>
          ))}
        </nav>
      </details>
      <Link href="/#account" className="public-core-account-link">
        Sign in <span aria-hidden="true">→</span>
      </Link>
    </header>
  );
}
