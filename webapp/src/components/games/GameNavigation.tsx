import Link from "next/link";
import { SitePrimaryLinks } from "@/components/SiteNavigation";

type GameNavigationProps = {
  className: string;
  displayName: string | null;
  signedIn: boolean;
};

export function GameNavigation({
  className,
  displayName,
  signedIn,
}: GameNavigationProps) {
  return (
    <nav className={className} aria-label="Main navigation">
      <SitePrimaryLinks />
      {signedIn ? (
        <>
          <span>{displayName}</span>
          <form action="/auth/signout" method="post">
            <button type="submit">Sign out</button>
          </form>
        </>
      ) : (
        <Link href="/signin">Sign in</Link>
      )}
    </nav>
  );
}
