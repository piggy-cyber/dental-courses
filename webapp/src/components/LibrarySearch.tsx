"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type CourseCard = {
  code: string;
  title: string;
  semester: string | null;
  area: string | null;
};

export function LibrarySearch({ courses }: { courses: CourseCard[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        (c.area?.toLowerCase().includes(q) ?? false)
    );
  }, [courses, query]);

  const bySemester = useMemo(() => {
    const map = new Map<string, CourseCard[]>();
    for (const course of filtered) {
      const key = course.semester ?? "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(course);
    }
    return map;
  }, [filtered]);

  return (
    <div className="space-y-10">
      <div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by course code, title, or area..."
          className="w-full max-w-md rounded-lg border border-brand-line bg-brand-panel px-4 py-2.5 text-brand-ink outline-none ring-brand-blue focus:ring-2"
        />
        {query && (
          <p className="mt-2 text-sm text-brand-muted">
            {filtered.length} course{filtered.length === 1 ? "" : "s"} found
          </p>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-brand-muted">No courses match your search.</p>
      ) : (
        [...bySemester.entries()].map(([semester, list]) => (
          <section key={semester}>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-brand-muted">
              {semester}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((course) => (
                <Link
                  key={course.code}
                  href={`/course/${encodeURIComponent(course.code)}`}
                  className="group rounded-xl border border-brand-line bg-brand-panel p-5 shadow-sm transition hover:border-brand-blue hover:shadow-md"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-brand-blue">
                    {course.code}
                  </p>
                  <h3 className="mt-1 font-semibold text-brand-ink group-hover:text-brand-navy">
                    {course.title}
                  </h3>
                  {course.area && (
                    <p className="mt-2 text-xs text-brand-muted">{course.area}</p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
