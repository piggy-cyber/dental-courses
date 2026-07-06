import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdminProfile } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

type CourseRow = {
  course_code: string;
  collection_id: string;
  sort_order: number;
  courses:
    | { code: string; title: string; semester: string | null; area: string | null }
    | { code: string; title: string; semester: string | null; area: string | null }[]
    | null;
  resource_collections:
    | { id: string; label: string; short_label: string }
    | { id: string; label: string; short_label: string }[]
    | null;
};

export default async function AdminCoursesPage() {
  await requireAdminProfile();
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("course_collection_members")
    .select(
      "course_code, collection_id, sort_order, courses(code, title, semester, area), resource_collections(id, label, short_label)"
    )
    .order("sort_order");

  const byCollection = new Map<
    string,
    { label: string; short_label: string; courses: CourseRow[] }
  >();

  for (const row of (rows as CourseRow[] | null) ?? []) {
    const collection = Array.isArray(row.resource_collections)
      ? row.resource_collections[0]
      : row.resource_collections;
    if (!collection) continue;
    if (!byCollection.has(collection.id)) {
      byCollection.set(collection.id, {
        label: collection.label,
        short_label: collection.short_label,
        courses: [],
      });
    }
    byCollection.get(collection.id)!.courses.push(row);
  }

  return (
    <div className="space-y-8">
      <header className="app-card p-6">
        <p className="eyebrow text-brand-gold">Admin portal</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-brand-navy">Courses</h1>
        <p className="mt-2 text-brand-muted">
          Edit course metadata, lectures, transcripts, and files. Uploads notify GroupMe once per
          batch.
        </p>
      </header>

      {[...byCollection.entries()].map(([collectionId, group]) => (
        <section key={collectionId} className="app-card overflow-hidden">
          <div className="portal-bar border-0 border-b border-brand-line px-3 py-2">
            <h2 className="text-sm font-bold uppercase text-brand-navy">
              {group.short_label} · {group.label}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="portal-table min-w-[640px] text-sm">
              <thead>
                <tr>
                  <th className="w-28">Code</th>
                  <th>Title</th>
                  <th className="w-32">Semester</th>
                  <th className="w-28">Manage</th>
                </tr>
              </thead>
              <tbody>
                {group.courses.map((row) => {
                  const course = Array.isArray(row.courses) ? row.courses[0] : row.courses;
                  if (!course) return null;
                  const href = `/admin/courses/${encodeURIComponent(course.code)}?collection=${encodeURIComponent(collectionId)}`;
                  return (
                    <tr key={`${collectionId}-${course.code}`}>
                      <td className="font-mono font-bold text-brand-navy">{course.code}</td>
                      <td>{course.title}</td>
                      <td className="text-brand-muted">{course.semester ?? "—"}</td>
                      <td>
                        <Link href={href} className="portal-link font-semibold">
                          Edit
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
