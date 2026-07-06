export type UploadResult = {
  ok: boolean;
  uploaded: number;
  resourceIds: number[];
  errors: string[];
};

export function uploadCourseFiles(input: {
  courseCode: string;
  collectionId: string;
  files: File[];
  resourceId?: number;
  inbox?: boolean;
  onProgress?: (pct: number) => void;
}): Promise<UploadResult> {
  const form = new FormData();
  form.set("courseCode", input.courseCode);
  form.set("collectionId", input.collectionId);
  if (input.resourceId) form.set("resourceId", String(input.resourceId));
  if (input.inbox) form.set("inbox", "1");

  for (const file of input.files) {
    form.append("file", file);
  }

  // XMLHttpRequest instead of fetch so we get real upload progress events.
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/course-resource/upload");

    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) return;
      // Cap at 95% until the server responds (processing/storage time).
      const pct = Math.min(95, Math.round((event.loaded / event.total) * 100));
      input.onProgress?.(pct);
    });

    xhr.addEventListener("load", () => {
      input.onProgress?.(100);
      try {
        const body = JSON.parse(xhr.responseText);
        resolve({
          ok: Boolean(body.ok),
          uploaded: body.uploaded ?? 0,
          resourceIds: body.resourceIds ?? [],
          errors: body.errors ?? (body.error ? [body.error] : []),
        });
      } catch {
        resolve({ ok: false, uploaded: 0, resourceIds: [], errors: ["Unexpected server response."] });
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error during upload.")));
    xhr.addEventListener("abort", () => reject(new Error("Upload was cancelled.")));

    xhr.send(form);
  });
}
