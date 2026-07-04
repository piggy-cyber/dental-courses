import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdminProfile } from "@/app/admin/actions";
import { isEmbeddable, matchFilenameToYoutube } from "@/lib/youtube-catalog";
import { ReportStatusControls } from "./ReportStatusControls";

export const dynamic = "force-dynamic";

type CourseCoverage = {
  course_code: string;
  total: number;
  linked: number;
};

export default async function AdminOperationsPage() {
  await requireAdminProfile();
  const supabase = await createClient();

  const { data: resources } = await supabase
    .from("resources")
    .select("course_code, kind, name, storage_path");

  const fileResources = (resources ?? []).filter((r) => r.kind !== "Local Media Source");
  const mediaResources = (resources ?? []).filter((r) => r.kind === "Local Media Source");

  const byCourse = new Map<string, CourseCoverage>();
  for (const row of fileResources) {
    const entry = byCourse.get(row.course_code) ?? {
      course_code: row.course_code,
      total: 0,
      linked: 0,
    };
    entry.total += 1;
    if (row.storage_path) entry.linked += 1;
    byCourse.set(row.course_code, entry);
  }

  const coverage = [...byCourse.values()].sort((a, b) =>
    a.course_code.localeCompare(b.course_code)
  );
  const totalFileResources = fileResources.length;
  const totalLinked = fileResources.filter((r) => r.storage_path).length;
  const missing = totalFileResources - totalLinked;
  const youtubeLinked = mediaResources.filter((r) => {
    const video = matchFilenameToYoutube(r.name);
    return video && isEmbeddable(video);
  }).length;
  const youtubePending = mediaResources.length - youtubeLinked;

  const { data: pendingUsers } = await supabase
    .from("profiles")
    .select("email, name, access_note, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const { data: problemReports } = await supabase
    .from("resource_reports")
    .select(
      "id, message, category, status, course_code, admin_note, created_at, resolved_at, resources(name, course_code), profiles(email)"
    )
    .order("status", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(50);

  const openReports = (problemReports ?? []).filter((row) => row.status === "open");

  const csvRows = [
    "email,name,access_note,created_at",
    ...(pendingUsers ?? []).map((u) =>
      [
        u.email,
        JSON.stringify(u.name ?? ""),
        JSON.stringify(u.access_note ?? ""),
        u.created_at,
      ].join(",")
    ),
  ].join("\n");

  return (
    <div className="space-y-10">
      <header className="app-card p-6">
        <p className="eyebrow text-brand-gold">Admin</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-brand-navy">
          Operations
        </h1>
        <p className="mt-2 text-brand-muted">
          Library upload health and pending user export.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="app-card p-5">
          <p className="text-2xl font-bold text-brand-navy">{totalLinked}</p>
          <p className="text-sm text-brand-muted">Files in Supabase storage</p>
        </div>
        <div className="app-card p-5">
          <p className="text-2xl font-bold text-brand-navy">{missing}</p>
          <p className="text-sm text-brand-muted">Files not uploaded yet</p>
        </div>
        <div className="app-card p-5">
          <p className="text-2xl font-bold text-brand-navy">{youtubeLinked}</p>
          <p className="text-sm text-brand-muted">YouTube videos linked</p>
          {youtubePending > 0 && (
            <p className="mt-1 text-xs text-amber-700">{youtubePending} not on YouTube yet</p>
          )}
        </div>
        <div className="app-card p-5">
          <p className="text-2xl font-bold text-brand-navy">{openReports.length}</p>
          <p className="text-sm text-brand-muted">Open reports</p>
          {(pendingUsers?.length ?? 0) > 0 && (
            <p className="mt-1 text-xs text-amber-700">{pendingUsers?.length ?? 0} pending users</p>
          )}
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-muted">
          Upload coverage by course
        </h2>
        <p className="mb-3 text-xs text-brand-muted">
          Counts exclude Local Media Source rows (YouTube, not storage).
        </p>
        <div className="app-card overflow-hidden">
          <table className="portal-table w-full text-sm">
            <thead>
              <tr>
                <th>Course</th>
                <th>Linked</th>
                <th>Total</th>
                <th>Gap</th>
              </tr>
            </thead>
            <tbody>
              {coverage.map((row) => (
                <tr key={row.course_code}>
                  <td className="font-medium">{row.course_code}</td>
                  <td>{row.linked}</td>
                  <td>{row.total}</td>
                  <td className="text-amber-700">{row.total - row.linked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="app-card-muted p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 className="font-semibold text-brand-navy">Issue reports</h2>
            <p className="mt-1 text-sm text-brand-muted">
              Student reports from course pages and the homepage. Open reports stay first.
            </p>
          </div>
          <span className="border border-brand-line bg-brand-panel px-3 py-1 text-xs font-semibold text-brand-navy">
            {openReports.length} open
          </span>
        </div>
        {problemReports?.length ? (
          <ul className="mt-3 divide-y divide-brand-line overflow-hidden border border-brand-line bg-brand-panel">
            {problemReports.map((row) => (
              <li key={row.id} className="px-3 py-2 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-brand-ink">
                      {(row.resources as { course_code?: string; name?: string } | null)
                        ?.course_code ??
                        row.course_code ??
                        "Site"}{" "}
                      ·{" "}
                      {(row.resources as { name?: string } | null)?.name ??
                        "General issue"}
                    </p>
                    <p className="mt-0.5 text-xs uppercase tracking-wide text-brand-muted">
                      {String(row.category).replace("_", " ")}
                    </p>
                  </div>
                  <span
                    className={`border px-2 py-0.5 text-xs font-semibold ${
                      row.status === "open"
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : row.status === "resolved"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-brand-line bg-brand-soft text-brand-muted"
                    }`}
                  >
                    {row.status}
                  </span>
                </div>
                <p className="text-brand-muted">{row.message}</p>
                <p className="text-xs text-brand-muted">
                  {(row.profiles as { email?: string })?.email} ·{" "}
                  {new Date(row.created_at).toLocaleString()}
                </p>
                {row.admin_note && (
                  <p className="mt-2 border border-brand-line bg-brand-soft px-3 py-2 text-xs text-brand-ink">
                    <span className="font-semibold">Admin note: </span>
                    {row.admin_note}
                  </p>
                )}
                <ReportStatusControls
                  reportId={row.id}
                  currentStatus={row.status as "open" | "resolved" | "dismissed"}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-brand-muted">No reports yet.</p>
        )}
      </section>

      <section className="app-card-muted p-5">
        <h2 className="font-semibold text-brand-navy">Export pending users</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Copy this CSV for payment tracking or outreach.
        </p>
        <pre className="mt-3 max-h-48 overflow-auto border border-brand-line bg-brand-panel p-3 text-xs">
          {csvRows || "No pending users"}
        </pre>
        <Link href="/admin/accounts" className="mt-3 inline-block text-sm text-brand-blue hover:underline">
          Go to accounts →
        </Link>
      </section>
    </div>
  );
}
