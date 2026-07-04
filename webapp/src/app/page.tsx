import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInPanel } from "@/components/SignInPanel";
import { BrandMarkPublic } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AboutSummary } from "@/components/AboutContent";
import { AccessRequestForm } from "@/components/AccessRequestForm";
import { getSessionProfile } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function LoginHomePage({
  searchParams,
}: {
  searchParams: Promise<{ auth_error?: string }>;
}) {
  const { profile } = await getSessionProfile();
  const params = await searchParams;

  if (profile?.status === "approved") {
    redirect("/home");
  }

  return (
    <main className="app-shell-bg min-h-screen">
      <header className="border-b border-brand-line bg-brand-panel px-6 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <BrandMarkPublic />
          <div className="flex items-center gap-3">
            <ThemeToggle compact />
            <Link
              href="/about"
              className="text-sm font-medium text-brand-muted hover:text-brand-navy"
            >
              About
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
        <section className="app-hero p-7 sm:p-10">
          <p className="eyebrow">Health Education Campus · D1</p>
          <h1 className="portal-title mt-3 max-w-2xl text-4xl font-bold sm:text-5xl">
            Course Library
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-brand-muted">
            Use your personal Gmail, not your @case.edu address, to access approved
            lectures, videos, transcripts, and course files.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              ["Videos", "Lecture recordings"],
              ["Transcripts", "Searchable review"],
              ["Files", "Course resources"],
            ].map(([label, detail]) => (
              <div key={label} className="border border-brand-line bg-brand-soft p-4">
                <p className="font-semibold text-brand-navy">{label}</p>
                <p className="text-sm text-brand-muted">{detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-8">
            {!profile ? (
              <>
                <SignInPanel />
                <p className="mt-4 text-sm text-brand-muted">
                  Roster students with a matching personal Gmail are approved automatically.
                </p>
                {params.auth_error && (
                  <p className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                    Sign-in failed. Try the email link, or confirm Google is enabled
                    in Supabase.
                  </p>
                )}
              </>
            ) : (
              <div className="border border-amber-200 bg-amber-50 px-4 py-4 text-left">
                <p className="font-medium text-amber-900">
                  {profile.status === "revoked"
                    ? "Your access is inactive."
                    : "Waiting for owner approval."}
                </p>
                <p className="mt-1 text-sm text-amber-800">{profile.email}</p>
                <p className="mt-2 text-sm text-amber-800">
                  {profile.status === "revoked"
                    ? "Contact an admin if you think this is a mistake."
                    : "Roster students with a matching email are approved automatically. Other accounts stay pending for manual review."}
                </p>
                {profile.status === "pending" && (
                  <AccessRequestForm initialNote={profile.access_note} />
                )}
                <form action="/auth/signout" method="post" className="mt-3">
                  <button className="text-sm text-amber-900 underline">Sign out</button>
                </form>
              </div>
            )}
          </div>
        </section>

        <AboutSummary />
      </div>

      <footer className="border-t border-brand-line py-6 text-center text-xs text-brand-muted">
        Student-built · Not an official CWRU site.{" "}
        <Link href="/about" className="underline-offset-2 hover:text-brand-navy hover:underline">
          About
        </Link>
      </footer>
    </main>
  );
}
