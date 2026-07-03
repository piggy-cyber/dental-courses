// Link existing Supabase storage to resource rows and report upload gaps.
// Does NOT upload files.
//
// Usage:
//   node scripts/reconcile-storage.mjs --link
//   node scripts/reconcile-storage.mjs --link --course "HEWB 130"
//   node scripts/reconcile-storage.mjs --report
//   node scripts/reconcile-storage.mjs --report --course "HWDP 131"
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./lib/data.mjs";
import {
  DEFAULT_COURSE_FILES_DIR,
  buildReconcileReport,
  fetchAllResources,
  formatReportMarkdown,
  indexLocalFiles,
  linkExistingStorage,
  listAllStorageKeys,
  readFlagValue,
} from "./lib/storage-reconcile.mjs";

const webappRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnv(webappRoot);

const argv = process.argv.slice(2);
const doLink = argv.includes("--link");
const doReport = argv.includes("--report");
const dryRun = argv.includes("--dry");
const courseFilter = readFlagValue(argv, "course")?.trim() ?? null;

if (!doLink && !doReport) {
  console.error(`Usage:
  node scripts/reconcile-storage.mjs --link [--course "CODE"]
  node scripts/reconcile-storage.mjs --report [--course "CODE"]`);
  process.exit(1);
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

const filesRoot = process.env.COURSE_FILES_DIR || DEFAULT_COURSE_FILES_DIR;

const { data: resources, error } = await fetchAllResources(supabase);
if (error) {
  console.error(`Could not read resources table: ${error.message}`);
  process.exit(1);
}

if (doLink) {
  if (courseFilter) console.log(`Course filter: ${courseFilter}`);
  await linkExistingStorage(supabase, resources, { courseFilter, dryRun });
}

if (doReport) {
  const { data: freshResources, error: refreshError } = await fetchAllResources(supabase);
  if (refreshError) {
    console.error(`Could not refresh resources: ${refreshError.message}`);
    process.exit(1);
  }

  console.log(`Indexing local files under ${filesRoot}...`);
  const localIndex = indexLocalFiles(filesRoot, { includeShared: true });
  const localCount = [...localIndex.exact.values()].reduce((s, list) => s + list.length, 0);
  console.log(`Indexed ${localCount} local files`);

  console.log("Scanning Supabase storage...");
  const storageKeys = await listAllStorageKeys(supabase);
  console.log(`Found ${storageKeys.length} storage objects`);

  const report = buildReconcileReport(freshResources, storageKeys, localIndex, {
    courseFilter,
  });

  const date = new Date().toISOString().slice(0, 10);
  const reportsDir = path.join(webappRoot, "reports");
  mkdirSync(reportsDir, { recursive: true });
  const jsonPath = path.join(reportsDir, `storage-reconcile-${date}.json`);
  const mdPath = path.join(reportsDir, `storage-reconcile-${date}.md`);

  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  writeFileSync(mdPath, formatReportMarkdown(report));

  console.log("");
  console.log("=== Reconcile summary ===");
  console.log(`Linked in DB:        ${report.totals.linked}`);
  console.log(`Bucket not linked:   ${report.totals.bucketUnlinked}`);
  console.log(`Ready to upload:     ${report.totals.needsUpload}`);
  console.log(`Oversized:           ${report.totals.oversized}`);
  console.log(`Not found on disk:   ${report.totals.notFound}`);
  console.log(`Duplicate DB rows:   ${report.totals.duplicates}`);
  console.log("");
  console.log(`Report written to:\n  ${mdPath}\n  ${jsonPath}`);
}
