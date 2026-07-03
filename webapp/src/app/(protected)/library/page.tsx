import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CourseRow = {
  code: string;
  title: string;
  semester: string | null;
  area: string | null;
  sort_order: number;
};

export default async function LibraryPage() {
  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("code, title, semester, area, sort_order")
    .order("sort_order");

  const bySemester = new Map<string, CourseRow[]>();
  for (const course of (courses as CourseRow[]) ?? []) {
    const key = course.semester ?? "Other";
    if (!bySemester.has(key)) bySemester.set(key, []);
    bySemester.get(key)!.push(course);
  }

  if (!courses?.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
        No courses loaded yet. Run the seed script to import the course
        library.
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-bold">Courses</h1>
        <p className="mt-1 text-slate-500">
          Pick a course to see its lectures, videos, transcripts, and files.
        </p>
      </header>

      {[...bySemester.entries()].map(([semester, list]) => (
        <section key={semester}>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
            {semester}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((course) => (
              <Link
                key={course.code}
                href={`/course/${encodeURIComponent(course.code)}`}
                className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                  {course.code}
                </p>
                <h3 className="mt-1 font-semibold text-slate-900 group-hover:text-blue-800">
                  {course.title}
                </h3>
                {course.area && (
                  <p className="mt-2 text-xs text-slate-400">{course.area}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
