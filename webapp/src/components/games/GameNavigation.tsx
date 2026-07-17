import Link from "next/link";

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
    <nav className={className} aria-label="Game navigation">
      <Link href="/games">Games</Link>
      <Link href="/grade-calculator">Grade calculator</Link>
      <Link href="/guides">Study guides</Link>
      <Link href="/about">About</Link>
      {hasD1Access && <Link href="/d1">D1 library</Link>}
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
