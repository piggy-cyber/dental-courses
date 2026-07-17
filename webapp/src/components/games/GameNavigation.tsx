import Link from "next/link";
import { SitePrimaryLinks } from "@/components/SiteNavigation";

type GameNavigationProps = {
  className: string;
  displayName: string | null;
  hasD1Access: boolean;
  signedIn: boolean;
};

export function GameNavigation({
  className,
  displayName,
  hasD1Access,
  signedIn,
}: GameNavigationProps) {
  return (
    <nav className={className} aria-label="Main navigation">
      <SitePrimaryLinks />
      {hasD1Access && <Link href="/d1">Student workspace</Link>}
      {signedIn ? (
        <>
          <span>{displayName}</span>
          <form action="/auth/signout" method="post">
            <button type="submit">Sign out</button>
          </form>
        </>
      ) : (
        <Link href="/#account">Student sign in</Link>
      )}
    </nav>
  );
}
