// Sets up the "BOOK 100 - Textbooks" pseudo-course and uploads staged books.
//
// Scans private-staging/textbooks/ (repo root), zips each book so students
// download a single compressed archive, uploads the zips to the private
// course-files bucket, and links resources rows in the d1-2025-2026
// collection. Additive and idempotent: rerun whenever you add books.
//
// Usage:  node scripts/setup-textbooks.mjs
//         node scripts/setup-textbooks.mjs --dry
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./lib/data.mjs";

const webappRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(webappRoot, "..");
loadEnv(webappRoot);

const dryRun = process.argv.includes("--dry");

const COURSE_CODE = "BOOK 100";
const COURSE_TITLE = "Textbooks";
const COLLECTION_ID = "d1-2025-2026";
// High sort_order keeps the entry at the bottom of the course tree.
const SORT_ORDER = 990;
const STAGING_DIR = path.join(repoRoot, "private-staging", "textbooks");
const MAX_MB = Number(process.env.UPLOAD_MAX_MB || 50);

function listStagedBooks() {
  if (!existsSync(STAGING_DIR)) return [];
  return readdirSync(STAGING_DIR, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() && !entry.name.startsWith(".") && !entry.name.startsWith("~$")
    )
    .map((entry) => path.join(STAGING_DIR, entry.name))
    .sort();
}

function zipName(filePath) {
  const base = path.basename(filePath, path.extname(filePath));
  return `${base.replace(/[^a-zA-Z0-9._ -]/g, "_").replace(/\s+/g, " ").trim()}.zip`;
}

function zipBook(filePath, tmpDir) {
  const outPath = path.join(tmpDir, zipName(filePath));
  execFileSync("zip", ["-j", "-q", "-X", outPath, filePath]);
  return outPath;
}

async function ensureCourseAndMembership() {
  const { error: courseError } = await supabase.from("courses").upsert(
    {
      code: COURSE_CODE,
      title: COURSE_TITLE,
      semester: "All Year",
      area: "Textbooks",
      sort_order: SORT_ORDER,
      resource_collection_id: COLLECTION_ID,
    },
    { onConflict: "code" }
  );
  if (courseError) throw new Error(`courses upsert: ${courseError.message}`);

  const { error: memberError } = await supabase.from("course_collection_members").upsert(
    {
      collection_id: COLLECTION_ID,
      course_code: COURSE_CODE,
      sort_order: SORT_ORDER,
      display_semester: "All Year",
      display_area: "Textbooks",
    },
    { onConflict: "collection_id,course_code" }
  );
  if (memberError) throw new Error(`course_collection_members upsert: ${memberError.message}`);
}

async function upsertBookResource(name, storagePath, sizeMb) {
  const { data: existing, error: readError } = await supabase
    .from("resources")
    .select("id")
    .eq("course_code", COURSE_CODE)
    .eq("resource_collection_id", COLLECTION_ID)
    .eq("name", name)
    .maybeSingle();
  if (readError) throw new Error(`resources read: ${readError.message}`);

  const fields = {
    kind: "Textbook",
    ext: "ZIP",
    section: "Textbooks",
    use_label: "textbook",
    resource_role: "supplemental_document",
    storage_path: storagePath,
    size_mb: sizeMb,
  };

  if (existing) {
    const { error } = await supabase.from("resources").update(fields).eq("id", existing.id);
    if (error) throw new Error(`resources update: ${error.message}`);
    return "updated";
  }

  const { error } = await supabase.from("resources").insert({
    course_code: COURSE_CODE,
    resource_collection_id: COLLECTION_ID,
    name,
    ...fields,
  });
  if (error) throw new Error(`resources insert: ${error.message}`);
  return "created";
}

const books = listStagedBooks();
console.log(`Staged books in ${STAGING_DIR}: ${books.length}`);
if (!books.length) {
  console.log("Drop textbook files (PDF/EPUB/etc.) in that folder and rerun.");
}

if (dryRun) {
  for (const book of books) {
    const mb = (statSync(book).size / (1024 * 1024)).toFixed(1);
    console.log(`[dry] ${path.basename(book)} (${mb} MB) -> library/textbooks/${zipName(book)}`);
  }
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

await ensureCourseAndMembership();
console.log(`Course ready: ${COURSE_CODE} - ${COURSE_TITLE} (collection ${COLLECTION_ID})`);

let uploaded = 0;
let skippedTooLarge = 0;
const tmpDir = mkdtempSync(path.join(os.tmpdir(), "textbooks-zip-"));

try {
  for (const book of books) {
    const zipPath = zipBook(book, tmpDir);
    const buffer = readFileSync(zipPath);
    const sizeMb = buffer.byteLength / (1024 * 1024);

    if (sizeMb > MAX_MB) {
      console.warn(
        `Skipping ${path.basename(book)}: zip is ${sizeMb.toFixed(1)} MB (limit ${MAX_MB} MB). ` +
          "Compress the PDF first (e.g. ghostscript) or raise UPLOAD_MAX_MB if the bucket allows it."
      );
      skippedTooLarge += 1;
      continue;
    }

    const name = path.basename(zipPath);
    const storagePath = `library/textbooks/${name}`;

    const { error: uploadError } = await supabase.storage
      .from("course-files")
      .upload(storagePath, buffer, { contentType: "application/zip", upsert: true });
    if (uploadError) {
      console.warn(`Failed ${name}: ${uploadError.message}`);
      continue;
    }

    const action = await upsertBookResource(name, storagePath, Number(sizeMb.toFixed(2)));
    uploaded += 1;
    console.log(`${action}: ${name} (${sizeMb.toFixed(1)} MB)`);
  }
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}

console.log(
  `Done. Uploaded ${uploaded} of ${books.length}` +
    (skippedTooLarge ? `, skipped ${skippedTooLarge} over the size limit` : "") +
    "."
);
console.log(
  `Page: /course/${encodeURIComponent(COURSE_CODE)}?collection=${COLLECTION_ID}`
);
