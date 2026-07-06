"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignResourceToSlot } from "@/app/admin/course-actions";
import { FileCategoryPicker } from "@/components/FileCategoryPicker";
import { uploadCourseFiles } from "@/lib/course-upload-client";
import type { CourseEditorData } from "@/app/admin/course-actions";
import type { AssignTarget } from "@/lib/resource-kinds";

type UploadMode = "single" | "multiple";

type Props = {
  data: CourseEditorData;
  onMessage?: (msg: string | null) => void;
  onError?: (err: string | null) => void;
  onProgress?: (pct: number | null) => void;
};

export function CourseUploadBar({ data, onMessage, onError, onProgress }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<UploadMode>("single");
  const [singleFile, setSingleFile] = useState<File | null>(null);
  const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null);

  const lectures = data.lectures.map((l) => ({ id: l.id, title: l.title }));

  async function uploadMultiple(files: FileList | null) {
    if (!files?.length) return;
    onError?.(null);
    onMessage?.(null);
    onProgress?.(0);

    try {
      const result = await uploadCourseFiles({
        courseCode: data.course.code,
        collectionId: data.collection.id,
        files: [...files],
        inbox: true,
        onProgress: onProgress,
      });

      if (!result.ok) {
        onError?.(result.errors.join(" ") || "Upload failed.");
        return;
      }
      onMessage?.(`Uploaded ${result.uploaded} file(s) to inbox. Assign each one below.`);
      router.refresh();
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      onProgress?.(null);
    }
  }

  function uploadSingle() {
    if (!singleFile || !assignTarget) return;
    onError?.(null);
    onMessage?.(null);
    onProgress?.(0);

    startTransition(async () => {
      try {
        const result = await uploadCourseFiles({
          courseCode: data.course.code,
          collectionId: data.collection.id,
          files: [singleFile],
          inbox: true,
          onProgress,
        });

        if (!result.ok) {
          onProgress?.(null);
          onError?.(result.errors.join(" ") || "Upload failed.");
          return;
        }

        const resourceId = result.resourceIds[0];

        if (!resourceId) {
          onProgress?.(null);
          onError?.("Upload succeeded but could not find the new file.");
          router.refresh();
          return;
        }

        await assignResourceToSlot(
          data.course.code,
          data.collection.id,
          resourceId,
          assignTarget
        );

        onProgress?.(null);
        setSingleFile(null);
        setAssignTarget(null);
        onMessage?.("File uploaded and assigned.");
        router.refresh();
      } catch (err) {
        onProgress?.(null);
        onError?.(err instanceof Error ? err.message : "Upload failed.");
      }
    });
  }

  return (
    <section className="app-card overflow-hidden">
      <div className="portal-bar flex flex-wrap items-center justify-between gap-2 border-0 border-b border-brand-line px-3 py-2">
        <h2 className="text-sm font-bold uppercase text-brand-navy">Upload files</h2>
        <div className="flex rounded border border-brand-line text-xs font-semibold">
          <button
            type="button"
            className={`px-3 py-1.5 ${mode === "single" ? "bg-brand-navy text-white" : "text-brand-navy"}`}
            onClick={() => setMode("single")}
          >
            Single file
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 ${mode === "multiple" ? "bg-brand-navy text-white" : "text-brand-navy"}`}
            onClick={() => setMode("multiple")}
          >
            Multiple files
          </button>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {mode === "single" ? (
          <>
            <p className="text-sm text-brand-muted">
              Pick one file, choose where it goes, and upload in one step.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold text-brand-muted">File</span>
                <input
                  type="file"
                  className="app-input mt-1 w-full text-sm"
                  disabled={pending}
                  onChange={(e) => setSingleFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-brand-muted">Assign to</span>
                <FileCategoryPicker
                  value=""
                  lectures={lectures}
                  sections={data.sections}
                  disabled={pending}
                  onChange={(target) => setAssignTarget(target)}
                />
              </label>
            </div>
            {singleFile && (
              <p className="text-sm text-brand-ink">
                Selected: <span className="font-medium">{singleFile.name}</span>
              </p>
            )}
            <button
              type="button"
              className="portal-button-primary px-4 py-2 text-sm"
              disabled={pending || !singleFile || !assignTarget}
              onClick={uploadSingle}
            >
              Upload &amp; assign
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-brand-muted">
              Drop several files at once. They land in the inbox for batch assignment.
            </p>
            <label className="flex cursor-pointer flex-col items-center justify-center border-2 border-dashed border-brand-line bg-brand-soft/50 px-6 py-8 text-center hover:border-brand-blue">
              <span className="text-sm font-semibold text-brand-navy">Drop files or click to upload</span>
              <span className="mt-1 text-xs text-brand-muted">PDF, PPTX, DOCX, images</span>
              <input
                type="file"
                multiple
                className="hidden"
                disabled={pending}
                onChange={(e) => uploadMultiple(e.target.files)}
              />
            </label>
          </>
        )}
      </div>
    </section>
  );
}
