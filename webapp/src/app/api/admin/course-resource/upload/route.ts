import { NextResponse } from "next/server";
import { authorizeCourseUpload } from "@/lib/course-upload-auth";
import { getUploadMaxBytes } from "@/lib/course-storage";
import {
  createResource,
  finalizeUploadBatchNotify,
  uploadCourseResourceFile,
} from "@/app/admin/course-actions";
import { INBOX_SECTION, INBOX_USE_LABEL } from "@/lib/resource-kinds";

export async function POST(request: Request) {
  const actor = await authorizeCourseUpload(request);
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Not authorized." }, { status: 401 });
  }

  const form = await request.formData();
  const courseCode = String(form.get("courseCode") ?? "").trim();
  const collectionId = String(form.get("collectionId") ?? "").trim();

  if (!courseCode || !collectionId) {
    return NextResponse.json(
      { ok: false, error: "courseCode and collectionId are required." },
      { status: 400 }
    );
  }

  const maxBytes = getUploadMaxBytes();
  const actorId = actor.kind === "admin" ? actor.userId : null;

  const entries = [...form.entries()].filter(([key]) => key === "file" || key.startsWith("file"));
  const fileEntries = entries.length
    ? entries
    : form.get("file")
      ? [["file", form.get("file")] as [string, FormDataEntryValue]]
      : [];

  const resourceIdRaw = form.get("resourceId");
  const inbox = form.get("inbox") === "1";
  const uploaded: string[] = [];
  const errors: string[] = [];

  const files = fileEntries
    .map(([, value]) => value)
    .filter((value): value is File => value instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ ok: false, error: "No files provided." }, { status: 400 });
  }

  for (const file of files) {
    if (file.size > maxBytes) {
      errors.push(`${file.name}: exceeds ${maxBytes / (1024 * 1024)} MB limit`);
      continue;
    }

    try {
      let resourceId = resourceIdRaw ? Number(resourceIdRaw) : NaN;

      if (!Number.isFinite(resourceId)) {
        resourceId = await createResource(
          courseCode,
          collectionId,
          {
            name: file.name,
            section: inbox ? INBOX_SECTION : null,
            use_label: inbox ? INBOX_USE_LABEL : null,
          },
          actorId
        );
      }

      const buffer = await file.arrayBuffer();
      const result = await uploadCourseResourceFile(
        courseCode,
        collectionId,
        resourceId,
        buffer,
        file.name,
        actorId
      );
      uploaded.push(result.storagePath);
    } catch (err) {
      errors.push(`${file.name}: ${err instanceof Error ? err.message : "upload failed"}`);
    }
  }

  if (uploaded.length > 0 && !inbox) {
    await finalizeUploadBatchNotify(courseCode, collectionId, uploaded.length);
  }

  return NextResponse.json({
    ok: errors.length === 0,
    uploaded: uploaded.length,
    storagePaths: uploaded,
    errors,
  });
}
