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
//         node scripts/upload-files.mjs --link-storage --course "HEWB 130"
//         node scripts/upload-files.mjs --canvas --compress
import { existsSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./lib/data.mjs";
import { prepareUploadPayload, convertOfficeToPdf } from "./lib/compress-file.mjs";
import {
  DEFAULT_COURSE_FILES_DIR,
  canvasStorageKeyFromRelPath,
  fetchAllResources,
  linkExistingStorage,
  normalizeBasename,
} from "./lib/storage-reconcile.mjs";

const webappRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(webappRoot, "..");
loadEnv(webappRoot);

const dryRun = process.argv.includes("--dry");
const includeCanvas = process.argv.includes("--canvas");
const essentialsOnly = process.argv.includes("--essentials");
const linkStorageOnly = process.argv.includes("--link-storage");
const compressLarge = process.argv.includes("--compress");
const courseFilter = readFlagValue("course")?.trim() ?? null;

function readFlagValue(name) {
  const flag = `--${name}`;
  const inline = `${flag}=`;
  const inlineValue = process.argv.find((arg) => arg.startsWith(inline));
  if (inlineValue) return inlineValue.slice(inline.length);
  const index = process.argv.indexOf(flag);
  if (index >= 0) return process.argv[index + 1];
  return null;
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

/** @type {Map<string, { localPath: string, relPath: string }[]>} */
const filesByName = new Map();

function aliasNames(name) {
  const aliases = new Set([name, normalizeBasename(name)]);
  try {
    const decoded = decodeURIComponent(name);
    aliases.add(decoded);
    aliases.add(normalizeBasename(decoded));
  } catch {
    // not URL-encoded
  }
  const encoded = encodeURIComponent(name);
  aliases.add(encoded);
  aliases.add(normalizeBasename(encoded));
  return [...aliases];
}

function indexLocalFile(name, entry) {
  for (const alias of aliasNames(name)) {
    const list = filesByName.get(alias) ?? [];
    if (!list.some((item) => item.localPath === entry.localPath)) {
      list.push(entry);
      filesByName.set(alias, list);
    }
  }
}

function walk(dir, rootDir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name.startsWith("~$")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, rootDir);
      continue;
    }
    const relPath = path.relative(rootDir, full);
    indexLocalFile(entry.name, { localPath: full, relPath });
  }
}

const pillarsRoot = path.join(repoRoot, "private-staging/student-pillars");
if (!linkStorageOnly && existsSync(pillarsRoot)) {
  walk(pillarsRoot, pillarsRoot);
  console.log(`Indexed ${filesByName.size} pillar files under ${pillarsRoot}`);
} else if (!linkStorageOnly) {
  console.log(`Pillar staging folder not found (skipped): ${pillarsRoot}`);
}

const filesRoot =
  process.env.COURSE_FILES_DIR || DEFAULT_COURSE_FILES_DIR;
const legacyFilesRoot = path.join(os.homedir(), "Downloads", "Case Western D1 2025-2026");
if (!linkStorageOnly && includeCanvas) {
  for (const root of [filesRoot, legacyFilesRoot]) {
    if (!existsSync(root)) {
      console.log(`Course files folder not found (skipped): ${root}`);
      continue;
    }
    const before = filesByName.size;
    walk(root, root);
    console.log(`Indexed ${filesByName.size - before} filenames under ${root}`);
  }
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
function canvasStorageKey(relPath) {
  return canvasStorageKeyFromRelPath(relPath);
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
  const lookupNames = [resource.name, normalizeBasename(resource.name)];
  let candidates = [];
  for (const name of lookupNames) {
    const hits = filesByName.get(name);
    if (hits?.length) candidates.push(...hits);
  }

  if (!candidates.length && /\.pptx?$/i.test(resource.name)) {
    const stem = resource.name.replace(/\.pptx?$/i, "");
    const stems = [stem];
    const yearMatch = stem.match(/^(.*?)(20\d{2})$/i);
    if (yearMatch) {
      stems.push(`${yearMatch[1]}${Number(yearMatch[2]) + 1}`);
      stems.push(`${yearMatch[1]}${Number(yearMatch[2]) - 1}`);
    }
    for (const s of stems) {
      for (const suffix of [".pdf", ".pptx.pdf"]) {
        for (const name of [s + suffix, normalizeBasename(s + suffix)]) {
          const hits = filesByName.get(name);
          if (hits?.length) candidates.push(...hits);
        }
      }
    }
  }

  if (!candidates.length && /\.pdf$/i.test(resource.name)) {
    const stem = resource.name.replace(/\.pdf$/i, "");
    for (const suffix of [".pptx.pdf", ".pdf"]) {
      for (const name of [stem + suffix, normalizeBasename(stem + suffix)]) {
        const hits = filesByName.get(name);
        if (hits?.length) candidates.push(...hits);
      }
    }
  }

  if (!candidates.length) return null;
  const unique = [...new Map(candidates.map((item) => [item.localPath, item])).values()];
  if (unique.length === 1) return unique[0];
  return unique
    .slice()
    .sort((a, b) => scoreCandidate(resource, b.relPath) - scoreCandidate(resource, a.relPath))[0];
}

function storageKey(resource, localEntry) {
  const pillarKey = pillarStorageKey(resource);
  if (pillarKey) return pillarKey;
  return canvasStorageKey(localEntry.relPath);
}

const { data: resources, error } = await fetchAllResources(supabase);
if (error) {
  console.error(`Could not read resources table: ${error.message}`);
  process.exit(1);
}
if (courseFilter) {
  console.log(`Course filter: ${courseFilter}`);
}
if (linkStorageOnly) {
  await linkExistingStorage(supabase, resources, { courseFilter, dryRun });
  process.exit(0);
}
if (essentialsOnly) {
  console.log("Essentials only: syllabus, course mastery guides, textbook companions");
}
if (compressLarge) {
  console.log("Compress: oversized PDFs will be compressed with ghostscript before upload");
}

let uploaded = 0;
let compressed = 0;
let skipped = 0;
let missing = 0;
let skippedYoutube = 0;
let skippedOtherCourse = 0;
let skippedNonEssential = 0;

function isEssentialResource(resource) {
  return ["Syllabus", "Course Mastery Guide", "Textbook Companion"].includes(
    resource.kind
  );
}

function uploadPriority(resource) {
  if (resource.kind === "Syllabus") return 1;
  if (resource.kind === "Course Mastery Guide") return 2;
  if (resource.kind === "Textbook Companion") return 3;
  return 9;
}

const uploadQueue = resources
  .slice()
  .sort(
    (a, b) =>
      uploadPriority(a) - uploadPriority(b) ||
      a.course_code.localeCompare(b.course_code) ||
      a.name.localeCompare(b.name, undefined, { numeric: true })
  );

for (const resource of uploadQueue) {
  if (courseFilter && resource.course_code !== courseFilter) {
    skippedOtherCourse += 1;
    continue;
  }
  if (essentialsOnly && !isEssentialResource(resource)) {
    skippedNonEssential += 1;
    continue;
  }
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
  const maxMb = Number(process.env.UPLOAD_MAX_MB || 50);
  const maxBytes = maxMb * 1024 * 1024;

  const payload = prepareUploadPayload(localEntry.localPath, {
    compress: compressLarge,
    maxBytes,
    resourceName: resource.name,
  });

  if (dryRun) {
    const tag = payload.compressed ? " [compressed]" : "";
    console.log(`[dry] ${resource.name} -> ${key}${tag}`);
    uploaded += 1;
    continue;
  }

  if (!payload.ok) {
    if (payload.skip) console.warn(`Skipping ${resource.name}: ${payload.reason}`);
    else console.warn(`Skipping ${resource.name}: upload prep failed`);
    continue;
  }

  const ext = path.extname(localEntry.localPath).toLowerCase();
  const contentType =
    payload.compressed || payload.converted
      ? "application/pdf"
      : CONTENT_TYPES[ext] ?? "application/octet-stream";
  const { error: uploadError } = await supabase.storage
    .from("course-files")
    .upload(key, payload.buffer, {
      contentType,
      upsert: true,
    });
  if (uploadError) {
    console.warn(`Failed ${resource.name}: ${uploadError.message}`);
    continue;
  }

  const { error: updateError } = await supabase
    .from("resources")
    .update({ storage_path: key })
    .eq("course_code", resource.course_code)
    .eq("name", resource.name)
    .is("storage_path", null);
  if (updateError) {
    console.warn(`Uploaded but could not link ${resource.name}: ${updateError.message}`);
    continue;
  }

  uploaded += 1;
  if (payload.compressed || payload.converted) {
    compressed += 1;
    const before = ((payload.originalBytes ?? 0) / (1024 * 1024)).toFixed(1);
    const after = (payload.sizeBytes / (1024 * 1024)).toFixed(1);
    const tag = payload.converted
      ? payload.compressed
        ? "converted+compressed"
        : "converted"
      : "compressed";
    console.log(`${tag}: ${resource.name} (${before} → ${after} MB${payload.profile ? ", " + payload.profile : ""})`);
  } else {
    process.stdout.write(`Uploaded ${uploaded} files...\r`);
  }
}

console.log("");
console.log(
  `Done. Uploaded ${uploaded}` +
    (compressed ? ` (${compressed} compressed)` : "") +
    `, already linked ${skipped}, YouTube-only ${skippedYoutube}, no local match ${missing}` +
    (courseFilter ? `, skipped other courses ${skippedOtherCourse}` : "") +
    (essentialsOnly ? `, skipped non-essential ${skippedNonEssential}` : "") +
    "."
);
