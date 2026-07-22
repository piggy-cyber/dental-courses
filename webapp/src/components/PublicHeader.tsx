import Link from "next/link";
import { BrandMarkPublic } from "@/components/BrandMark";
import { SitePrimaryLinks, SitePrimaryNavigation } from "@/components/SiteNavigation";
import { getOptionalSessionProfile } from "@/lib/access";

export async function PublicHeader() {
  const { profile } = await getOptionalSessionProfile();
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
      {profile ? (
        <details className="public-core-account-link">
          <summary>{profile.name ?? profile.username ?? "Account"}</summary>
          <nav aria-label="Account">
            <Link href="/profile">Profile</Link>
            <Link href="/games">Saved progress</Link>
            <Link href="/profile#appearance">Appearance</Link>
            <form action="/auth/signout" method="post"><button>Sign out</button></form>
          </nav>
        </details>
      ) : <Link href="/signin" className="public-core-account-link">Sign in <span aria-hidden="true">→</span></Link>}
    </header>
  );
}
