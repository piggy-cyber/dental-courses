// Imports one or more resource collection manifests into Supabase.
//
// Usage:
//   node scripts/import-resource-manifest.mjs --dry
//   node scripts/import-resource-manifest.mjs --file private-staging/resource-manifests/d2-2025-2026.json --dry
//   node scripts/import-resource-manifest.mjs --file private-staging/resource-manifests/d2-2025-2026.json
//
// Manifests live under private-staging/resource-manifests by default. The import
// only replaces lectures, transcripts, resources, and memberships for the target
// collection. Existing global course records are reused when a course code
// already exists, so an import cannot wipe the D1 library.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./lib/data.mjs";
import { readFlagValue } from "./lib/storage-reconcile.mjs";

const webappRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(webappRoot, "..");
const manifestRoot = path.join(repoRoot, "private-staging/resource-manifests");
const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry") || argv.includes("--dry-run");
const fileFlag = readFlagValue(argv, "file");

loadEnv(webappRoot);

function cleanText(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function countWords(value) {
  const words = String(value || "").trim().match(/\S+/g);
  return words?.length ?? 0;
}

function asNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function requireArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }
  return value;
}

function assertDate(value, label) {
  if (value == null || value === "") return null;
  const cleaned = cleanText(value);
  if (!cleaned) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    throw new Error(`${label} must use YYYY-MM-DD.`);
  }
  return cleaned;
}

function extFromName(name) {
  const ext = path.extname(name).replace(/^\./, "");
  return ext ? ext.toUpperCase() : null;
}

function normalizeStoragePath(value) {
  const cleaned = cleanText(value);
  if (!cleaned) return null;
  if (cleaned.startsWith("/") || cleaned.includes("..")) {
    throw new Error("storagePath must be a bucket-relative path.");
  }
  return cleaned;
}

function uniqueLectureId(base, usedIds) {
  const slug = slugify(base) || "lecture";
  let id = slug;
  let suffix = 2;
  while (usedIds.has(id)) {
    id = `${slug}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(id);
  return id;
}

function normalizeTranscript(value) {
  if (!value) return null;
  if (typeof value === "string") {
    const content = value.trim();
    if (!content) return null;
    return {
      content,
      word_count: countWords(content),
      download_name: null,
    };
  }
  if (typeof value === "object" && typeof value.content === "string") {
    const content = value.content.trim();
    if (!content) return null;
    return {
      content,
      word_count: Number.isInteger(value.wordCount) ? value.wordCount : countWords(content),
      download_name: cleanText(value.downloadName),
    };
  }
  throw new Error("lecture transcript must be a string or an object with content.");
}

function resolveManifestPaths() {
  if (fileFlag) {
    const inputPath = path.isAbsolute(fileFlag) ? fileFlag : path.resolve(repoRoot, fileFlag);
    return [inputPath];
  }
  if (!existsSync(manifestRoot)) return [];
  return readdirSync(manifestRoot)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => path.join(manifestRoot, name));
}

function parseManifest(manifestPath) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const collection = manifest.collection ?? {};
  const label = cleanText(collection.label);
  const shortLabel = cleanText(collection.shortLabel) ?? label;
  const id = cleanText(collection.id) ?? slugify(label);
  const sourceTier = cleanText(collection.sourceTier)?.toLowerCase() ?? null;
  const sourceCohort = cleanText(collection.sourceCohort)?.toLowerCase() ?? null;

  if (!id || !/^[a-z0-9][a-z0-9-]{2,62}$/.test(id)) {
    throw new Error("collection.id must use lowercase letters, numbers, and hyphens.");
  }
  if (!label) throw new Error("collection.label is required.");
  if (!shortLabel) throw new Error("collection.shortLabel is required.");
  if (sourceTier && !["d1", "d2", "d3", "d4"].includes(sourceTier)) {
    throw new Error("collection.sourceTier must be d1, d2, d3, or d4.");
  }
  if (collection.defaultForTier === true) {
    throw new Error("defaultForTier must be false or omitted. Admins grant D2 collections manually.");
  }

  const warnings = [];
  const coursesInput = requireArray(manifest.courses ?? [], "courses");
  const lecturesInput = requireArray(manifest.lectures ?? [], "lectures");
  const resourcesInput = requireArray(manifest.resources ?? [], "resources");

  const seenCourseCodes = new Set();
  const courseRows = coursesInput.map((course, index) => {
    const code = cleanText(course.code);
    const title = cleanText(course.title);
    if (!code || !title) throw new Error(`courses[${index}] requires code and title.`);
    if (seenCourseCodes.has(code)) throw new Error(`Duplicate course code in manifest: ${code}`);
    seenCourseCodes.add(code);
    return {
      code,
      title,
      semester: cleanText(course.semester),
      semester_id: cleanText(course.semesterId),
      area: cleanText(course.area),
      sort_order: Number.isInteger(course.sortOrder) ? course.sortOrder : index * 10,
      resource_collection_id: id,
    };
  });

  const courseCodes = new Set(courseRows.map((course) => course.code));
  const usedLectureIds = new Set();
  const transcriptRows = [];
  const lectureRows = lecturesInput.map((lecture, index) => {
    const courseCode = cleanText(lecture.courseCode);
    const title = cleanText(lecture.title);
    if (!courseCode || !title) throw new Error(`lectures[${index}] requires courseCode and title.`);
    if (!courseCodes.has(courseCode)) {
      throw new Error(`lectures[${index}] references missing course ${courseCode}.`);
    }
    const explicitId = cleanText(lecture.id);
    if (explicitId && usedLectureIds.has(explicitId)) {
      throw new Error(`Duplicate lecture id in manifest: ${explicitId}`);
    }
    const lectureId =
      explicitId ?? uniqueLectureId(`${id}-${courseCode}-${title}-${index + 1}`, usedLectureIds);
    usedLectureIds.add(lectureId);
    const transcript = normalizeTranscript(lecture.transcript);
    if (transcript) {
      transcriptRows.push({
        lecture_id: lectureId,
        ...transcript,
      });
    }
    const youtubeId = cleanText(lecture.youtubeId);
    return {
      id: lectureId,
      course_code: courseCode,
      title,
      lecture_date: assertDate(lecture.date, `lectures[${index}].date`),
      transcript_source: transcript ? "manifest" : null,
      youtube_id: youtubeId,
      youtube_visibility: youtubeId ? cleanText(lecture.youtubeVisibility) ?? "unlisted" : null,
      synthetic: Boolean(lecture.synthetic),
      sort_order: Number.isInteger(lecture.sortOrder) ? lecture.sortOrder : index * 10,
      resource_collection_id: id,
    };
  });

  const resourceRows = resourcesInput.map((resource, index) => {
    const courseCode = cleanText(resource.courseCode);
    const name = cleanText(resource.name);
    const kind = cleanText(resource.kind);
    if (!courseCode || !name || !kind) {
      throw new Error(`resources[${index}] requires courseCode, name, and kind.`);
    }
    if (!courseCodes.has(courseCode)) {
      throw new Error(`resources[${index}] references missing course ${courseCode}.`);
    }
    if (resource.localPath && !resource.storagePath) {
      warnings.push(
        `resources[${index}] has localPath but no storagePath. Upload later with scripts/upload-files.mjs --collection ${id}.`
      );
    }
    return {
      course_code: courseCode,
      name,
      kind,
      ext: cleanText(resource.ext)?.toUpperCase() ?? extFromName(name),
      section: cleanText(resource.section) ?? "Course Root",
      use_label: cleanText(resource.useLabel),
      size_mb: asNumber(resource.sizeMb),
      storage_path: normalizeStoragePath(resource.storagePath),
      is_canonical_syllabus: Boolean(resource.isCanonicalSyllabus),
      resource_collection_id: id,
    };
  });

  const membershipRows = courseRows.map((course) => ({
    collection_id: id,
    course_code: course.code,
    sort_order: course.sort_order,
    display_semester: course.semester,
    display_area: course.area,
  }));

  return {
    path: manifestPath,
    collection: {
      id,
      label,
      short_label: shortLabel,
      description: cleanText(collection.description),
      source_tier: sourceTier,
      source_cohort: sourceCohort,
      default_for_tier: false,
      is_active: collection.isActive !== false,
      sort_order: Number.isInteger(collection.sortOrder) ? collection.sortOrder : null,
    },
    courses: courseRows,
    memberships: membershipRows,
    lectures: lectureRows,
    transcripts: transcriptRows,
    resources: resourceRows,
    warnings,
  };
}

async function insertRows(supabase, table, rows, chunkSize = 500) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) throw new Error(`${table} insert: ${error.message}`);
  }
}

async function deleteTranscriptsForLectures(supabase, lectureIds) {
  for (let i = 0; i < lectureIds.length; i += 500) {
    const chunk = lectureIds.slice(i, i + 500);
    const { error } = await supabase.from("transcripts").delete().in("lecture_id", chunk);
    if (error) throw new Error(`transcripts delete: ${error.message}`);
  }
}

async function fetchRowsByCollection(supabase, table, columns, collectionId) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .eq("resource_collection_id", collectionId)
      .range(from, from + 999);
    if (error) throw new Error(`${table} read: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

async function prepareCollectionRow(supabase, collection) {
  if (collection.sort_order !== null) return collection;

  const { data: existing, error: existingError } = await supabase
    .from("resource_collections")
    .select("sort_order")
    .eq("id", collection.id)
    .maybeSingle();
  if (existingError) throw new Error(`resource_collections read: ${existingError.message}`);
  if (existing) return { ...collection, sort_order: existing.sort_order };

  const { count, error: countError } = await supabase
    .from("resource_collections")
    .select("*", { count: "exact", head: true });
  if (countError) throw new Error(`resource_collections count: ${countError.message}`);
  return { ...collection, sort_order: ((count ?? 0) + 1) * 10 };
}

async function applyManifest(supabase, plan) {
  const collection = await prepareCollectionRow(supabase, plan.collection);
  const { error: collectionError } = await supabase
    .from("resource_collections")
    .upsert(collection, { onConflict: "id" });
  if (collectionError) throw new Error(`resource_collections upsert: ${collectionError.message}`);

  const existingResources = await fetchRowsByCollection(
    supabase,
    "resources",
    "course_code, name, storage_path",
    plan.collection.id
  );
  const storageByKey = new Map(
    existingResources
      .filter((row) => row.storage_path)
      .map((row) => [`${row.course_code}\0${row.name}`, row.storage_path])
  );
  for (const resource of plan.resources) {
    if (!resource.storage_path) {
      resource.storage_path = storageByKey.get(`${resource.course_code}\0${resource.name}`) ?? null;
    }
  }

  const existingLectures = await fetchRowsByCollection(
    supabase,
    "lectures",
    "id",
    plan.collection.id
  );
  const lectureIds = existingLectures.map((row) => row.id);
  if (lectureIds.length) await deleteTranscriptsForLectures(supabase, lectureIds);

  for (const [table, label] of [
    ["resources", "resources"],
    ["lectures", "lectures"],
  ]) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("resource_collection_id", plan.collection.id);
    if (error) throw new Error(`${label} delete: ${error.message}`);
  }

  const { error: memberDeleteError } = await supabase
    .from("course_collection_members")
    .delete()
    .eq("collection_id", plan.collection.id);
  if (memberDeleteError) {
    throw new Error(`course_collection_members delete: ${memberDeleteError.message}`);
  }

  const courseCodes = plan.courses.map((course) => course.code);
  let existingCourses = [];
  if (courseCodes.length) {
    const { data, error: coursesReadError } = await supabase
      .from("courses")
      .select("code")
      .in("code", courseCodes);
    if (coursesReadError) throw new Error(`courses read: ${coursesReadError.message}`);
    existingCourses = data ?? [];
  }
  const existingCodes = new Set((existingCourses ?? []).map((course) => course.code));
  const newCourses = plan.courses.filter((course) => !existingCodes.has(course.code));
  if (newCourses.length) await insertRows(supabase, "courses", newCourses);

  await insertRows(supabase, "course_collection_members", plan.memberships);
  if (plan.lectures.length) await insertRows(supabase, "lectures", plan.lectures);
  if (plan.transcripts.length) await insertRows(supabase, "transcripts", plan.transcripts, 100);
  if (plan.resources.length) await insertRows(supabase, "resources", plan.resources);

  return {
    newCourses: newCourses.length,
    reusedCourses: plan.courses.length - newCourses.length,
    preservedStoragePaths: plan.resources.filter((row) => row.storage_path).length,
  };
}

function printPlan(plan) {
  console.log("");
  console.log(`Manifest: ${path.relative(repoRoot, plan.path)}`);
  console.log(`Collection: ${plan.collection.id} (${plan.collection.label})`);
  console.log(`Courses: ${plan.courses.length}`);
  console.log(`Lectures: ${plan.lectures.length}`);
  console.log(`Transcripts: ${plan.transcripts.length}`);
  console.log(`Resources: ${plan.resources.length}`);
  console.log(`Scope: replace rows for collection ${plan.collection.id} only`);
  for (const warning of plan.warnings) {
    console.warn(`Warning: ${warning}`);
  }
}

const manifestPaths = resolveManifestPaths();
if (!manifestPaths.length) {
  console.error(`No manifests found. Add JSON files under ${path.relative(repoRoot, manifestRoot)}.`);
  process.exit(1);
}

const plans = [];
for (const manifestPath of manifestPaths) {
  if (!existsSync(manifestPath)) {
    console.error(`Manifest not found: ${manifestPath}`);
    process.exit(1);
  }
  try {
    const plan = parseManifest(manifestPath);
    printPlan(plan);
    plans.push(plan);
  } catch (error) {
    console.error(`Invalid manifest ${manifestPath}: ${error.message}`);
    process.exit(1);
  }
}

if (dryRun) {
  console.log("");
  console.log(`Dry run complete. No Supabase rows were changed for ${plans.length} manifest(s).`);
  process.exit(0);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in webapp/.env.local");
  process.exit(1);
}

const supabase = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
});

for (const plan of plans) {
  try {
    const result = await applyManifest(supabase, plan);
    console.log("");
    console.log(
      `Imported ${plan.collection.id}: ${plan.courses.length} memberships, ` +
        `${plan.lectures.length} lectures, ${plan.resources.length} resources.`
    );
    console.log(
      `Courses: ${result.newCourses} new, ${result.reusedCourses} reused. ` +
        `Storage links present: ${result.preservedStoragePaths}.`
    );
    console.log("Manual grants unchanged.");
  } catch (error) {
    console.error(`Import failed for ${plan.collection.id}: ${error.message}`);
    process.exit(1);
  }
}
