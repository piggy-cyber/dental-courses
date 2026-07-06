"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { CourseEditorData } from "@/app/admin/course-actions";
import {
  createLecture,
  createResource,
  deleteLecture,
  deleteResource,
  saveTranscript,
  updateCourseMetadata,
  updateLecture,
  updateResource,
} from "@/app/admin/course-actions";
import { ACCESS_TIERS } from "@/lib/tiers";

type Props = {
  initial: CourseEditorData;
};

export function CourseEditor({ initial }: Props) {
  const [data] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const courseUrl = useMemo(
    () =>
      `/course/${encodeURIComponent(data.course.code)}?collection=${encodeURIComponent(data.collection.id)}`,
    [data.course.code, data.collection.id]
  );

  function run(action: () => Promise<void>) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        await action();
        setMessage("Saved.");
        window.location.reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  async function uploadFiles(resourceId: number | null, files: FileList | null) {
    if (!files?.length) return;
    setMessage(null);
    setError(null);

    const form = new FormData();
    form.set("courseCode", data.course.code);
    form.set("collectionId", data.collection.id);
    if (resourceId) form.set("resourceId", String(resourceId));
    for (const file of files) form.append("file", file);

    const res = await fetch("/api/admin/course-resource/upload", {
      method: "POST",
      body: form,
    });
    const body = await res.json();
    if (!res.ok || !body.ok) {
      setError(body.errors?.join(" ") || body.error || "Upload failed.");
      return;
    }
    setMessage(`Uploaded ${body.uploaded} file(s).`);
    window.location.reload();
  }

  return (
    <div className="space-y-8">
      {(message || error) && (
        <div
          className={`border px-4 py-3 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
        >
          {error ?? message}
        </div>
      )}

      <section className="app-card overflow-hidden">
        <div className="portal-bar border-0 border-b border-brand-line px-3 py-2">
          <h2 className="text-sm font-bold uppercase text-brand-navy">Course metadata</h2>
        </div>
        <form
          className="grid gap-4 p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            run(() =>
              updateCourseMetadata(data.course.code, data.collection.id, {
                title: String(form.get("title")),
                semester: String(form.get("semester") || ""),
                area: String(form.get("area") || ""),
                sort_order: Number(form.get("sort_order") || 0),
                library_tier: String(form.get("library_tier")) as (typeof ACCESS_TIERS)[number],
              })
            );
          }}
        >
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-brand-muted">Title</span>
            <input
              name="title"
              defaultValue={data.course.title}
              className="app-input mt-1 w-full"
              required
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-brand-muted">Semester</span>
            <input
              name="semester"
              defaultValue={data.course.semester ?? ""}
              className="app-input mt-1 w-full"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-brand-muted">Area</span>
            <input
              name="area"
              defaultValue={data.course.area ?? ""}
              className="app-input mt-1 w-full"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-brand-muted">Sort order</span>
            <input
              name="sort_order"
              type="number"
              defaultValue={data.course.sort_order}
              className="app-input mt-1 w-full"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-brand-muted">Library tier</span>
            <select
              name="library_tier"
              defaultValue={data.course.library_tier}
              className="app-input mt-1 w-full"
            >
              {ACCESS_TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {tier.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="portal-button-primary px-4 py-2" disabled={pending}>
              Save metadata
            </button>
          </div>
        </form>
      </section>

      <section className="app-card overflow-hidden">
        <div className="portal-bar flex items-center justify-between border-0 border-b border-brand-line px-3 py-2">
          <h2 className="text-sm font-bold uppercase text-brand-navy">Lectures</h2>
          <button
            type="button"
            className="text-xs font-semibold text-brand-blue"
            disabled={pending}
            onClick={() =>
              run(async () => {
                await createLecture(data.course.code, data.collection.id, {
                  title: "New lecture",
                  sort_order: data.lectures.length * 10,
                });
              })
            }
          >
            + Add lecture
          </button>
        </div>
        <ul className="divide-y divide-brand-line">
          {data.lectures.map((lecture) => (
            <li key={lecture.id} className="space-y-3 p-4">
              <form
                className="grid gap-3 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = new FormData(e.currentTarget);
                  run(() =>
                    updateLecture(data.course.code, data.collection.id, lecture.id, {
                      title: String(form.get("title")),
                      lecture_date: String(form.get("lecture_date") || "") || null,
                      youtube_id: String(form.get("youtube_id") || "") || null,
                      sort_order: Number(form.get("sort_order") || 0),
                    })
                  );
                }}
              >
                <label className="block sm:col-span-2">
                  <span className="text-xs font-semibold text-brand-muted">Title</span>
                  <input
                    name="title"
                    defaultValue={lecture.title}
                    className="app-input mt-1 w-full"
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-brand-muted">Date</span>
                  <input
                    name="lecture_date"
                    type="date"
                    defaultValue={lecture.lecture_date ?? ""}
                    className="app-input mt-1 w-full"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-brand-muted">YouTube ID</span>
                  <input
                    name="youtube_id"
                    defaultValue={lecture.youtube_id ?? ""}
                    className="app-input mt-1 w-full"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-brand-muted">Sort</span>
                  <input
                    name="sort_order"
                    type="number"
                    defaultValue={lecture.sort_order}
                    className="app-input mt-1 w-full"
                  />
                </label>
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  <button type="submit" className="portal-button px-3 py-1.5 text-sm" disabled={pending}>
                    Save lecture
                  </button>
                  <button
                    type="button"
                    className="text-sm text-red-700 underline"
                    disabled={pending}
                    onClick={() =>
                      run(() =>
                        deleteLecture(data.course.code, data.collection.id, lecture.id)
                      )
                    }
                  >
                    Delete
                  </button>
                </div>
              </form>
              <label className="block">
                <span className="text-xs font-semibold text-brand-muted">Transcript</span>
                <textarea
                  defaultValue={lecture.transcript ?? ""}
                  rows={4}
                  className="app-input mt-1 w-full font-mono text-sm"
                  onBlur={(e) =>
                    run(() =>
                      saveTranscript(
                        data.course.code,
                        data.collection.id,
                        lecture.id,
                        e.target.value
                      )
                    )
                  }
                />
                <p className="mt-1 text-xs text-brand-muted">Blur to save transcript.</p>
              </label>
            </li>
          ))}
          {data.lectures.length === 0 && (
            <li className="p-4 text-sm text-brand-muted">No lectures yet.</li>
          )}
        </ul>
      </section>

      <section className="app-card overflow-hidden">
        <div className="portal-bar flex items-center justify-between border-0 border-b border-brand-line px-3 py-2">
          <h2 className="text-sm font-bold uppercase text-brand-navy">Resources</h2>
          <button
            type="button"
            className="text-xs font-semibold text-brand-blue"
            disabled={pending}
            onClick={() =>
              run(async () => {
                await createResource(data.course.code, data.collection.id, {
                  name: "new-file.pdf",
                  kind: "Document",
                });
              })
            }
          >
            + Add resource row
          </button>
        </div>
        <ul className="divide-y divide-brand-line">
          {data.resources.map((resource) => (
            <li key={resource.id} className="space-y-3 p-4">
              <form
                className="grid gap-3 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = new FormData(e.currentTarget);
                  run(() =>
                    updateResource(data.course.code, data.collection.id, resource.id, {
                      name: String(form.get("name")),
                      kind: String(form.get("kind") || ""),
                      section: String(form.get("section") || ""),
                      use_label: String(form.get("use_label") || ""),
                      is_canonical_syllabus: form.get("is_canonical_syllabus") === "on",
                    })
                  );
                }}
              >
                <label className="block sm:col-span-2">
                  <span className="text-xs font-semibold text-brand-muted">Name</span>
                  <input
                    name="name"
                    defaultValue={resource.name}
                    className="app-input mt-1 w-full"
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-brand-muted">Kind</span>
                  <input
                    name="kind"
                    defaultValue={resource.kind ?? ""}
                    className="app-input mt-1 w-full"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-brand-muted">Section</span>
                  <input
                    name="section"
                    defaultValue={resource.section ?? ""}
                    className="app-input mt-1 w-full"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-xs font-semibold text-brand-muted">Use label</span>
                  <input
                    name="use_label"
                    defaultValue={resource.use_label ?? ""}
                    className="app-input mt-1 w-full"
                  />
                </label>
                <label className="flex items-center gap-2 sm:col-span-2">
                  <input
                    name="is_canonical_syllabus"
                    type="checkbox"
                    defaultChecked={resource.is_canonical_syllabus}
                  />
                  <span className="text-sm text-brand-ink">Canonical syllabus</span>
                </label>
                <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                  <button type="submit" className="portal-button px-3 py-1.5 text-sm" disabled={pending}>
                    Save row
                  </button>
                  <label className="portal-button cursor-pointer px-3 py-1.5 text-sm">
                    {resource.storage_path ? "Replace file" : "Upload file"}
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => uploadFiles(resource.id, e.target.files)}
                    />
                  </label>
                  <button
                    type="button"
                    className="text-sm text-red-700 underline"
                    disabled={pending}
                    onClick={() =>
                      run(() =>
                        deleteResource(data.course.code, data.collection.id, resource.id)
                      )
                    }
                  >
                    Delete
                  </button>
                  <span className="text-xs text-brand-muted">
                    {resource.storage_path ? `Online · ${resource.size_mb ?? "?"} MB` : "Not uploaded"}
                  </span>
                </div>
              </form>
            </li>
          ))}
          {data.resources.length === 0 && (
            <li className="p-4 text-sm text-brand-muted">No resources yet.</li>
          )}
        </ul>
        <div className="border-t border-brand-line p-4">
          <label className="portal-button-primary inline-flex cursor-pointer px-4 py-2">
            Batch upload (creates rows from filenames)
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => uploadFiles(null, e.target.files)}
            />
          </label>
        </div>
      </section>

      <section className="app-card overflow-hidden">
        <div className="portal-bar border-0 border-b border-brand-line px-3 py-2">
          <h2 className="text-sm font-bold uppercase text-brand-navy">Recent changes</h2>
        </div>
        <ul className="divide-y divide-brand-line text-sm">
          {data.events.map((event) => (
            <li key={event.id} className="flex justify-between gap-4 px-4 py-3">
              <span className="text-brand-ink">{event.summary}</span>
              <span className="shrink-0 text-xs text-brand-muted">
                {new Date(event.created_at).toLocaleString()}
              </span>
            </li>
          ))}
          {data.events.length === 0 && (
            <li className="px-4 py-3 text-brand-muted">No audit events yet.</li>
          )}
        </ul>
      </section>

      <p className="text-sm text-brand-muted">
        <Link href={courseUrl} className="portal-link">
          View student course page
        </Link>
      </p>
    </div>
  );
}
