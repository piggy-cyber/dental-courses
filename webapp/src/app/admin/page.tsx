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
    { count: collectionCount },
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
    supabase.from("resource_collections").select("*", { count: "exact", head: true }),
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
  const metricRows = [
    {
      href: "/admin/accounts",
      label: "Pending approvals",
      value: pendingCount ?? 0,
      note: "Accounts waiting for review",
    },
    {
      href: "/admin/accounts",
      label: "Banned/revoked",
      value: revokedCount ?? 0,
      note: "Accounts without active access",
    },
    {
      href: "/admin/roster",
      label: "Roster not signed in",
      value: rosterUnsignedCount ?? 0,
      note: "Expected students without a matched profile",
    },
    {
      href: "/admin/operations",
      label: "Open reports",
      value: openReportCount ?? 0,
      note: "Student reports needing action",
    },
    {
      label: "Courses",
      value: courseCount ?? 0,
      note: "Course records in the library",
    },
    {
      label: "Lectures",
      value: lectureCount ?? 0,
      note: "Lecture records in the library",
    },
    {
      href: "/admin/operations",
      label: "Files in storage",
      value: `${linkedCount}/${resourceCount}`,
      note: missingFiles > 0 ? `${missingFiles} not uploaded` : "All indexed files uploaded",
    },
  ];
  const adminDestinations = [
    {
      href: "/admin/accounts",
      label: "Accounts",
      detail: "Approve or revoke library access.",
    },
    {
      href: "/admin/roster",
      label: "Roster",
      detail: "Track expected students and matches.",
    },
    {
      href: "/admin/team",
      label: "Team",
      detail: "Promote or demote admins.",
    },
    {
      href: "/admin/collections",
      label: "Collections",
      detail: `${collectionCount ?? 0} resource set${collectionCount === 1 ? "" : "s"}.`,
    },
    {
      href: "/admin/courses",
      label: "Courses",
      detail: "Edit metadata, lectures, files, and transcripts.",
    },
    {
      href: "/admin/operations",
      label: "Operations",
      detail: "Upload coverage and exports.",
    },
  ];

  return (
    <div className="space-y-10">
      <header className="app-card p-6">
        <p className="eyebrow text-brand-gold">Admin portal</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-brand-navy">
          Dashboard
        </h1>
        <p className="mt-2 text-brand-muted">
          Manage access, monitor library health, and run operations.
        </p>
      </header>

      <section className="app-card overflow-hidden">
        <div className="portal-bar border-0 border-b border-brand-line px-3 py-2">
          <h2 className="text-sm font-bold uppercase text-brand-navy">Control totals</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="portal-table min-w-[760px] text-sm">
            <thead>
              <tr>
                <th>Item</th>
                <th className="w-32">Count</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {metricRows.map((row) => (
                <tr key={row.label}>
                  <td>
                    {row.href ? (
                      <Link href={row.href} className="portal-link font-semibold">
                        {row.label}
                      </Link>
                    ) : (
                      <span className="font-semibold text-brand-navy">{row.label}</span>
                    )}
                  </td>
                  <td className="font-mono font-bold text-brand-navy">{row.value}</td>
                  <td className="text-brand-muted">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="app-card overflow-hidden">
        <div className="portal-bar border-0 border-b border-brand-line px-3 py-2">
          <h2 className="text-sm font-bold uppercase text-brand-navy">Admin directory</h2>
        </div>
        <ul className="divide-y divide-brand-line">
          {adminDestinations.map((destination) => (
            <li key={destination.href} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Link href={destination.href} className="portal-link w-36 font-semibold">
                {destination.label}
              </Link>
              <p className="text-sm text-brand-muted">{destination.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-muted">
          Recent sign-ins
        </h2>
        <ul className="app-card divide-y divide-brand-line overflow-hidden">
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

      <section className="app-card-muted p-5 text-sm text-brand-muted">
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

      <section className="app-card-muted p-5 text-sm text-brand-muted">
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
            <code className="text-brand-ink">
              node scripts/import-resource-manifest.mjs --file private-staging/resource-manifests/d2-2025-2026.json --dry
            </code>{" "}
            — preview a staged D2 resource collection import
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
