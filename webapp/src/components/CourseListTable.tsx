"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteCourse, type CourseListRow } from "@/app/admin/course-actions";

export function CourseListTable({ courses }: { courses: CourseListRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<CourseListRow | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        (c.semester ?? "").toLowerCase().includes(q)
    );
  }, [courses, query]);

  const byCollection = useMemo(() => {
    const map = new Map<string, { label: string; short_label: string; rows: CourseListRow[] }>();
    for (const row of filtered) {
      if (!map.has(row.collection_id)) {
        map.set(row.collection_id, {
          label: row.collection_label,
          short_label: row.collection_short_label,
          rows: [],
        });
      }
      map.get(row.collection_id)!.rows.push(row);
    }
    return [...map.entries()];
  }, [filtered]);

  function handleDelete() {
    if (!deleteTarget) return;
    if (confirmText !== `DELETE ${deleteTarget.code}`) {
      setError(`Type DELETE ${deleteTarget.code} to confirm.`);
      return;
    }
    startTransition(async () => {
      try {
        await deleteCourse(deleteTarget.code, deleteTarget.collection_id);
        setDeleteTarget(null);
        setConfirmText("");
        setError(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="search"
          placeholder="Search courses…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="app-input w-full max-w-sm"
        />
        <Link href="/admin/courses/new" className="portal-button-primary px-4 py-2 text-sm">
          + Add new course
        </Link>
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {byCollection.map(([collectionId, group]) => (
        <section key={collectionId} className="app-card overflow-hidden">
          <div className="portal-bar border-0 border-b border-brand-line px-3 py-2">
            <h2 className="text-sm font-bold uppercase text-brand-navy">
              {group.short_label} · {group.label}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="portal-table min-w-[760px] text-sm">
              <thead>
                <tr>
                  <th className="w-28">Code</th>
                  <th>Title</th>
                  <th className="w-32">Semester</th>
                  <th className="w-36">Status</th>
                  <th className="w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((row) => {
                  const href = `/admin/courses/${encodeURIComponent(row.code)}?collection=${encodeURIComponent(collectionId)}`;
                  return (
                    <tr key={`${collectionId}-${row.code}`}>
                      <td className="font-mono font-bold text-brand-navy">{row.code}</td>
                      <td>{row.title}</td>
                      <td className="text-brand-muted">{row.semester ?? "—"}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          <span className="border border-brand-line bg-brand-soft px-1.5 py-0.5 text-xs">
                            {row.lecture_count} lectures
                          </span>
                          <span className="border border-brand-line bg-brand-soft px-1.5 py-0.5 text-xs">
                            {row.files_online}/{row.files_total} files
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <Link href={href} className="portal-link font-semibold">
                            Organize
                          </Link>
                          <button
                            type="button"
                            className="text-xs text-red-700 underline"
                            disabled={pending}
                            onClick={() => {
                              setDeleteTarget(row);
                              setConfirmText("");
                              setError(null);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="app-card max-w-md space-y-4 p-6">
            <h3 className="text-lg font-bold text-brand-navy">Delete {deleteTarget.code}?</h3>
            <p className="text-sm text-brand-muted">
              This removes lectures, files, and storage for this course in{" "}
              {deleteTarget.collection_short_label}. Type{" "}
              <code className="text-brand-ink">DELETE {deleteTarget.code}</code> to confirm.
            </p>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="app-input w-full"
              placeholder={`DELETE ${deleteTarget.code}`}
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="portal-button-primary px-4 py-2 text-sm"
                disabled={pending}
                onClick={handleDelete}
              >
                Delete course
              </button>
              <button
                type="button"
                className="portal-button px-4 py-2 text-sm"
                disabled={pending}
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
