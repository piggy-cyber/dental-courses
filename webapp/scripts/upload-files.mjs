// Uploads local files into private Supabase storage and links resources rows.
//
// Scans private-staging/student-pillars/ for Course Mastery Guides and
// Textbook Companions. Optionally scans COURSE_FILES_DIR for Canvas files.
//
// Usage:  node scripts/upload-files.mjs
//         node scripts/upload-files.mjs --dry
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

const filesByName = new Map();
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (!filesByName.has(entry.name)) filesByName.set(entry.name, full);
  }
}

const pillarsRoot = path.join(repoRoot, "private-staging/student-pillars");
if (existsSync(pillarsRoot)) {
  walk(pillarsRoot);
  console.log(`Indexed ${filesByName.size} pillar files under ${pillarsRoot}`);
} else {
  console.log(`Pillar staging folder not found (skipped): ${pillarsRoot}`);
}

const filesRoot =
  process.env.COURSE_FILES_DIR ||
  path.join(os.homedir(), "Downloads", "Case Western D1 2025-2026");
if (includeCanvas && existsSync(filesRoot)) {
  const before = filesByName.size;
  walk(filesRoot);
  console.log(`Indexed ${filesByName.size - before} Canvas files under ${filesRoot}`);
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

function storageKey(resource) {
  const slug = resource.course_code.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const safeName = resource.name.replace(/[^a-zA-Z0-9._ -]/g, "_").replace(/\s+/g, " ");
  if (resource.kind === "Course Mastery Guide") {
    return `pillars/course-mastery-guides/${slug}/${safeName}`;
  }
  if (resource.kind === "Textbook Companion") {
    return `pillars/textbook-companions/${slug}/${safeName}`;
  }
  return `${slug}/${safeName}`;
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
      .select("id, course_code, name, kind, storage_path")
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

for (const resource of resources) {
  if (resource.storage_path) {
    skipped += 1;
    continue;
  }
  const localPath = filesByName.get(resource.name);
  if (!localPath) {
    missing += 1;
    continue;
  }

  const key = storageKey(resource);
  if (dryRun) {
    console.log(`[dry] ${resource.name} -> ${key}`);
    uploaded += 1;
    continue;
  }

  const size = statSync(localPath).size;
  if (size > 50 * 1024 * 1024) {
    console.warn(`Skipping ${resource.name}: larger than 50 MB`);
    continue;
  }

  const ext = path.extname(localPath).toLowerCase();
  const { error: uploadError } = await supabase.storage
    .from("course-files")
    .upload(key, readFileSync(localPath), {
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
  `Done. Uploaded ${uploaded}, already linked ${skipped}, no local match ${missing}.`
);
