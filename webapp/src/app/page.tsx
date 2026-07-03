import Link from "next/link";
import { SignInButton } from "@/components/SignInButton";
import { getSessionProfile } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { profile } = await getSessionProfile();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md text-center">
        <h1 className="text-3xl font-bold text-slate-900">D1 Course Library</h1>
        <p className="mt-2 text-slate-600">
          Course materials for approved members only.
        </p>

        <div className="mt-8">
          {!profile ? (
            <>
              <SignInButton />
              <p className="mt-4 text-sm text-slate-500">
                Sign in with Google to request access.
              </p>
            </>
          ) : profile.status === "approved" ? (
            <Link
              href="/library"
              className="inline-flex rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800"
            >
              Enter library
            </Link>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-left">
              <p className="font-medium text-amber-900">
                {profile.status === "revoked"
                  ? "Your access is inactive."
                  : "Waiting for owner approval."}
              </p>
              <p className="mt-1 text-sm text-amber-800">{profile.email}</p>
              <form action="/auth/signout" method="post" className="mt-3">
                <button className="text-sm text-amber-900 underline">Sign out</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
