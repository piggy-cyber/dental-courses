import Link from "next/link";

const LEGAL_LINKS = [
  { href: "/legal#privacy", label: "Privacy" },
  { href: "/legal#terms", label: "Terms" },
  { href: "/legal#disclaimer", label: "Disclaimer" },
  { href: "/legal#copyright", label: "Copyright" },
  { href: "/legal#ai", label: "AI notice" },
] as const;

export function LegalFooter() {
  return (
    <footer className="border-t border-brand-line bg-brand-panel text-brand-muted">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <p className="max-w-5xl text-xs leading-relaxed">
          Independent student-run study tool. Not affiliated with, endorsed by,
          sponsored by, or representative of Case Western Reserve University or
          its School of Dental Medicine. AI-assisted and student-created material
          may be incomplete or inaccurate. Official university communications,
          syllabi, Canvas, faculty instructions, and clinical guidance control.
        </p>

        <div className="flex flex-col gap-3 border-t border-brand-line pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs">© 2026 Fourth Canal · Private academic use only.</p>
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
