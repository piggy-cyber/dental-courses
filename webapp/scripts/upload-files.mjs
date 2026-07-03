// Uploads local files into private Supabase storage and links resources rows.
//
// Scans private-staging/student-pillars/ for Course Mastery Guides and
// Textbook Companions. Optionally scans COURSE_FILES_DIR for Canvas files.
//
// Canvas files are stored under library/<relative-folder-path> so Supabase
// paths mirror your Downloads folder layout.
//
// Local Media Source rows are skipped (served via YouTube, not storage).
//
// Usage:  node scripts/upload-files.mjs
//         node scripts/upload-files.mjs --dry
//         node scripts/upload-files.mjs --canvas
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./lib/data.mjs";

const webappRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(webappRoot, "..");
loadEnv(webappRoot);

const dryRun = process.argv.includes("--dry");
const includeCanvas = process.argv.includes("--canvas");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in webapp/.env.local");
  process.exit(1);
}

const supabase = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** @type {Map<string, { localPath: string, relPath: string }[]>} */
const filesByName = new Map();

function walk(dir, rootDir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, rootDir);
      continue;
    }
    const relPath = path.relative(rootDir, full);
    const list = filesByName.get(entry.name) ?? [];
    list.push({ localPath: full, relPath });
    filesByName.set(entry.name, list);
  }
}

const pillarsRoot = path.join(repoRoot, "private-staging/student-pillars");
if (existsSync(pillarsRoot)) {
  walk(pillarsRoot, pillarsRoot);
  console.log(`Indexed ${filesByName.size} pillar files under ${pillarsRoot}`);
} else {
  console.log(`Pillar staging folder not found (skipped): ${pillarsRoot}`);
}

const filesRoot =
  process.env.COURSE_FILES_DIR ||
  path.join(os.homedir(), "Downloads", "Case Western D1 2025-2026");
if (includeCanvas && existsSync(filesRoot)) {
  const before = filesByName.size;
  walk(filesRoot, filesRoot);
  console.log(`Indexed ${filesByName.size - before} Canvas filenames under ${filesRoot}`);
} else if (includeCanvas) {
  console.log(`Course files folder not found (skipped): ${filesRoot}`);
}

const CONTENT_TYPES = {
  ".pdf": "application/pdf",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".txt": "text/plain",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".apkg": "application/octet-stream",
};

function kindSegment(kind) {
  const map = {
    Slides: "slides",
    Syllabus: "syllabus",
    Document: "documents",
    "Study Guide": "study-guides",
    Flashcards: "flashcards",
    Image: "images",
    Other: "other",
  };
  return map[kind] ?? "other";
}

function pillarStorageKey(resource) {
  const slug = resource.course_code.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const safeName = resource.name.replace(/[^a-zA-Z0-9._ -]/g, "_").replace(/\s+/g, " ");
  if (resource.kind === "Course Mastery Guide") {
    return `pillars/course-mastery-guides/${slug}/${safeName}`;
  }
  if (resource.kind === "Textbook Companion") {
    return `pillars/textbook-companions/${slug}/${safeName}`;
  }
  return null;
}

/** Mirror local folder layout: library/HWDP 131 - Heart.../subdir/file.pdf */
function sanitizePathSegment(segment) {
  return segment
    .normalize("NFC")
    .replace(/[''´`]/g, "_")
    .replace(/[^\x00-\x7F]/g, (char) => {
      const map = { "–": "-", "—": "-", "'": "_", "'": "_" };
      return map[char] ?? "_";
    });
}

function canvasStorageKey(relPath) {
  return `library/${relPath.split(path.sep).map(sanitizePathSegment).join("/")}`;
}

function scoreCandidate(resource, relPath) {
  let score = 0;
  const lower = relPath.toLowerCase();
  const code = resource.course_code.toLowerCase();
  const topFolder = relPath.split(path.sep)[0]?.toLowerCase() ?? "";
  if (topFolder.startsWith(code)) score += 100;
  else if (lower.includes(code)) score += 15;

  const section = resource.section;
  if (section && section !== "Course Root" && lower.includes(section.toLowerCase())) {
    score += 25;
  }
  const depth = relPath.split(path.sep).length;
  score -= depth * 0.5;
  return score;
}

function resolveLocalPath(resource) {
  const candidates = filesByName.get(resource.name);
  if (!candidates?.length) return null;
  if (candidates.length === 1) return candidates[0];
  return candidates
    .slice()
    .sort((a, b) => scoreCandidate(resource, b.relPath) - scoreCandidate(resource, a.relPath))[0];
}

function storageKey(resource, localEntry) {
  const pillarKey = pillarStorageKey(resource);
  if (pillarKey) return pillarKey;
  return canvasStorageKey(localEntry.relPath);
}

const { data: resources, error } = await fetchAllResources();
if (error) {
  console.error(`Could not read resources table: ${error.message}`);
  process.exit(1);
}

async function fetchAllResources() {
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("resources")
      .select("id, course_code, name, kind, section, storage_path")
      .range(from, from + pageSize - 1);
    if (error) return { data: null, error };
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  return { data: rows, error: null };
}

let uploaded = 0;
let skipped = 0;
let missing = 0;
let skippedYoutube = 0;

for (const resource of resources) {
  if (resource.kind === "Local Media Source") {
    skippedYoutube += 1;
    continue;
  }
  if (resource.storage_path) {
    skipped += 1;
    continue;
  }
  const localEntry = resolveLocalPath(resource);
  if (!localEntry) {
    missing += 1;
    continue;
  }

  const key = storageKey(resource, localEntry);
  if (dryRun) {
    console.log(`[dry] ${resource.name} -> ${key}`);
    uploaded += 1;
    continue;
  }

  const size = statSync(localEntry.localPath).size;
  const maxMb = Number(process.env.UPLOAD_MAX_MB || 200);
  if (size > maxMb * 1024 * 1024) {
    console.warn(`Skipping ${resource.name}: larger than ${maxMb} MB`);
    continue;
  }

  const ext = path.extname(localEntry.localPath).toLowerCase();
  const { error: uploadError } = await supabase.storage
    .from("course-files")
    .upload(key, readFileSync(localEntry.localPath), {
      contentType: CONTENT_TYPES[ext] ?? "application/octet-stream",
      upsert: true,
    });
  if (uploadError) {
    console.warn(`Failed ${resource.name}: ${uploadError.message}`);
    continue;
  }

  const { error: updateError } = await supabase
    .from("resources")
    .update({ storage_path: key })
    .eq("id", resource.id);
  if (updateError) {
    console.warn(`Uploaded but could not link ${resource.name}: ${updateError.message}`);
    continue;
  }

  uploaded += 1;
  process.stdout.write(`Uploaded ${uploaded} files...\r`);
}

console.log("");
console.log(
  `Done. Uploaded ${uploaded}, already linked ${skipped}, YouTube-only ${skippedYoutube}, no local match ${missing}.`
);
