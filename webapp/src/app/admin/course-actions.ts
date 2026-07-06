"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { requireAdminProfile } from "@/app/admin/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  BUCKET,
  buildAdminUploadStorageKey,
  bytesToMb,
  courseSlug,
  fileExtension,
} from "@/lib/course-storage";
import { notifyCourseContentBatch } from "@/lib/course-notify";
import type { AccessTier } from "@/lib/tiers";

export type CourseEditorData = {
  course: {
    code: string;
    title: string;
    semester: string | null;
    area: string | null;
    sort_order: number;
    library_tier: string;
    resource_collection_id: string;
  };
  collection: {
    id: string;
    label: string;
    short_label: string;
  };
  lectures: Array<{
    id: string;
    title: string;
    lecture_date: string | null;
    transcript_source: string | null;
    youtube_id: string | null;
    youtube_visibility: string | null;
    synthetic: boolean;
    sort_order: number;
    transcript: string | null;
  }>;
  resources: Array<{
    id: number;
    name: string;
    kind: string | null;
    ext: string | null;
    section: string | null;
    use_label: string | null;
    size_mb: number | null;
    storage_path: string | null;
    is_canonical_syllabus: boolean;
  }>;
  events: Array<{
    id: number;
    action: string;
    summary: string;
    created_at: string;
    actor_id: string | null;
  }>;
};

async function logContentEvent(
  admin: ReturnType<typeof createAdminClient>,
  input: {
    courseCode: string;
    collectionId: string;
    action: string;
    summary: string;
    actorId: string | null;
  }
) {
  const { error } = await admin.from("content_events").insert({
    course_code: input.courseCode,
    collection_id: input.collectionId,
    action: input.action,
    summary: input.summary,
    actor_id: input.actorId,
  });
  if (error) console.error("content_events insert failed:", error.message);
}

function revalidateCoursePaths(courseCode: string, collectionId: string) {
  const encoded = encodeURIComponent(courseCode);
  revalidatePath(`/course/${encoded}`);
  revalidatePath(`/admin/courses/${encoded}`);
  revalidatePath("/admin/courses");
  revalidatePath("/home");
  revalidatePath("/library");
}

export async function getCourseEditorData(
  courseCode: string,
  collectionId: string
): Promise<CourseEditorData | null> {
  await requireAdminProfile();
  const admin = createAdminClient();

  const { data: membership } = await admin
    .from("course_collection_members")
    .select(
      "collection_id, courses(code, title, semester, area, sort_order, library_tier, resource_collection_id), resource_collections(id, label, short_label)"
    )
    .eq("course_code", courseCode)
    .eq("collection_id", collectionId)
    .maybeSingle();

  if (!membership) return null;

  const course = Array.isArray(membership.courses) ? membership.courses[0] : membership.courses;
  const collection = Array.isArray(membership.resource_collections)
    ? membership.resource_collections[0]
    : membership.resource_collections;
  if (!course || !collection) return null;

  const [{ data: lectures }, { data: resources }, { data: transcripts }, eventsResult] =
    await Promise.all([
      admin
        .from("lectures")
        .select(
          "id, title, lecture_date, transcript_source, youtube_id, youtube_visibility, synthetic, sort_order"
        )
        .eq("course_code", courseCode)
        .eq("resource_collection_id", collectionId)
        .order("sort_order"),
      admin
        .from("resources")
        .select(
          "id, name, kind, ext, section, use_label, size_mb, storage_path, is_canonical_syllabus"
        )
        .eq("course_code", courseCode)
        .eq("resource_collection_id", collectionId)
        .order("name"),
      admin.from("transcripts").select("lecture_id, content"),
      admin
        .from("content_events")
        .select("id, action, summary, created_at, actor_id")
        .eq("course_code", courseCode)
        .eq("collection_id", collectionId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const events = eventsResult.error ? [] : ((eventsResult.data ?? []) as CourseEditorData["events"]);

  const transcriptByLecture = new Map(
    (transcripts ?? []).map((row: { lecture_id: string; content: string }) => [
      row.lecture_id,
      row.content,
    ])
  );

  return {
    course: course as CourseEditorData["course"],
    collection: collection as CourseEditorData["collection"],
    lectures: (lectures ?? []).map((lecture) => ({
      ...lecture,
      transcript: transcriptByLecture.get(lecture.id) ?? null,
    })),
    resources: (resources ?? []) as CourseEditorData["resources"],
    events,
  };
}

export async function updateCourseMetadata(
  courseCode: string,
  collectionId: string,
  fields: {
    title: string;
    semester?: string | null;
    area?: string | null;
    sort_order?: number;
    library_tier?: AccessTier;
  }
) {
  const { userId } = await requireAdminProfile();
  const admin = createAdminClient();
  const title = fields.title.trim();
  if (!title) throw new Error("Course title is required.");

  const { error } = await admin
    .from("courses")
    .update({
      title,
      semester: fields.semester?.trim() || null,
      area: fields.area?.trim() || null,
      sort_order: fields.sort_order ?? 0,
      library_tier: fields.library_tier ?? "d1",
    })
    .eq("code", courseCode)
    .eq("resource_collection_id", collectionId);

  if (error) throw new Error(error.message);

  await logContentEvent(admin, {
    courseCode,
    collectionId,
    action: "course_edit",
    summary: `Updated course metadata for ${courseCode}`,
    actorId: userId,
  });

  revalidateCoursePaths(courseCode, collectionId);
}

export async function createLecture(
  courseCode: string,
  collectionId: string,
  fields: {
    title: string;
    lecture_date?: string | null;
    youtube_id?: string | null;
    sort_order?: number;
  }
) {
  const { userId } = await requireAdminProfile();
  const admin = createAdminClient();
  const title = fields.title.trim();
  if (!title) throw new Error("Lecture title is required.");

  const id = `${collectionId}-${courseSlug(courseCode)}-${randomUUID().slice(0, 8)}`;

  const { error } = await admin.from("lectures").insert({
    id,
    course_code: courseCode,
    resource_collection_id: collectionId,
    title,
    lecture_date: fields.lecture_date || null,
    youtube_id: fields.youtube_id?.trim() || null,
    youtube_visibility: fields.youtube_id?.trim() ? "public" : null,
    sort_order: fields.sort_order ?? 0,
    synthetic: false,
  });

  if (error) throw new Error(error.message);

  await logContentEvent(admin, {
    courseCode,
    collectionId,
    action: "lecture_create",
    summary: `Added lecture: ${title}`,
    actorId: userId,
  });

  revalidateCoursePaths(courseCode, collectionId);
  return id;
}

export async function updateLecture(
  courseCode: string,
  collectionId: string,
  lectureId: string,
  fields: {
    title?: string;
    lecture_date?: string | null;
    youtube_id?: string | null;
    sort_order?: number;
  }
) {
  const { userId } = await requireAdminProfile();
  const admin = createAdminClient();

  const update: Record<string, unknown> = {};
  if (fields.title !== undefined) {
    const title = fields.title.trim();
    if (!title) throw new Error("Lecture title is required.");
    update.title = title;
  }
  if (fields.lecture_date !== undefined) update.lecture_date = fields.lecture_date || null;
  if (fields.youtube_id !== undefined) {
    update.youtube_id = fields.youtube_id?.trim() || null;
    update.youtube_visibility = fields.youtube_id?.trim() ? "public" : null;
  }
  if (fields.sort_order !== undefined) update.sort_order = fields.sort_order;

  const { error } = await admin
    .from("lectures")
    .update(update)
    .eq("id", lectureId)
    .eq("course_code", courseCode)
    .eq("resource_collection_id", collectionId);

  if (error) throw new Error(error.message);

  await logContentEvent(admin, {
    courseCode,
    collectionId,
    action: "lecture_edit",
    summary: `Updated lecture ${lectureId}`,
    actorId: userId,
  });

  revalidateCoursePaths(courseCode, collectionId);
}

export async function deleteLecture(
  courseCode: string,
  collectionId: string,
  lectureId: string
) {
  const { userId } = await requireAdminProfile();
  const admin = createAdminClient();

  const { error } = await admin
    .from("lectures")
    .delete()
    .eq("id", lectureId)
    .eq("course_code", courseCode)
    .eq("resource_collection_id", collectionId);

  if (error) throw new Error(error.message);

  await logContentEvent(admin, {
    courseCode,
    collectionId,
    action: "lecture_delete",
    summary: `Deleted lecture ${lectureId}`,
    actorId: userId,
  });

  revalidateCoursePaths(courseCode, collectionId);
}

export async function saveTranscript(
  courseCode: string,
  collectionId: string,
  lectureId: string,
  content: string
) {
  const { userId } = await requireAdminProfile();
  const admin = createAdminClient();
  const trimmed = content.trim();

  if (!trimmed) {
    const { error } = await admin.from("transcripts").delete().eq("lecture_id", lectureId);
    if (error) throw new Error(error.message);
  } else {
    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
    const { error } = await admin.from("transcripts").upsert({
      lecture_id: lectureId,
      content: trimmed,
      word_count: wordCount,
      download_name: `${lectureId}.txt`,
    });
    if (error) throw new Error(error.message);
  }

  await logContentEvent(admin, {
    courseCode,
    collectionId,
    action: "transcript_edit",
    summary: `Updated transcript for ${lectureId}`,
    actorId: userId,
  });

  revalidateCoursePaths(courseCode, collectionId);
}

export async function createResource(
  courseCode: string,
  collectionId: string,
  fields: {
    name: string;
    kind?: string | null;
    section?: string | null;
    use_label?: string | null;
    is_canonical_syllabus?: boolean;
  },
  actorId?: string | null
) {
  const userId =
    actorId !== undefined ? actorId : (await requireAdminProfile()).userId;
  const admin = createAdminClient();
  const name = fields.name.trim();
  if (!name) throw new Error("Resource name is required.");

  const { data, error } = await admin
    .from("resources")
    .insert({
      course_code: courseCode,
      resource_collection_id: collectionId,
      name,
      kind: fields.kind?.trim() || "Document",
      ext: fileExtension(name),
      section: fields.section?.trim() || null,
      use_label: fields.use_label?.trim() || null,
      is_canonical_syllabus: Boolean(fields.is_canonical_syllabus),
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await logContentEvent(admin, {
    courseCode,
    collectionId,
    action: "resource_create",
    summary: `Added resource row: ${name}`,
    actorId: userId,
  });

  revalidateCoursePaths(courseCode, collectionId);
  return data.id as number;
}

export async function updateResource(
  courseCode: string,
  collectionId: string,
  resourceId: number,
  fields: {
    name?: string;
    kind?: string | null;
    section?: string | null;
    use_label?: string | null;
    is_canonical_syllabus?: boolean;
  }
) {
  const { userId } = await requireAdminProfile();
  const admin = createAdminClient();

  const update: Record<string, unknown> = {};
  if (fields.name !== undefined) {
    const name = fields.name.trim();
    if (!name) throw new Error("Resource name is required.");
    update.name = name;
    update.ext = fileExtension(name);
  }
  if (fields.kind !== undefined) update.kind = fields.kind?.trim() || null;
  if (fields.section !== undefined) update.section = fields.section?.trim() || null;
  if (fields.use_label !== undefined) update.use_label = fields.use_label?.trim() || null;
  if (fields.is_canonical_syllabus !== undefined) {
    update.is_canonical_syllabus = fields.is_canonical_syllabus;
  }

  const { error } = await admin
    .from("resources")
    .update(update)
    .eq("id", resourceId)
    .eq("course_code", courseCode)
    .eq("resource_collection_id", collectionId);

  if (error) throw new Error(error.message);

  await logContentEvent(admin, {
    courseCode,
    collectionId,
    action: "resource_edit",
    summary: `Updated resource #${resourceId}`,
    actorId: userId,
  });

  revalidateCoursePaths(courseCode, collectionId);
}

export async function deleteResource(
  courseCode: string,
  collectionId: string,
  resourceId: number,
  actorId?: string | null
) {
  const userId =
    actorId !== undefined ? actorId : (await requireAdminProfile()).userId;
  const admin = createAdminClient();

  const { data: resource } = await admin
    .from("resources")
    .select("name, storage_path")
    .eq("id", resourceId)
    .eq("course_code", courseCode)
    .eq("resource_collection_id", collectionId)
    .maybeSingle();

  if (!resource) throw new Error("Resource not found.");

  if (resource.storage_path) {
    const { error: storageError } = await admin.storage
      .from(BUCKET)
      .remove([resource.storage_path]);
    if (storageError) throw new Error(storageError.message);
  }

  const { error } = await admin
    .from("resources")
    .delete()
    .eq("id", resourceId)
    .eq("course_code", courseCode)
    .eq("resource_collection_id", collectionId);

  if (error) throw new Error(error.message);

  await logContentEvent(admin, {
    courseCode,
    collectionId,
    action: "resource_delete",
    summary: `Deleted resource: ${resource.name}`,
    actorId: userId,
  });

  revalidateCoursePaths(courseCode, collectionId);
}

export async function uploadCourseResourceFile(
  courseCode: string,
  collectionId: string,
  resourceId: number,
  fileBuffer: ArrayBuffer,
  fileName: string,
  actorId: string | null
): Promise<{ storagePath: string }> {
  const admin = createAdminClient();

  const { data: resource } = await admin
    .from("resources")
    .select("id, name, storage_path")
    .eq("id", resourceId)
    .eq("course_code", courseCode)
    .eq("resource_collection_id", collectionId)
    .maybeSingle();

  if (!resource) throw new Error("Resource not found.");

  const storagePath = buildAdminUploadStorageKey(collectionId, courseCode, fileName);

  if (resource.storage_path && resource.storage_path !== storagePath) {
    await admin.storage.from(BUCKET).remove([resource.storage_path]);
  }

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, fileBuffer, { upsert: true, contentType: guessContentType(fileName) });

  if (uploadError) throw new Error(uploadError.message);

  const { error: updateError } = await admin
    .from("resources")
    .update({
      storage_path: storagePath,
      size_mb: bytesToMb(fileBuffer.byteLength),
      ext: fileExtension(fileName),
    })
    .eq("id", resourceId);

  if (updateError) throw new Error(updateError.message);

  await logContentEvent(admin, {
    courseCode,
    collectionId,
    action: "upload",
    summary: `Uploaded file: ${fileName}`,
    actorId,
  });

  revalidateCoursePaths(courseCode, collectionId);
  return { storagePath };
}

export async function finalizeUploadBatchNotify(
  courseCode: string,
  collectionId: string,
  fileCount: number
) {
  if (fileCount <= 0) return;

  const admin = createAdminClient();
  const { data: course } = await admin
    .from("courses")
    .select("title")
    .eq("code", courseCode)
    .eq("resource_collection_id", collectionId)
    .maybeSingle();

  const { data: collection } = await admin
    .from("resource_collections")
    .select("label")
    .eq("id", collectionId)
    .maybeSingle();

  await notifyCourseContentBatch({
    courseCode,
    courseTitle: course?.title ?? courseCode,
    fileCount,
    collectionId,
    collectionLabel: collection?.label ?? null,
  });
}

function guessContentType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".txt")) return "text/plain";
  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (lower.endsWith(".pptx")) {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }
  return "application/octet-stream";
}
