export async function uploadCourseFiles(input: {
  courseCode: string;
  collectionId: string;
  files: File[];
  resourceId?: number;
  inbox?: boolean;
  onProgress?: (pct: number) => void;
}): Promise<{ ok: boolean; uploaded: number; errors: string[] }> {
  const form = new FormData();
  form.set("courseCode", input.courseCode);
  form.set("collectionId", input.collectionId);
  if (input.resourceId) form.set("resourceId", String(input.resourceId));
  if (input.inbox) form.set("inbox", "1");

  for (const file of input.files) {
    form.append("file", file);
  }

  input.onProgress?.(10);

  const res = await fetch("/api/admin/course-resource/upload", {
    method: "POST",
    body: form,
  });

  input.onProgress?.(90);
  const body = await res.json();
  input.onProgress?.(100);

  return {
    ok: Boolean(body.ok),
    uploaded: body.uploaded ?? 0,
    errors: body.errors ?? (body.error ? [body.error] : []),
  };
}
