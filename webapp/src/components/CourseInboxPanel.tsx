"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignResourceToSlot } from "@/app/admin/course-actions";
import { FileCategoryPicker } from "@/components/FileCategoryPicker";
import { uploadCourseFiles } from "@/lib/course-upload-client";
import type { CourseEditorData } from "@/app/admin/course-actions";
import { isInboxResource } from "@/lib/resource-kinds";
import type { AssignTarget } from "@/lib/resource-kinds";

type Props = {
  data: CourseEditorData;
};

export function CourseInboxPanel({ data }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<Record<number, string>>({});

  const inbox = data.resources.filter(isInboxResource);
  const lectures = data.lectures.map((l) => ({ id: l.id, title: l.title }));

  async function handleDrop(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setMessage(null);
    setProgress(0);
    const result = await uploadCourseFiles({
      courseCode: data.course.code,
      collectionId: data.collection.id,
      files: [...files],
      inbox: true,
      onProgress: setProgress,
    });
    setProgress(null);
    if (!result.ok) {
      setError(result.errors.join(" ") || "Upload failed.");
      return;
    }
    setMessage(`Uploaded ${result.uploaded} file(s) to inbox.`);
    router.refresh();
  }

  function assign(resourceId: number, target: AssignTarget) {
    startTransition(async () => {
      setError(null);
      try {
        await assignResourceToSlot(
          data.course.code,
          data.collection.id,
          resourceId,
          target
        );
        setMessage("File assigned.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Assign failed.");
      }
    });
  }

  return (
    <section className="app-card overflow-hidden">
      <div className="portal-bar border-0 border-b border-brand-line px-3 py-2">
        <h2 className="text-sm font-bold uppercase text-brand-navy">Inbox</h2>
      </div>
      <div className="space-y-4 p-4">
        <p className="text-sm text-brand-muted">
          Drop files here first, then assign each one to a syllabus slot, lecture, or extras section.
        </p>

        <label className="flex cursor-pointer flex-col items-center justify-center border-2 border-dashed border-brand-line bg-brand-soft/50 px-6 py-8 text-center hover:border-brand-blue">
          <span className="text-sm font-semibold text-brand-navy">Drop files or click to upload</span>
          <span className="mt-1 text-xs text-brand-muted">PDF, PPTX, DOCX, images</span>
          <input
            type="file"
            multiple
            className="hidden"
            disabled={pending}
            onChange={(e) => handleDrop(e.target.files)}
          />
        </label>

        {progress !== null && (
          <div className="h-2 w-full bg-brand-soft">
            <div
              className="h-full bg-brand-blue transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {message && (
          <p className="text-sm text-emerald-800">{message}</p>
        )}
        {error && (
          <p className="text-sm text-red-800">{error}</p>
        )}

        {inbox.length > 0 ? (
          <ul className="divide-y divide-brand-line border border-brand-line">
            {inbox.map((resource) => (
              <li
                key={resource.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-brand-ink">{resource.name}</p>
                  <p className="text-xs text-brand-muted">
                    {resource.storage_path ? "Ready to assign" : "Uploading…"}
                  </p>
                </div>
                <FileCategoryPicker
                  value={assigning[resource.id] ?? ""}
                  lectures={lectures}
                  disabled={pending}
                  onChange={(target) => {
                    setAssigning((prev) => ({ ...prev, [resource.id]: "..." }));
                    assign(resource.id, target);
                  }}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-brand-muted">No unassigned files.</p>
        )}
      </div>
    </section>
  );
}
