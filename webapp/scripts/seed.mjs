// Imports the course library into Supabase.
// Reads the static site's data files (including the local *.private.js files
// with real YouTube IDs and transcript text) and writes clean rows to the
// database. Safe to re-run; it replaces content tables each time.
//
// Usage:  node scripts/seed.mjs
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in webapp/.env.local.
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  loadSiteData,
  loadEnv,
  buildVideoIndex,
  youtubeMatches,
  sortLectureRows,
  canonicalResources,
  syntheticLectureRows,
} from "./lib/data.mjs";

const webappRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(webappRoot, "..");

loadEnv(webappRoot);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in webapp/.env.local"
  );
  process.exit(1);
}

const supabase = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { courseData, lectureData, resourceMap, youtubeVideos, transcriptItems } =
  loadSiteData(repoRoot);

if (!youtubeVideos.length) {
  console.warn(
    "Warning: no YouTube videos loaded (youtube-videos.private.js missing?). Lectures will have no video links."
  );
}
if (!Object.keys(transcriptItems).length) {
  console.warn(
    "Warning: no transcript text loaded (transcript-content.private.js missing?). Transcript buttons will be empty."
  );
}

const videoIndex = buildVideoIndex(youtubeVideos);

// 1. Courses
const courses = courseData.map((course, index) => ({
  code: course.code,
  title: course.title,
  semester: course.semester ?? null,
  semester_id: course.semesterId ?? null,
  area: course.area ?? null,
  sort_order: index,
}));

// 2. Lectures (real rows + the synthetic slide rows the site generates)
const lectures = [];
const transcripts = [];
const seenLectureIds = new Set();

for (const course of courseData) {
  const baseRows = (lectureData.rows || []).filter(
    (row) => row.courseCode === course.code
  );
  const resources = canonicalResources(
    resourceMap.courses?.[course.code]?.resources ?? [],
    course
  );
  const allRows = sortLectureRows([
    ...baseRows,
    ...syntheticLectureRows(course, baseRows, resources),
  ]);

  allRows.forEach((row, index) => {
    if (seenLectureIds.has(row.id)) return;
    seenLectureIds.add(row.id);

    const matches = youtubeMatches(row, videoIndex);
    const video = matches.find((v) => v.visibility !== "private") ?? matches[0] ?? null;

    lectures.push({
      id: row.id,
      course_code: course.code,
      title: row.lectureTitle,
      lecture_date: row.date || null,
      transcript_source: row.transcriptSource ?? null,
      youtube_id: video?.id ?? null,
      youtube_visibility: video?.visibility ?? null,
      synthetic: Boolean(row.synthetic),
      sort_order: index,
    });

    const transcript = transcriptItems[row.id];
    if (transcript?.text) {
      transcripts.push({
        lecture_id: row.id,
        content: transcript.text,
        word_count: transcript.wordCount ?? null,
        download_name: transcript.downloadName ?? null,
      });
    }
  });
}

// 3. Resources (transcript rows excluded; they live in the transcripts table)
const resources = [];
for (const course of courseData) {
  const list = canonicalResources(
    resourceMap.courses?.[course.code]?.resources ?? [],
    course
  );
  const syllabusNames = new Set(
    list.filter((item) => item.kind === "Syllabus").map((item) => item.name)
  );
  for (const item of list) {
    if (item.kind === "Transcript") continue;
    resources.push({
      course_code: course.code,
      name: item.name,
      kind: item.kind ?? null,
      ext: item.ext ?? null,
      section: item.section ?? null,
      use_label: item.use ?? null,
      size_mb: typeof item.sizeMb === "number" ? item.sizeMb : null,
      storage_path: null,
      is_canonical_syllabus: syllabusNames.has(item.name),
    });
  }
}

function loadStudentPillars() {
  const manifestPath = path.join(webappRoot, "data/student-pillars.json");
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const rows = [];
    for (const item of manifest.pillars) {
      if (item.masteryGuide) {
        for (const [ext, name] of [
          ["PDF", item.masteryGuide.pdf],
          ["DOCX", item.masteryGuide.docx],
        ]) {
          rows.push({
            course_code: item.courseCode,
            name,
            kind: "Course Mastery Guide",
            ext,
            section: "Study Guides",
            use_label: "Course mastery guide",
            size_mb: null,
            storage_path: null,
            is_canonical_syllabus: false,
          });
        }
      }
      if (item.textbookCompanion) {
        for (const [ext, name] of [
          ["PDF", item.textbookCompanion.pdf],
          ["DOCX", item.textbookCompanion.docx],
        ]) {
          rows.push({
            course_code: item.courseCode,
            name,
            kind: "Textbook Companion",
            ext,
            section: "Textbook Companion",
            use_label: "Course textbook companion",
            size_mb: null,
            storage_path: null,
            is_canonical_syllabus: false,
          });
        }
      }
    }
    return rows;
  } catch {
    console.warn("No student pillar manifest found; skipping pillars.");
    return [];
  }
}

const pillarResources = loadStudentPillars();
resources.push(...pillarResources);

const DELETE_FILTERS = {
  courses: ["code", "___none___"],
  lectures: ["id", "___none___"],
  transcripts: ["lecture_id", "___none___"],
  resources: ["id", -1],
};

async function replaceTable(table, rows, chunkSize = 500) {
  const [column, sentinel] = DELETE_FILTERS[table];
  const { error: deleteError } = await supabase
    .from(table)
    .delete()
    .neq(column, sentinel);
  if (deleteError) throw new Error(`${table} delete: ${deleteError.message}`);

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) throw new Error(`${table} insert: ${error.message}`);
    process.stdout.write(`  ${table}: ${Math.min(i + chunkSize, rows.length)}/${rows.length}\r`);
  }
  console.log(`  ${table}: ${rows.length} rows          `);
}

console.log("Importing course library into Supabase...");
await replaceTable("courses", courses);
await replaceTable("lectures", lectures);
await replaceTable("transcripts", transcripts, 50);
await replaceTable("resources", resources);

const withVideo = lectures.filter((lecture) => lecture.youtube_id).length;
console.log("");
console.log(`Done. ${courses.length} courses, ${lectures.length} lectures ` +
  `(${withVideo} with video), ${transcripts.length} transcripts, ${resources.length} files ` +
  `(incl. ${pillarResources.length} pillar files).`);
