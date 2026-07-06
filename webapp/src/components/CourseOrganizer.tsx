"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CourseEditorData } from "@/app/admin/course-actions";
import { updateCourseMetadata } from "@/app/admin/course-actions";
import {
  createLecture,
  deleteLecture,
  deleteResource,
  reorderLectures,
  saveTranscript,
  updateLecture,
} from "@/app/admin/course-actions";
import { CourseInboxPanel } from "@/components/CourseInboxPanel";
import { CourseSectionEditor } from "@/components/CourseSectionEditor";
import { CourseUploadBar } from "@/components/CourseUploadBar";
import { uploadCourseFiles } from "@/lib/course-upload-client";
import {
  ESSENTIAL_SLOT_LABELS,
  essentialSlotForResource,
  isInboxResource,
  type EssentialSlot,
} from "@/lib/resource-kinds";
import Link from "next/link";

type Props = {
  initial: CourseEditorData;
};

export function CourseOrganizer({ initial }: Props) {
  const router = useRouter();
  // Render straight from props so router.refresh() shows fresh server data;
  // useState(initial) would pin the snapshot from first mount.
  const data = initial;
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const courseUrl = `/course/${encodeURIComponent(data.course.code)}?collection=${encodeURIComponent(data.collection.id)}`;

  const essentials = {
    syllabus: data.resources.filter((r) => essentialSlotForResource(r) === "syllabus" && !isInboxResource(r)),
    mastery: data.resources.filter((r) => essentialSlotForResource(r) === "mastery" && !isInboxResource(r)),
    companion: data.resources.filter((r) => essentialSlotForResource(r) === "companion" && !isInboxResource(r)),
  };

  const supplemental = data.resources.filter(
    (r) =>
      !isInboxResource(r) &&
      !essentialSlotForResource(r) &&
      !r.lecture_id &&
      !r.use_label?.includes("-slides") &&
      !r.use_label?.includes("-transcript-file") &&
      !r.use_label?.endsWith("-placeholder") &&
      !r.resource_role?.startsWith("lecture_")
  );

  const lectureResources = (lectureId: string) =>
    data.resources.filter(
      (r) =>
        (r.lecture_id === lectureId || r.use_label?.startsWith(`${lectureId}-`)) &&
        !isInboxResource(r)
    );

  function run(action: () => Promise<void>, success = "Saved.") {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        await action();
        setMessage(success);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  async function uploadToResource(resourceId: number, files: FileList | null) {
    if (!files?.[0]) return;
    setUploadProgress(0);
    setError(null);
    try {
      const result = await uploadCourseFiles({
        courseCode: data.course.code,
        collectionId: data.collection.id,
        files: [files[0]],
        resourceId,
        onProgress: setUploadProgress,
      });
      if (!result.ok) {
        setError(result.errors.join(" ") || "Upload failed.");
        return;
      }
      setMessage("File uploaded.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadProgress(null);
    }
  }

  function moveLecture(index: number, direction: -1 | 1) {
    const ids = data.lectures.map((l) => l.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    run(() => reorderLectures(data.course.code, data.collection.id, ids), "Lecture order updated.");
  }

  function essentialSlotCard(slot: EssentialSlot, resources: typeof data.resources, hint: string) {
    const resource = resources[0];
    return (
      <div key={slot} className="border border-brand-line bg-brand-panel p-4">
        <h3 className="font-semibold text-brand-navy">{ESSENTIAL_SLOT_LABELS[slot]}</h3>
        <p className="mt-1 text-xs text-brand-muted">{hint}</p>
        {resource ? (
          <div className="mt-3 space-y-2">
            <p className="text-sm text-brand-ink">{resource.name}</p>
            <p className="text-xs text-brand-muted">
              {resource.storage_path ? "Online" : "Waiting for upload"}
            </p>
            <label className="portal-button inline-flex cursor-pointer px-3 py-1.5 text-sm">
              {resource.storage_path ? "Replace file" : "Upload file"}
              <input
                type="file"
                className="hidden"
                onChange={(e) => uploadToResource(resource.id, e.target.files)}
              />
            </label>
          </div>
        ) : (
          <p className="mt-2 text-sm text-brand-muted">No slot — use inbox to assign.</p>
        )}
      </div>
    );
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

      {uploadProgress !== null && (
        <div className="h-2 w-full bg-brand-soft">
          <div
            className="h-full bg-brand-blue transition-all"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      <CourseUploadBar
        data={data}
        onMessage={setMessage}
        onError={setError}
        onProgress={setUploadProgress}
      />

      <CourseInboxPanel data={data} onMessage={setMessage} onError={setError} />

      <CourseSectionEditor data={data} onMessage={setMessage} onError={setError} />

      <section className="app-card overflow-hidden">
        <div className="portal-bar border-0 border-b border-brand-line px-3 py-2">
          <h2 className="text-sm font-bold uppercase text-brand-navy">Essentials</h2>
        </div>
        <div className="grid gap-4 p-4 md:grid-cols-3">
          {essentialSlotCard("syllabus", essentials.syllabus, "Upload your syllabus PDF here.")}
          {essentialSlotCard("mastery", essentials.mastery, "Course mastery guide for quick review.")}
          {essentialSlotCard("companion", essentials.companion, "Optional long-form textbook companion.")}
        </div>
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
                  title: `Lecture ${data.lectures.length + 1}`,
                  sort_order: (data.lectures.length + 1) * 10,
                });
              }, "Lecture added.")
            }
          >
            + Add lecture
          </button>
        </div>
        <ul className="divide-y divide-brand-line">
          {data.lectures.map((lecture, index) => {
            const linkedFiles = lectureResources(lecture.id);
            return (
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
                    })
                  );
                }}
              >
                <label className="block sm:col-span-2">
                  <span className="text-xs font-semibold text-brand-muted">Title</span>
                  <input name="title" defaultValue={lecture.title} className="app-input mt-1 w-full" required />
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
                    placeholder="Optional video ID"
                  />
                </label>
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  <button type="submit" className="portal-button px-3 py-1.5 text-sm" disabled={pending}>
                    Save
                  </button>
                  <button
                    type="button"
                    className="portal-button px-3 py-1.5 text-sm"
                    disabled={pending || index === 0}
                    onClick={() => moveLecture(index, -1)}
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    className="portal-button px-3 py-1.5 text-sm"
                    disabled={pending || index === data.lectures.length - 1}
                    onClick={() => moveLecture(index, 1)}
                  >
                    Move down
                  </button>
                  <button
                    type="button"
                    className="text-sm text-red-700 underline"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () => deleteLecture(data.course.code, data.collection.id, lecture.id),
                        "Lecture deleted."
                      )
                    }
                  >
                    Delete
                  </button>
                </div>
              </form>

              <div className="rounded border border-brand-line bg-brand-soft/40 p-3">
                <p className="text-xs font-semibold uppercase text-brand-muted">Linked files</p>
                {linkedFiles.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-sm text-brand-ink">
                    {linkedFiles.map((r) => (
                      <li key={r.id}>{r.name}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-brand-muted">
                    Assign slides from the inbox, or upload below.
                  </p>
                )}
              </div>

              <label className="block">
                <span className="text-xs font-semibold text-brand-muted">Transcript text</span>
                <textarea
                  defaultValue={lecture.transcript ?? ""}
                  rows={3}
                  className="app-input mt-1 w-full font-mono text-sm"
                  placeholder="Paste lecture transcript here…"
                  onBlur={(e) =>
                    run(
                      () =>
                        saveTranscript(
                          data.course.code,
                          data.collection.id,
                          lecture.id,
                          e.target.value
                        ),
                      "Transcript saved."
                    )
                  }
                />
              </label>
            </li>
            );
          })}
          {data.lectures.length === 0 && (
            <li className="p-4 text-sm text-brand-muted">No lectures yet. Add one above.</li>
          )}
        </ul>
      </section>

      {supplemental.length > 0 && (
        <section className="app-card overflow-hidden">
          <div className="portal-bar border-0 border-b border-brand-line px-3 py-2">
            <h2 className="text-sm font-bold uppercase text-brand-navy">Labs and extras</h2>
          </div>
          <ul className="divide-y divide-brand-line">
            {supplemental.map((resource) => (
              <li
                key={resource.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-brand-ink">{resource.name}</p>
                  <p className="text-xs text-brand-muted">
                    {resource.kind}
                    {resource.section ? ` · ${resource.section}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-red-700 underline"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () => deleteResource(data.course.code, data.collection.id, resource.id),
                      "File removed."
                    )
                  }
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <details
        className="app-card overflow-hidden"
        open={showAdvanced}
        onToggle={(e) => setShowAdvanced((e.target as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-brand-navy">
          Advanced metadata
        </summary>
        <form
          className="grid gap-4 border-t border-brand-line p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            run(() =>
              updateCourseMetadata(data.course.code, data.collection.id, {
                title: String(form.get("title")),
                semester: String(form.get("semester") || ""),
                area: String(form.get("area") || ""),
                sort_order: Number(form.get("sort_order") || 0),
              })
            );
          }}
        >
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-brand-muted">Title</span>
            <input name="title" defaultValue={data.course.title} className="app-input mt-1 w-full" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-brand-muted">Semester</span>
            <input name="semester" defaultValue={data.course.semester ?? ""} className="app-input mt-1 w-full" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-brand-muted">Area</span>
            <input name="area" defaultValue={data.course.area ?? ""} className="app-input mt-1 w-full" />
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
          <div className="sm:col-span-2">
            <button type="submit" className="portal-button-primary px-4 py-2" disabled={pending}>
              Save metadata
            </button>
          </div>
        </form>
      </details>

      {data.events.length > 0 && (
        <section className="app-card overflow-hidden">
          <div className="portal-bar border-0 border-b border-brand-line px-3 py-2">
            <h2 className="text-sm font-bold uppercase text-brand-navy">Recent changes</h2>
          </div>
          <ul className="divide-y divide-brand-line text-sm">
            {data.events.map((event) => (
              <li key={event.id} className="flex justify-between gap-4 px-4 py-3">
                <span>{event.summary}</span>
                <span className="shrink-0 text-xs text-brand-muted">
                  {new Date(event.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-sm text-brand-muted">
        <Link href={courseUrl} className="portal-link">
          Preview student course page
        </Link>
      </p>
    </div>
  );
}
