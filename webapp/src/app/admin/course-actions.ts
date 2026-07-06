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
import {
  getCourseTemplate,
  lectureSlotTitle,
  placeholderResourceName,
} from "@/lib/course-templates";
import {
  assignTargetToFields,
  INBOX_SECTION,
  INBOX_USE_LABEL,
  isInboxResource,
  type AssignTarget,
} from "@/lib/resource-kinds";
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

  const { data: duplicate } = await admin
    .from("resources")
    .select("id")
    .eq("course_code", courseCode)
    .eq("resource_collection_id", collectionId)
    .eq("name", name)
    .maybeSingle();

  if (duplicate) {
    throw new Error(`A file named "${name}" already exists in this course.`);
  }

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

export async function listResourceCollections() {
  await requireAdminProfile();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("resource_collections")
    .select("id, label, short_label")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export type CourseListRow = {
  course_code: string;
  collection_id: string;
  sort_order: number;
  code: string;
  title: string;
  semester: string | null;
  area: string | null;
  collection_label: string;
  collection_short_label: string;
  lecture_count: number;
  files_online: number;
  files_total: number;
};

export async function listCoursesForAdmin(): Promise<CourseListRow[]> {
  await requireAdminProfile();
  const admin = createAdminClient();

  const { data: memberships, error } = await admin
    .from("course_collection_members")
    .select(
      "course_code, collection_id, sort_order, courses(code, title, semester, area), resource_collections(id, label, short_label)"
    )
    .order("sort_order");

  if (error) throw new Error(error.message);

  const rows: CourseListRow[] = [];
  for (const row of memberships ?? []) {
    const course = Array.isArray(row.courses) ? row.courses[0] : row.courses;
    const collection = Array.isArray(row.resource_collections)
      ? row.resource_collections[0]
      : row.resource_collections;
    if (!course || !collection) continue;

    const [{ count: lectureCount }, { data: resources }] = await Promise.all([
      admin
        .from("lectures")
        .select("*", { count: "exact", head: true })
        .eq("course_code", course.code)
        .eq("resource_collection_id", collection.id),
      admin
        .from("resources")
        .select("storage_path, kind, section, use_label")
        .eq("course_code", course.code)
        .eq("resource_collection_id", collection.id),
    ]);

    const fileResources = (resources ?? []).filter((r) => r.kind !== "Local Media Source");
    const filesOnline = fileResources.filter((r) => r.storage_path).length;

    rows.push({
      course_code: row.course_code,
      collection_id: collection.id,
      sort_order: row.sort_order,
      code: course.code,
      title: course.title,
      semester: course.semester,
      area: course.area,
      collection_label: collection.label,
      collection_short_label: collection.short_label,
      lecture_count: lectureCount ?? 0,
      files_online: filesOnline,
      files_total: fileResources.length,
    });
  }

  return rows;
}

export async function createCourseFromTemplate(input: {
  collectionId: string;
  templateId: string;
  code: string;
  title: string;
  semester?: string | null;
  area?: string | null;
  libraryTier?: AccessTier;
  lectureCount?: number;
  includeCompanion?: boolean;
}): Promise<{ courseCode: string; collectionId: string }> {
  const { userId } = await requireAdminProfile();
  const admin = createAdminClient();

  const template = getCourseTemplate(input.templateId);
  if (!template) throw new Error("Unknown course template.");

  const code = input.code.trim();
  const title = input.title.trim();
  if (!code) throw new Error("Course code is required.");
  if (!title) throw new Error("Course title is required.");

  const lectureCount = Math.min(
    template.maxLectureCount,
    Math.max(template.minLectureCount, input.lectureCount ?? template.defaultLectureCount)
  );

  const { data: existingMember } = await admin
    .from("course_collection_members")
    .select("course_code")
    .eq("collection_id", input.collectionId)
    .eq("course_code", code)
    .maybeSingle();

  if (existingMember) {
    throw new Error(`Course ${code} already exists in this collection.`);
  }

  const { data: collection } = await admin
    .from("resource_collections")
    .select("id, source_tier")
    .eq("id", input.collectionId)
    .maybeSingle();

  if (!collection) throw new Error("Collection not found.");

  const { data: existingCourse } = await admin
    .from("courses")
    .select("code")
    .eq("code", code)
    .maybeSingle();

  const tier = input.libraryTier ?? (collection.source_tier as AccessTier) ?? "d1";

  const { count: memberCount } = await admin
    .from("course_collection_members")
    .select("*", { count: "exact", head: true })
    .eq("collection_id", input.collectionId);

  if (!existingCourse) {
    const { error: courseError } = await admin.from("courses").insert({
      code,
      title,
      semester: input.semester?.trim() || null,
      area: input.area?.trim() || null,
      sort_order: ((memberCount ?? 0) + 1) * 10,
      library_tier: tier,
      resource_collection_id: input.collectionId,
    });
    if (courseError) throw new Error(courseError.message);
  } else {
    const { error: courseError } = await admin
      .from("courses")
      .update({
        title,
        semester: input.semester?.trim() || null,
        area: input.area?.trim() || null,
        library_tier: tier,
      })
      .eq("code", code);
    if (courseError) throw new Error(courseError.message);
  }

  const { error: memberError } = await admin.from("course_collection_members").insert({
    collection_id: input.collectionId,
    course_code: code,
    sort_order: ((memberCount ?? 0) + 1) * 10,
    display_semester: input.semester?.trim() || null,
    display_area: input.area?.trim() || null,
  });
  if (memberError) throw new Error(memberError.message);

  const lectureRows = Array.from({ length: lectureCount }, (_, index) => {
    const n = index + 1;
    const lectureTitle = lectureSlotTitle(n);
    return {
      id: `${input.collectionId}-${courseSlug(code)}-lec-${n}`,
      course_code: code,
      resource_collection_id: input.collectionId,
      title: lectureTitle,
      sort_order: n * 10,
      synthetic: false,
    };
  });

  const { error: lectureError } = await admin.from("lectures").insert(lectureRows);
  if (lectureError) throw new Error(lectureError.message);

  const essentialRows = template.essentials
    .filter((e) => !e.optional || input.includeCompanion)
    .map((essential) => ({
      course_code: code,
      resource_collection_id: input.collectionId,
      name: placeholderResourceName(essential.slot),
      kind: essential.kind,
      ext: "PDF",
      section: essential.kind,
      use_label: `essential-${essential.slot}-placeholder`,
      is_canonical_syllabus: essential.isCanonicalSyllabus,
    }));

  if (essentialRows.length) {
    const { error: resourceError } = await admin.from("resources").insert(essentialRows);
    if (resourceError) throw new Error(resourceError.message);
  }

  await logContentEvent(admin, {
    courseCode: code,
    collectionId: input.collectionId,
    action: "course_create",
    summary: `Created course ${code} from ${template.label} (${lectureCount} lectures)`,
    actorId: userId,
  });

  revalidateCoursePaths(code, input.collectionId);
  return { courseCode: code, collectionId: input.collectionId };
}

export async function deleteCourse(courseCode: string, collectionId: string) {
  const { userId } = await requireAdminProfile();
  const admin = createAdminClient();

  const { data: resources } = await admin
    .from("resources")
    .select("id, storage_path")
    .eq("course_code", courseCode)
    .eq("resource_collection_id", collectionId);

  const storagePaths = (resources ?? [])
    .map((r) => r.storage_path)
    .filter((p): p is string => Boolean(p));

  if (storagePaths.length) {
    await admin.storage.from(BUCKET).remove(storagePaths);
  }

  await admin
    .from("resources")
    .delete()
    .eq("course_code", courseCode)
    .eq("resource_collection_id", collectionId);

  const { data: lectures } = await admin
    .from("lectures")
    .select("id")
    .eq("course_code", courseCode)
    .eq("resource_collection_id", collectionId);

  const lectureIds = (lectures ?? []).map((l) => l.id);
  if (lectureIds.length) {
    await admin.from("transcripts").delete().in("lecture_id", lectureIds);
    await admin
      .from("lectures")
      .delete()
      .eq("course_code", courseCode)
      .eq("resource_collection_id", collectionId);
  }

  await admin
    .from("course_collection_members")
    .delete()
    .eq("course_code", courseCode)
    .eq("collection_id", collectionId);

  const { count: otherMemberships } = await admin
    .from("course_collection_members")
    .select("*", { count: "exact", head: true })
    .eq("course_code", courseCode);

  const { count: otherLectures } = await admin
    .from("lectures")
    .select("*", { count: "exact", head: true })
    .eq("course_code", courseCode);

  const { count: otherResources } = await admin
    .from("resources")
    .select("*", { count: "exact", head: true })
    .eq("course_code", courseCode);

  if (
    (otherMemberships ?? 0) === 0 &&
    (otherLectures ?? 0) === 0 &&
    (otherResources ?? 0) === 0
  ) {
    await admin.from("courses").delete().eq("code", courseCode);
  }

  await logContentEvent(admin, {
    courseCode,
    collectionId,
    action: "course_delete",
    summary: `Deleted course ${courseCode} from collection`,
    actorId: userId,
  });

  revalidateCoursePaths(courseCode, collectionId);
}

export async function assignResourceToSlot(
  courseCode: string,
  collectionId: string,
  resourceId: number,
  target: AssignTarget
) {
  const { userId } = await requireAdminProfile();
  const admin = createAdminClient();

  let lectureTitle: string | undefined;
  if (target.type === "lecture") {
    const { data: lecture } = await admin
      .from("lectures")
      .select("title")
      .eq("id", target.lectureId)
      .maybeSingle();
    lectureTitle = lecture?.title;
  }

  const { data: existing } = await admin
    .from("resources")
    .select("section, use_label")
    .eq("id", resourceId)
    .eq("course_code", courseCode)
    .eq("resource_collection_id", collectionId)
    .maybeSingle();

  const fields = assignTargetToFields(target, lectureTitle);

  const { error } = await admin
    .from("resources")
    .update({
      kind: fields.kind,
      section: fields.section,
      use_label: fields.use_label,
      is_canonical_syllabus: fields.is_canonical_syllabus,
    })
    .eq("id", resourceId)
    .eq("course_code", courseCode)
    .eq("resource_collection_id", collectionId);

  if (error) throw new Error(error.message);

  await logContentEvent(admin, {
    courseCode,
    collectionId,
    action: "resource_assign",
    summary: `Assigned resource #${resourceId} to ${fields.section}`,
    actorId: userId,
  });

  revalidateCoursePaths(courseCode, collectionId);

  if (existing && isInboxResource(existing)) {
    await finalizeUploadBatchNotify(courseCode, collectionId, 1);
  }
}

export async function reorderLectures(
  courseCode: string,
  collectionId: string,
  orderedLectureIds: string[]
) {
  const { userId } = await requireAdminProfile();
  const admin = createAdminClient();

  for (let i = 0; i < orderedLectureIds.length; i++) {
    const { error } = await admin
      .from("lectures")
      .update({ sort_order: (i + 1) * 10 })
      .eq("id", orderedLectureIds[i])
      .eq("course_code", courseCode)
      .eq("resource_collection_id", collectionId);
    if (error) throw new Error(error.message);
  }

  await logContentEvent(admin, {
    courseCode,
    collectionId,
    action: "lecture_reorder",
    summary: `Reordered ${orderedLectureIds.length} lectures`,
    actorId: userId,
  });

  revalidateCoursePaths(courseCode, collectionId);
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
