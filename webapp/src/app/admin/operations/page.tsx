import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdminProfile } from "@/app/admin/actions";
import { isEmbeddable, matchFilenameToYoutube } from "@/lib/youtube-catalog";

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
    .select("id, message, created_at, resources(name, course_code), profiles(email)")
    .order("created_at", { ascending: false })
    .limit(20);

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
      <header>
        <h1 className="text-2xl font-bold text-brand-navy">Operations</h1>
        <p className="mt-1 text-brand-muted">
          Library upload health and pending user export.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-brand-line bg-brand-panel p-5">
          <p className="text-2xl font-bold text-brand-navy">{totalLinked}</p>
          <p className="text-sm text-brand-muted">Files in Supabase storage</p>
        </div>
        <div className="rounded-xl border border-brand-line bg-brand-panel p-5">
          <p className="text-2xl font-bold text-brand-navy">{missing}</p>
          <p className="text-sm text-brand-muted">Files not uploaded yet</p>
        </div>
        <div className="rounded-xl border border-brand-line bg-brand-panel p-5">
          <p className="text-2xl font-bold text-brand-navy">{youtubeLinked}</p>
          <p className="text-sm text-brand-muted">YouTube videos linked</p>
          {youtubePending > 0 && (
            <p className="mt-1 text-xs text-amber-700">{youtubePending} not on YouTube yet</p>
          )}
        </div>
        <div className="rounded-xl border border-brand-line bg-brand-panel p-5">
          <p className="text-2xl font-bold text-brand-navy">{pendingUsers?.length ?? 0}</p>
          <p className="text-sm text-brand-muted">Pending users</p>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-muted">
          Upload coverage by course
        </h2>
        <p className="mb-3 text-xs text-brand-muted">
          Counts exclude Local Media Source rows (YouTube, not storage).
        </p>
        <div className="overflow-hidden rounded-xl border border-brand-line bg-brand-panel">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-brand-line bg-brand-soft text-brand-muted">
              <tr>
                <th className="px-4 py-2 font-semibold">Course</th>
                <th className="px-4 py-2 font-semibold">Linked</th>
                <th className="px-4 py-2 font-semibold">Total</th>
                <th className="px-4 py-2 font-semibold">Gap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-line">
              {coverage.map((row) => (
                <tr key={row.course_code}>
                  <td className="px-4 py-2 font-medium">{row.course_code}</td>
                  <td className="px-4 py-2">{row.linked}</td>
                  <td className="px-4 py-2">{row.total}</td>
                  <td className="px-4 py-2 text-amber-700">{row.total - row.linked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-brand-line bg-brand-soft p-5">
        <h2 className="font-semibold text-brand-navy">Reported file problems</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Student reports from course pages. Run resource-reports.sql if this stays empty after reports.
        </p>
        {problemReports?.length ? (
          <ul className="mt-3 divide-y divide-brand-line rounded-lg bg-brand-panel">
            {problemReports.map((row) => (
              <li key={row.id} className="px-3 py-2 text-sm">
                <p className="font-medium text-brand-ink">
                  {(row.resources as { course_code?: string; name?: string })?.course_code}{" "}
                  · {(row.resources as { name?: string })?.name}
                </p>
                <p className="text-brand-muted">{row.message}</p>
                <p className="text-xs text-brand-muted">
                  {(row.profiles as { email?: string })?.email} ·{" "}
                  {new Date(row.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-brand-muted">No reports yet.</p>
        )}
      </section>

      <section className="rounded-xl border border-brand-line bg-brand-soft p-5">
        <h2 className="font-semibold text-brand-navy">Export pending users</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Copy this CSV for payment tracking or outreach.
        </p>
        <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-brand-panel p-3 text-xs">
          {csvRows || "No pending users"}
        </pre>
        <Link href="/admin/accounts" className="mt-3 inline-block text-sm text-brand-blue hover:underline">
          Go to accounts →
        </Link>
      </section>
    </div>
  );
}
