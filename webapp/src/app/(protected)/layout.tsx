import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/access";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await getSessionProfile();

  if (!profile) redirect("/");
  if (profile.status !== "approved") redirect("/");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/library" className="text-lg font-bold text-blue-800">
              D1 Course Library
            </Link>
            <Link
              href="/library"
              className="text-sm font-medium text-slate-600 hover:text-blue-700"
            >
              Courses
            </Link>
            {profile.role === "owner" && (
              <Link
                href="/owner"
                className="text-sm font-medium text-slate-600 hover:text-blue-700"
              >
                Accounts
              </Link>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-500 sm:inline">
              {profile.name ?? profile.email}
            </span>
            <form action="/auth/signout" method="post">
              <button className="text-sm font-medium text-slate-500 underline-offset-4 hover:text-blue-700 hover:underline">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
