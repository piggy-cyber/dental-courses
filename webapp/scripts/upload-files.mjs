// Uploads your local course files into the private Supabase storage bucket
// and links them to the resources table, so "Open" buttons work on the site.
//
// It looks for files in the folder set by COURSE_FILES_DIR in .env.local
// (default: ~/Downloads/Case Western D1 2025-2026), matching by filename.
//
// Usage:  node scripts/upload-files.mjs          (uploads everything it can)
//         node scripts/upload-files.mjs --dry    (just shows what would happen)
import { readdirSync, readFileSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./lib/data.mjs";

const webappRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnv(webappRoot);

const dryRun = process.argv.includes("--dry");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in webapp/.env.local");
  process.exit(1);
}

const filesRoot =
  process.env.COURSE_FILES_DIR ||
  path.join(os.homedir(), "Downloads", "Case Western D1 2025-2026");

const supabase = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Index every file under the course folder by its exact filename.
const filesByName = new Map();
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (!filesByName.has(entry.name)) filesByName.set(entry.name, full);
  }
}
try {
  walk(filesRoot);
} catch {
  console.error(`Could not read course files folder: ${filesRoot}`);
  console.error("Set COURSE_FILES_DIR in webapp/.env.local to the right path.");
  process.exit(1);
}
console.log(`Indexed ${filesByName.size} local files under ${filesRoot}`);

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

function storageKey(courseCode, filename) {
  const slug = courseCode.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const safeName = filename.replace(/[^a-zA-Z0-9._ -]/g, "_").replace(/\s+/g, " ");
  return `${slug}/${safeName}`;
}

const { data: resources, error } = await supabase
  .from("resources")
  .select("id, course_code, name, storage_path");
if (error) {
  console.error(`Could not read resources table: ${error.message}`);
  process.exit(1);
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

  const key = storageKey(resource.course_code, resource.name);
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
if (missing > 0) {
  console.log("Files with no local match keep showing 'Not uploaded yet' on the site.");
}
