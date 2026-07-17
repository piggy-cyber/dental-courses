"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LEGAL_LINKS = [
  { href: "/legal#privacy", label: "Privacy" },
  { href: "/legal#terms", label: "Terms" },
  { href: "/legal#disclaimer", label: "Disclaimer" },
  { href: "/legal#copyright", label: "Copyright" },
  { href: "/legal#ai", label: "AI notice" },
] as const;

export function LegalFooter() {
  const pathname = usePathname();
  const isGame = pathname === "/games" || pathname.startsWith("/games/");
  const hasIntegratedFooter = pathname === "/about" || pathname === "/ui-preview";

  if (hasIntegratedFooter) return null;

  return (
    <footer className={`${isGame ? "" : "fc-site"} site-legal-footer border-t border-brand-line bg-brand-panel text-brand-muted`}>
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
        {isGame ? (
          <p className="max-w-5xl text-xs leading-relaxed">
            Independent student-run study tool. Not affiliated with, endorsed by,
            sponsored by, or representative of Case Western Reserve University or
            its School of Dental Medicine. AI-assisted and student-created material
            may be incomplete or inaccurate. Official university, course, faculty,
            and clinical guidance controls.
          </p>
        ) : (
          <p className="max-w-5xl text-xs leading-relaxed">
            Independent student-run study support. Public tools and student-created guides may be incomplete or inaccurate. Official university, course, faculty, and clinical guidance always controls.
          </p>
        )}

        <div className="flex flex-col gap-3 border-t border-brand-line pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs">© 2026 Fourth Canal · Independent dental study tools.</p>
          <nav
            className="flex flex-wrap gap-x-4 gap-y-2 text-xs"
            aria-label="Legal and site information"
          >
            {LEGAL_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="font-medium underline-offset-4 hover:text-brand-navy hover:underline"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/about"
              className="font-medium underline-offset-4 hover:text-brand-navy hover:underline"
            >
              About
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
