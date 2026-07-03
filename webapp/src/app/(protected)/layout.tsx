import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/access";
import { isAdmin } from "@/lib/roles";
import { BrandMark } from "@/components/BrandMark";
import { UserAvatar } from "@/components/UserAvatar";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await getSessionProfile();

  if (!profile) redirect("/");
  if (profile.status !== "approved") redirect("/");

  return (
    <div className="min-h-screen bg-brand-paper text-brand-ink">
      <nav className="sticky top-0 z-20 border-b border-brand-line bg-brand-panel/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <BrandMark />
            <Link
              href="/home"
              className="text-sm font-medium text-brand-muted hover:text-brand-navy"
            >
              Home
            </Link>
            <Link
              href="/library"
              className="text-sm font-medium text-brand-muted hover:text-brand-navy"
            >
              Courses
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium text-brand-muted hover:text-brand-navy"
            >
              About
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-brand-soft"
            >
              <UserAvatar
                name={profile.name}
                email={profile.email}
                avatarUrl={profile.avatar_url}
                size="sm"
              />
              <span className="hidden text-sm text-brand-muted sm:inline">
                {profile.username ? `@${profile.username}` : "Profile"}
              </span>
            </Link>
            {isAdmin(profile) && (
              <Link
                href="/admin"
                className="hidden text-xs font-medium text-brand-gold hover:underline sm:inline"
              >
                Admin portal
              </Link>
            )}
            <form action="/auth/signout" method="post">
              <button className="text-sm font-medium text-brand-muted underline-offset-4 hover:text-brand-blue hover:underline">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      <footer className="border-t border-brand-line py-6 text-center text-xs text-brand-muted">
        D1 Course Library · Every lecture, one desk.{" "}
        <Link href="/about" className="underline-offset-2 hover:text-brand-navy hover:underline">
          About
        </Link>
      </footer>
    </div>
  );
}
