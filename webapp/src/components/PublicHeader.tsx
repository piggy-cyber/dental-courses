import Link from "next/link";
import { BrandMarkPublic } from "@/components/BrandMark";
import { SitePrimaryLinks, SitePrimaryNavigation } from "@/components/SiteNavigation";

export function PublicHeader() {
  return (
    <header className="public-core-header">
      <BrandMarkPublic />
      <SitePrimaryNavigation />
      <details className="public-core-mobile-menu">
        <summary>Menu</summary>
        <nav aria-label="Mobile navigation">
          <SitePrimaryLinks />
        </nav>
      </details>
      <Link href="/#account" className="public-core-account-link">
        Sign in <span aria-hidden="true">→</span>
      </Link>
    </header>
  );
}
