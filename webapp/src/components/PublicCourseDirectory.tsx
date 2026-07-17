"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type PublicCourseDirectoryItem = {
  code: string;
  slug: string;
  title: string;
  department: string;
};

export function PublicCourseDirectory({ courses }: { courses: PublicCourseDirectoryItem[] }) {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("all");
  const departments = useMemo(
    () => Array.from(new Set(courses.map((course) => course.department))).sort(),
    [courses],
  );
  const filteredCourses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return courses.filter((course) => {
      const matchesDepartment = department === "all" || course.department === department;
      const matchesQuery = !normalizedQuery || [course.code, course.title]
        .some((value) => value.toLowerCase().includes(normalizedQuery));
      return matchesDepartment && matchesQuery;
    });
  }, [courses, department, query]);

  const reset = () => {
    setQuery("");
    setDepartment("all");
  };

  return (
    <div className="public-course-directory">
      <div className="public-course-directory-controls">
        <label>
          <span>Find a course</span>
          <span className="public-course-directory-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Type a course name or code"
              autoComplete="off"
            />
          </span>
        </label>
        <div className="public-course-directory-filters" aria-label="Filter courses by subject">
          <button
            type="button"
            aria-pressed={department === "all"}
            onClick={() => setDepartment("all")}
          >
            All subjects
          </button>
          {departments.map((label) => (
            <button
              type="button"
              key={label}
              aria-pressed={department === label}
              onClick={() => setDepartment(label)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filteredCourses.length ? (
        <div className="public-guides-list" aria-live="polite">
          {filteredCourses.map((course) => (
            <Link href={`/guides/${course.slug}`} key={course.code}>
              <span className="public-guides-code">{course.code}</span>
              <span className="public-guides-title">
                <b>{course.title}</b>
                <small>{course.department} · Textbook Companion and Course Mastery Guide</small>
              </span>
              <span className="public-guides-arrow" aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="public-course-directory-empty" role="status">
          <p>No course matches that search.</p>
          <button type="button" onClick={reset}>Clear search</button>
        </div>
      )}
    </div>
  );
}
