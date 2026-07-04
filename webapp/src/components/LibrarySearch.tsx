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

function courseHref(course: CourseCard) {
  return `/course/${encodeURIComponent(course.code)}?collection=${encodeURIComponent(course.collectionId)}`;
}

export function LibrarySearch({
  courses,
  isAdminView = false,
}: {
  courses: CourseCard[];
  isAdminView?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [collectionId, setCollectionId] = useState("all");

  const collections = useMemo(() => {
    const byId = new Map<
      string,
      Pick<
        CourseCard,
        | "collectionId"
        | "collectionLabel"
        | "collectionShortLabel"
        | "collectionDescription"
        | "collectionSortOrder"
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
      (a, b) =>
        a.collectionSortOrder - b.collectionSortOrder ||
        a.collectionLabel.localeCompare(b.collectionLabel)
    );
  }, [courses]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses
      .filter((c) => {
        if (collectionId !== "all" && c.collectionId !== collectionId) return false;
        if (!q) return true;
        return (
          c.code.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          (c.area?.toLowerCase().includes(q) ?? false) ||
          c.collectionLabel.toLowerCase().includes(q) ||
          c.collectionShortLabel.toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          a.collectionSortOrder - b.collectionSortOrder ||
          (a.semester ?? "").localeCompare(b.semester ?? "") ||
          a.code.localeCompare(b.code)
      );
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
    <div className="space-y-5">
      <section className="portal-bar p-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block min-w-0 flex-1">
            <span className="mb-1 block text-xs font-bold uppercase text-brand-navy">
              Search directory
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Course code, title, collection, or area"
              className="app-input w-full px-3 py-2 text-sm"
            />
          </label>
          <div>
            <span className="mb-1 block text-xs font-bold uppercase text-brand-navy">
              Collection
            </span>
            <div className="flex flex-wrap border border-brand-line bg-brand-panel">
              <button
                type="button"
                onClick={() => setCollectionId("all")}
                className={`border-r border-brand-line px-3 py-2 text-xs font-semibold last:border-r-0 ${
                  collectionId === "all"
                    ? "bg-brand-blue text-white"
                    : "text-brand-blue hover:bg-brand-soft hover:text-brand-navy"
                }`}
              >
                {isAdminView ? "All available" : "All granted"}
              </button>
              {collections.map((collection) => (
                <button
                  key={collection.collectionId}
                  type="button"
                  onClick={() => setCollectionId(collection.collectionId)}
                  className={`border-r border-brand-line px-3 py-2 text-xs font-semibold last:border-r-0 ${
                    collectionId === collection.collectionId
                      ? "bg-brand-blue text-white"
                      : "text-brand-blue hover:bg-brand-soft hover:text-brand-navy"
                  }`}
                >
                  {collection.collectionShortLabel}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-brand-muted">
          Showing {filtered.length} of {courses.length}{" "}
          {isAdminView ? "available" : "granted"} course entries.
        </p>
      </section>

      {filtered.length === 0 ? (
        <p className="border border-brand-line bg-brand-panel px-4 py-3 text-sm text-brand-muted">
          No courses match your search.
        </p>
      ) : (
        collections
          .filter((collection) => byCollection.has(collection.collectionId))
          .map((collection) => {
            const list = byCollection.get(collection.collectionId) ?? [];

            return (
              <section key={collection.collectionId} className="app-card overflow-hidden">
                <div className="portal-bar border-0 border-b border-brand-line px-3 py-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div>
                      <p className="eyebrow">{collection.collectionShortLabel}</p>
                      <h2 className="text-base font-bold text-brand-navy">
                        {collection.collectionLabel}
                      </h2>
                    </div>
                    <span className="text-xs font-semibold text-brand-muted">
                      {list.length} course{list.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  {collection.collectionDescription && (
                    <p className="mt-1 text-xs text-brand-muted">
                      {collection.collectionDescription}
                    </p>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="portal-table min-w-[760px] text-sm">
                    <thead>
                      <tr>
                        <th className="w-28">Code</th>
                        <th>Title</th>
                        <th className="w-44">Area</th>
                        <th className="w-32">Semester</th>
                        <th className="w-32">Open</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((course) => (
                        <tr key={`${course.collectionId}-${course.code}`}>
                          <td className="font-mono text-xs font-bold text-brand-navy">
                            {course.code}
                          </td>
                          <td>
                            <Link href={courseHref(course)} className="portal-link font-semibold">
                              {course.title}
                            </Link>
                          </td>
                          <td className="text-xs text-brand-muted">{course.area ?? "-"}</td>
                          <td className="text-xs text-brand-muted">{course.semester ?? "-"}</td>
                          <td>
                            <Link href={courseHref(course)} className="portal-link text-xs">
                              course page
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })
      )}
    </div>
  );
}
