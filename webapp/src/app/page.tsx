import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInPanel } from "@/components/SignInPanel";
import { BrandMarkPublic } from "@/components/BrandMark";
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
    <main className="min-h-screen bg-brand-paper">
      <header className="border-b border-brand-line bg-brand-panel/90 px-6 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <BrandMarkPublic />
          <Link
            href="/about"
            className="text-sm font-medium text-brand-muted hover:text-brand-navy"
          >
            About
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-4xl gap-10 px-6 py-12 lg:grid-cols-2 lg:items-start">
        <section className="text-center lg:text-left">
          <p className="eyebrow">Health Education Campus · D1</p>
          <h1 className="mt-2 text-3xl font-bold text-brand-navy">Course Library</h1>
          <p className="mt-3 text-brand-muted">
            Sign in to access lectures, videos, transcripts, and course files
            for approved classmates.
          </p>

          <div className="mt-8">
            {!profile ? (
              <>
                <SignInPanel />
                <p className="mt-4 text-sm text-brand-muted">
                  Use your email or Google. New accounts need owner approval.
                </p>
                {params.auth_error && (
                  <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                    Sign-in failed. Try the email link, or confirm Google is enabled
                    in Supabase.
                  </p>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-left">
                <p className="font-medium text-amber-900">
                  {profile.status === "revoked"
                    ? "Your access is inactive."
                    : "Waiting for owner approval."}
                </p>
                <p className="mt-1 text-sm text-amber-800">{profile.email}</p>
                <p className="mt-2 text-sm text-amber-800">
                  You&apos;ll get a dashboard and full library access once an admin
                  approves your account.
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
