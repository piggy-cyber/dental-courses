import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/access";
import { isAdmin } from "@/lib/roles";
import { BrandMark } from "@/components/BrandMark";

const ADMIN_LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/accounts", label: "Accounts" },
  { href: "/admin/team", label: "Team" },
  { href: "/admin/operations", label: "Operations" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await getSessionProfile();

  if (!profile) redirect("/");
  if (profile.status !== "approved") redirect("/");
  if (!isAdmin(profile)) redirect("/home");

  return (
    <div className="min-h-screen bg-brand-paper text-brand-ink">
      <nav className="sticky top-0 z-20 border-b border-brand-gold/30 bg-brand-panel/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <BrandMark />
              <span className="rounded-full bg-brand-gold/15 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-brand-gold">
                Admin
              </span>
            </div>
            {ADMIN_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-brand-muted hover:text-brand-navy"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <Link
            href="/home"
            className="text-sm font-medium text-brand-blue hover:underline"
          >
            Back to library
          </Link>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
