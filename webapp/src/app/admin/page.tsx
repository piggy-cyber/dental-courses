import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdminProfile } from "@/app/admin/actions";
import { RecheckRosterButton } from "./RecheckRosterButton";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireAdminProfile();
  const supabase = await createClient();

  const [
    { count: pendingCount },
    { count: revokedCount },
    { count: rosterUnsignedCount },
    { count: openReportCount },
    { count: courseCount },
    { count: lectureCount },
    { data: resources },
    { data: recentProfiles },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("status", "revoked"),
    supabase
      .from("student_roster")
      .select("*", { count: "exact", head: true })
      .eq("status", "expected")
      .is("profile_id", null),
    supabase
      .from("resource_reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "open"),
    supabase.from("courses").select("*", { count: "exact", head: true }),
    supabase.from("lectures").select("*", { count: "exact", head: true }),
    supabase.from("resources").select("kind, storage_path"),
    supabase
      .from("profiles")
      .select("email, name, status, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const fileResources = (resources ?? []).filter((r) => r.kind !== "Local Media Source");
  const resourceCount = fileResources.length;
  const linkedCount = fileResources.filter((r) => r.storage_path).length;
  const missingFiles = resourceCount - linkedCount;

  return (
    <div className="space-y-10">
      <header>
        <p className="eyebrow text-brand-gold">Admin portal</p>
        <h1 className="text-2xl font-bold text-brand-navy">Dashboard</h1>
        <p className="mt-1 text-brand-muted">
          Manage access, monitor library health, and run operations.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Link
          href="/admin/accounts"
          className="rounded-xl border border-brand-line bg-brand-panel p-5 shadow-sm transition hover:border-brand-gold"
        >
          <p className="text-2xl font-bold text-brand-navy">{pendingCount ?? 0}</p>
          <p className="text-sm text-brand-muted">Pending approvals</p>
        </Link>
        <Link
          href="/admin/accounts"
          className="rounded-xl border border-brand-line bg-brand-panel p-5 shadow-sm transition hover:border-brand-gold"
        >
          <p className="text-2xl font-bold text-brand-navy">{revokedCount ?? 0}</p>
          <p className="text-sm text-brand-muted">Banned/revoked</p>
        </Link>
        <Link
          href="/admin/roster"
          className="rounded-xl border border-brand-line bg-brand-panel p-5 shadow-sm transition hover:border-brand-gold"
        >
          <p className="text-2xl font-bold text-brand-navy">{rosterUnsignedCount ?? 0}</p>
          <p className="text-sm text-brand-muted">Roster not signed in</p>
        </Link>
        <Link
          href="/admin/operations"
          className="rounded-xl border border-brand-line bg-brand-panel p-5 shadow-sm transition hover:border-brand-gold"
        >
          <p className="text-2xl font-bold text-brand-navy">{openReportCount ?? 0}</p>
          <p className="text-sm text-brand-muted">Open reports</p>
        </Link>
        <div className="rounded-xl border border-brand-line bg-brand-panel p-5 shadow-sm">
          <p className="text-2xl font-bold text-brand-navy">{courseCount ?? 0}</p>
          <p className="text-sm text-brand-muted">Courses</p>
        </div>
        <div className="rounded-xl border border-brand-line bg-brand-panel p-5 shadow-sm">
          <p className="text-2xl font-bold text-brand-navy">{lectureCount ?? 0}</p>
          <p className="text-sm text-brand-muted">Lectures</p>
        </div>
        <Link
          href="/admin/operations"
          className="rounded-xl border border-brand-line bg-brand-panel p-5 shadow-sm transition hover:border-brand-gold"
        >
          <p className="text-2xl font-bold text-brand-navy">
            {linkedCount}/{resourceCount}
          </p>
          <p className="text-sm text-brand-muted">Files in storage</p>
          {missingFiles > 0 && (
            <p className="mt-1 text-xs text-amber-700">{missingFiles} not uploaded</p>
          )}
        </Link>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <Link
          href="/admin/accounts"
          className="rounded-xl border border-brand-line bg-brand-panel p-5 hover:bg-brand-soft"
        >
          <h2 className="font-semibold text-brand-navy">Accounts</h2>
          <p className="mt-1 text-sm text-brand-muted">Approve or revoke library access.</p>
        </Link>
        <Link
          href="/admin/roster"
          className="rounded-xl border border-brand-line bg-brand-panel p-5 hover:bg-brand-soft"
        >
          <h2 className="font-semibold text-brand-navy">Roster</h2>
          <p className="mt-1 text-sm text-brand-muted">Track expected students and matches.</p>
        </Link>
        <Link
          href="/admin/team"
          className="rounded-xl border border-brand-line bg-brand-panel p-5 hover:bg-brand-soft"
        >
          <h2 className="font-semibold text-brand-navy">Team</h2>
          <p className="mt-1 text-sm text-brand-muted">Promote or demote admins.</p>
        </Link>
        <Link
          href="/admin/operations"
          className="rounded-xl border border-brand-line bg-brand-panel p-5 hover:bg-brand-soft"
        >
          <h2 className="font-semibold text-brand-navy">Operations</h2>
          <p className="mt-1 text-sm text-brand-muted">Upload coverage and exports.</p>
        </Link>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-muted">
          Recent sign-ins
        </h2>
        <ul className="divide-y divide-brand-line overflow-hidden rounded-xl border border-brand-line bg-brand-panel">
          {(recentProfiles ?? []).map((row) => (
            <li key={row.email} className="flex justify-between gap-4 px-4 py-3 text-sm">
              <span className="font-medium text-brand-ink">{row.name ?? row.email}</span>
              <span className="text-brand-muted">
                {row.status} · {new Date(row.created_at).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-brand-line bg-brand-soft p-5 text-sm text-brand-muted">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-brand-navy">Roster automation</h2>
            <p className="mt-1">
              Re-run email matching after importing a roster or after a pending student signs in.
            </p>
          </div>
          <RecheckRosterButton />
        </div>
      </section>

      <section className="rounded-xl border border-brand-line bg-brand-soft p-5 text-sm text-brand-muted">
        <h2 className="font-semibold text-brand-navy">Maintenance scripts</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <code className="text-brand-ink">node scripts/seed.mjs</code> — refresh course
            metadata
          </li>
          <li>
            <code className="text-brand-ink">node scripts/import-roster.mjs</code> — import
            private-staging/roster.csv
          </li>
          <li>
            <code className="text-brand-ink">node scripts/recheck-roster.mjs</code> — re-run
            roster auto-matches
          </li>
          <li>
            <code className="text-brand-ink">node scripts/upload-files.mjs --canvas</code> —
            upload Canvas files
          </li>
          <li>
            <code className="text-brand-ink">node scripts/make-admin.mjs email</code> — promote
            admin
          </li>
        </ul>
      </section>
    </div>
  );
}
