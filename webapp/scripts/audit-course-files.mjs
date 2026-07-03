// Audit course file placement: misfiles, unlinked pool, match suggestions, missing storage.
//
// Usage:  node scripts/audit-course-files.mjs --course "HEWB 130"
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  canonicalResources,
  lectureNumberFromName,
  loadEnv,
  loadSiteData,
  relatedScore,
  shouldImportResource,
} from "./lib/data.mjs";

const webappRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(webappRoot, "..");

loadEnv(webappRoot);

function readFlagValue(name) {
  const flag = `--${name}`;
  const inline = `${flag}=`;
  const inlineValue = process.argv.find((arg) => arg.startsWith(inline));
  if (inlineValue) return inlineValue.slice(inline.length);
  const index = process.argv.indexOf(flag);
  if (index >= 0) return process.argv[index + 1];
  return null;
}

const courseFilter = readFlagValue("course")?.trim();
if (!courseFilter) {
  console.error('Usage: node scripts/audit-course-files.mjs --course "HEWB 130"');
  process.exit(1);
}

const ARCHIVE_SECTION = /fall semester|survival guide|previous year|spring semester/i;
const MISFILED_NAME = /^(asdf|1\. ergo review|copy of lecture \d+)/i;
const WRONG_COURSE_NAME = /dental materials sg/i;

function isArchivedResource(item) {
  const section = item.section ?? "";
  if (ARCHIVE_SECTION.test(section)) return true;
  if (MISFILED_NAME.test(item.name)) return true;
  if (WRONG_COURSE_NAME.test(item.name)) return true;
  return false;
}

function isMisfileSuspect(item, courseCode) {
  const reasons = [];
  if (item.origin === "Survival Guide") reasons.push("survival-guide origin");
  if (ARCHIVE_SECTION.test(String(item.section || "").trim())) {
    reasons.push(`archive section: ${item.section}`);
  }
  if (!shouldImportResource(item, courseCode)) {
    reasons.push("filtered by shouldImportResource");
  }
  if (WRONG_COURSE_NAME.test(item.name)) reasons.push("cross-course name bleed");
  return reasons;
}

function pickEssentials(active) {
  const syllabus =
    active.find((r) => r.is_canonical_syllabus) ??
    active.find((r) => r.kind === "Syllabus") ??
    null;
  const reserved = new Set(
    [
      ...(syllabus ? [syllabus.name] : []),
      ...active.filter((r) => r.kind === "Course Mastery Guide").map((r) => r.name),
      ...active.filter((r) => r.kind === "Textbook Companion").map((r) => r.name),
    ].filter(Boolean)
  );
  return reserved;
}

function relatedResourcesForAudit(
  courseCode,
  lectureTitle,
  explicitFiles,
  poolNames,
  sourceResources,
  lectureIndex
) {
  const linked = new Set(explicitFiles.map((f) => f.name));

  if (!explicitFiles.length) {
    const pairedLectureNumbers = explicitFiles
      .map((f) => lectureNumberFromName(f.name))
      .filter((n) => n !== null);

    const row = { lectureTitle, courseCode, lectureNumber: lectureIndex };
    for (const item of sourceResources) {
      if (item.kind === "Local Media Source" || item.kind === "Transcript") continue;
      const score = relatedScore(row, item, { lectureIndex, pairedLectureNumbers });
      if (score >= 40 && poolNames.has(item.name)) linked.add(item.name);
    }
  }
  return linked;
}

const { courseData, lectureData, resourceMap } = loadSiteData(repoRoot);
const course = courseData.find((c) => c.code === courseFilter);
if (!course) {
  console.error(`Course not found: ${courseFilter}`);
  process.exit(1);
}

const rawResources = resourceMap.courses?.[course.code]?.resources ?? [];
const imported = rawResources.filter((item) => shouldImportResource(item, course.code));
const canonical = canonicalResources(imported, course);
const active = canonical.filter((item) => !isArchivedResource(item));
const archive = canonical.filter((item) => isArchivedResource(item));

const misfileSuspects = rawResources
  .map((item) => ({ item, reasons: isMisfileSuspect(item, course.code) }))
  .filter((entry) => entry.reasons.length > 0);

const reservedNames = pickEssentials(
  active.map((item) => ({
    ...item,
    is_canonical_syllabus: item.kind === "Syllabus",
  }))
);
const pool = active.filter(
  (item) =>
    !reservedNames.has(item.name) &&
    !["Course Mastery Guide", "Textbook Companion", "Syllabus", "Transcript", "Local Media Source"].includes(
      item.kind ?? ""
    )
);
const poolNames = new Set(pool.map((item) => item.name));

const sourceRows = (lectureData.rows ?? [])
  .filter((row) => row.courseCode === course.code)
  .slice()
  .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));

const lectureIndexById = new Map();
sourceRows.forEach((row, index) => {
  if (row.date) lectureIndexById.set(row.id, index + 1);
});

const linkedNames = new Set();
const lectureReport = [];

for (const row of sourceRows) {
  const explicitFiles = row.lectureFiles ?? [];
  const lectureIndex = lectureIndexById.get(row.id) ?? null;
  const linked = relatedResourcesForAudit(
    course.code,
    row.lectureTitle,
    explicitFiles,
    poolNames,
    canonical,
    lectureIndex
  );
  for (const name of linked) linkedNames.add(name);
  lectureReport.push({
    title: row.lectureTitle,
    date: row.date,
    lectureIndex,
    explicitCount: explicitFiles.length,
    linkedCount: linked.size,
    linked: [...linked],
  });
}

const unlinkedPool = pool.filter((item) => !linkedNames.has(item.name));

const suggestions = [];
for (const item of unlinkedPool) {
  let best = { lecture: null, score: 0 };
  for (const row of sourceRows) {
    const lectureIndex = lectureIndexById.get(row.id) ?? null;
    const score = relatedScore(
      { lectureTitle: row.lectureTitle, courseCode: course.code, lectureNumber: lectureIndex },
      item,
      { lectureIndex }
    );
    if (score > best.score) best = { lecture: row.lectureTitle, score };
  }
  if (best.score > 0) {
    suggestions.push({
      name: item.name,
      kind: item.kind,
      bestLecture: best.lecture,
      score: best.score,
      tier: best.score >= 70 ? "auto-link" : best.score >= 40 ? "review" : "low",
    });
  }
}
suggestions.sort((a, b) => b.score - a.score);

let storageByName = new Map();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (url && secret) {
  const supabase = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: courseRow } = await supabase
    .from("courses")
    .select("id")
    .eq("code", course.code)
    .maybeSingle();
  if (courseRow?.id) {
    const { data: resources } = await supabase
      .from("resources")
      .select("name, storage_path")
      .eq("course_id", courseRow.id);
    storageByName = new Map((resources ?? []).map((r) => [r.name, r.storage_path]));
  }
}

const linkedWithoutStorage = [...linkedNames].filter((name) => {
  const path = storageByName.get(name);
  return storageByName.size > 0 && !path;
});

console.log(`\n=== Course file audit: ${course.code} · ${course.title} ===\n`);

console.log(`Misfile suspects (${misfileSuspects.length})`);
for (const { item, reasons } of misfileSuspects) {
  console.log(`  - ${item.name}`);
  console.log(`    ${reasons.join("; ")}`);
}
if (!misfileSuspects.length) console.log("  (none)");

console.log(`\nArchived / filtered (${archive.length})`);
for (const item of archive.slice(0, 15)) console.log(`  - ${item.name}`);
if (archive.length > 15) console.log(`  … and ${archive.length - 15} more`);

console.log(`\nLecture links (${lectureReport.length} lectures)`);
for (const row of lectureReport) {
  console.log(
    `  [${row.lectureIndex ?? "?"}] ${row.date || "no date"} · ${row.title} — ${row.linkedCount} files`
  );
  for (const name of row.linked) console.log(`      · ${name}`);
}

console.log(`\nUnlinked pool (${unlinkedPool.length} files in extras)`);
for (const item of unlinkedPool.slice(0, 20)) console.log(`  - ${item.name} (${item.kind})`);
if (unlinkedPool.length > 20) console.log(`  … and ${unlinkedPool.length - 20} more`);

console.log(`\nSuggested lecture matches (${suggestions.length})`);
for (const entry of suggestions.slice(0, 25)) {
  console.log(
    `  [${entry.tier} ${entry.score}] ${entry.name} → ${entry.bestLecture}`
  );
}

if (storageByName.size) {
  console.log(`\nMissing storage_path (${linkedWithoutStorage.length} linked files)`);
  for (const name of linkedWithoutStorage.slice(0, 30)) console.log(`  - ${name}`);
  if (linkedWithoutStorage.length > 30) {
    console.log(`  … and ${linkedWithoutStorage.length - 30} more`);
  }
} else {
  console.log("\nMissing storage: (Supabase not configured — skipped DB check)");
}

console.log("\nDone.\n");
