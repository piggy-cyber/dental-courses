import Link from "next/link";
import { BrandMarkPublic } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AboutContent } from "@/components/AboutContent";
import { getSessionProfile } from "@/lib/access";

export const metadata = {
  title: "About — D1 Course Library",
  description:
    "What is inside the D1 Course Library, why it exists, and how classmates can contribute.",
};

export default async function AboutPage() {
  const { profile } = await getSessionProfile();
  const backHref = profile?.status === "approved" ? "/home" : "/";
  const backLabel = profile?.status === "approved" ? "Back to dashboard" : "Back to sign in";

  return (
    <div className="app-shell-bg min-h-screen text-brand-ink">
      <header className="sticky top-0 z-10 border-b border-brand-line bg-brand-panel/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <BrandMarkPublic />
          <div className="flex items-center gap-3">
            <ThemeToggle compact />
            <Link
              href={backHref}
              className="text-sm font-medium text-brand-muted hover:text-brand-navy"
            >
              {backLabel}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12">
        <section className="app-card p-6 sm:p-8">
          <AboutContent />
        </section>

        <div className="mt-10">
          <Link
            href={backHref}
            className="inline-flex rounded-full bg-brand-blue px-5 py-2.5 font-semibold text-white hover:opacity-90"
          >
            {backLabel}
          </Link>
        </div>
      </main>

      <footer className="border-t border-brand-line py-8 text-center text-sm text-brand-muted">
        D1 Course Library · Every lecture, one desk.
      </footer>
    </div>
  );
}
