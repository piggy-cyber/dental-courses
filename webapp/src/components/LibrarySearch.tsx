"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type CourseCard = {
  code: string;
  title: string;
  semester: string | null;
  area: string | null;
  collectionId: string;
  collectionLabel: string;
  collectionShortLabel: string;
  collectionDescription: string | null;
  collectionSortOrder: number;
};

export function LibrarySearch({ courses }: { courses: CourseCard[] }) {
  const [query, setQuery] = useState("");
  const [collectionId, setCollectionId] = useState("all");

  const collections = useMemo(() => {
    const byId = new Map<
      string,
      Pick<
        CourseCard,
        "collectionId" | "collectionLabel" | "collectionShortLabel" | "collectionDescription" | "collectionSortOrder"
      > & { count: number }
    >();
    for (const course of courses) {
      const existing = byId.get(course.collectionId);
      if (existing) {
        existing.count += 1;
      } else {
        byId.set(course.collectionId, {
          collectionId: course.collectionId,
          collectionLabel: course.collectionLabel,
          collectionShortLabel: course.collectionShortLabel,
          collectionDescription: course.collectionDescription,
          collectionSortOrder: course.collectionSortOrder,
          count: 1,
        });
      }
    }
    return [...byId.values()].sort(
      (a, b) => a.collectionSortOrder - b.collectionSortOrder || a.collectionLabel.localeCompare(b.collectionLabel)
    );
  }, [courses]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses.filter((c) => {
      if (collectionId !== "all" && c.collectionId !== collectionId) return false;
      if (!q) return true;
      return (
        c.code.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        (c.area?.toLowerCase().includes(q) ?? false) ||
        c.collectionLabel.toLowerCase().includes(q) ||
        c.collectionShortLabel.toLowerCase().includes(q)
      );
    });
  }, [courses, query, collectionId]);

  const byCollection = useMemo(() => {
    const map = new Map<string, CourseCard[]>();
    for (const course of filtered) {
      const key = course.collectionId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(course);
    }
    return map;
  }, [filtered]);

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        {collections.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCollectionId("all")}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                collectionId === "all"
                  ? "border-brand-blue bg-brand-blue text-white"
                  : "border-brand-line bg-brand-panel text-brand-navy hover:bg-brand-soft"
              }`}
            >
              All granted
            </button>
            {collections.map((collection) => (
              <button
                key={collection.collectionId}
                type="button"
                onClick={() => setCollectionId(collection.collectionId)}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                  collectionId === collection.collectionId
                    ? "border-brand-blue bg-brand-blue text-white"
                    : "border-brand-line bg-brand-panel text-brand-navy hover:bg-brand-soft"
                }`}
              >
                {collection.collectionShortLabel}
              </button>
            ))}
          </div>
        )}

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by course code, title, collection, or area..."
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
        collections
          .filter((collection) => byCollection.has(collection.collectionId))
          .map((collection) => {
            const list = byCollection.get(collection.collectionId) ?? [];
            const bySemester = new Map<string, CourseCard[]>();
            for (const course of list) {
              const key = course.semester ?? "Other";
              if (!bySemester.has(key)) bySemester.set(key, []);
              bySemester.get(key)!.push(course);
            }

            return (
              <section
                key={collection.collectionId}
                className="rounded-xl border border-brand-line bg-brand-panel p-5 shadow-sm"
              >
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow">{collection.collectionShortLabel}</p>
                    <h2 className="mt-1 text-xl font-bold text-brand-navy">
                      {collection.collectionLabel}
                    </h2>
                    {collection.collectionDescription && (
                      <p className="mt-1 text-sm text-brand-muted">
                        {collection.collectionDescription}
                      </p>
                    )}
                  </div>
                  <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-navy">
                    {list.length} course{list.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="space-y-5">
                  {[...bySemester.entries()].map(([semester, semesterCourses]) => (
                    <div key={`${collection.collectionId}-${semester}`}>
                      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-muted">
                        {semester}
                      </h3>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {semesterCourses.map((course) => (
                          <Link
                            key={`${course.collectionId}-${course.code}`}
                            href={`/course/${encodeURIComponent(course.code)}`}
                            className="group rounded-xl border border-brand-line bg-white p-5 shadow-sm transition hover:border-brand-blue hover:shadow-md"
                          >
                            <p className="text-xs font-semibold uppercase tracking-wider text-brand-blue">
                              {course.code}
                            </p>
                            <h4 className="mt-1 font-semibold text-brand-ink group-hover:text-brand-navy">
                              {course.title}
                            </h4>
                            {course.area && (
                              <p className="mt-2 text-xs text-brand-muted">{course.area}</p>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })
      )}
    </div>
  );
}
