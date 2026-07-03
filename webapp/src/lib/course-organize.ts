import path from "node:path";
import {
  canonicalResources,
  loadSiteData,
  relatedScore,
  shouldImportResource,
} from "../../scripts/lib/data.mjs";

const repoRoot = path.resolve(process.cwd(), "..");

export type LectureFileRef = {
  name: string;
  title?: string;
  type?: string;
  source?: string;
};

export type SourceLectureRow = {
  id: string;
  courseCode: string;
  lectureTitle: string;
  date?: string;
  transcript?: boolean;
  lectureFiles?: LectureFileRef[];
};

export type CourseResource = {
  id: number;
  name: string;
  kind: string | null;
  ext: string | null;
  section: string | null;
  storage_path: string | null;
  is_canonical_syllabus: boolean;
};

export type CourseEssentials = {
  syllabus: CourseResource | null;
  masteryGuide: CourseResource | null;
  textbookCompanion: CourseResource | null;
};

const ARCHIVE_SECTION = /fall semester|survival guide|previous year|spring semester/i;
const MISFILED_NAME = /^(asdf|1\. ergo review)/i;
const WRONG_COURSE_NAME = /dental materials sg/i;

export function isArchivedResource(resource: CourseResource) {
  const section = resource.section ?? "";
  if (ARCHIVE_SECTION.test(section)) return true;
  if (MISFILED_NAME.test(resource.name)) return true;
  if (WRONG_COURSE_NAME.test(resource.name)) return true;
  return false;
}

export function getSourceLectureRows(courseCode: string): SourceLectureRow[] {
  const { lectureData } = loadSiteData(repoRoot);
  return (lectureData.rows ?? []).filter(
    (row: SourceLectureRow) => row.courseCode === courseCode
  );
}

export function getCanonicalCourseResources(courseCode: string, courseTitle: string) {
  const { resourceMap, courseData } = loadSiteData(repoRoot);
  const course = courseData.find((c: { code: string }) => c.code === courseCode);
  const raw = resourceMap.courses?.[courseCode]?.resources ?? [];
  const filtered = raw.filter((item: { origin?: string; section?: string; name?: string }) =>
    shouldImportResource(item, courseCode)
  );
  return canonicalResources(filtered, course ?? { code: courseCode, title: courseTitle });
}

export function pickEssentials(resources: CourseResource[]): CourseEssentials {
  const active = resources.filter((r) => !isArchivedResource(r));
  const syllabus =
    active.find((r) => r.is_canonical_syllabus) ??
    active.find((r) => r.kind === "Syllabus") ??
    null;
  const masteryGuide =
    active.find((r) => r.kind === "Course Mastery Guide" && r.ext === "PDF") ??
    active.find((r) => r.kind === "Course Mastery Guide") ??
    null;
  const textbookCompanion =
    active.find((r) => r.kind === "Textbook Companion" && r.ext === "PDF") ??
    active.find((r) => r.kind === "Textbook Companion") ??
    null;
  return { syllabus, masteryGuide, textbookCompanion };
}

const KIND_RANK: Record<string, number> = {
  Slides: 1,
  Document: 2,
  "Study Guide": 3,
  Flashcards: 4,
  Image: 5,
  Other: 6,
};

function resourceKindFromExt(ext?: string) {
  const upper = String(ext || "").toUpperCase();
  if (["PDF", "PPT", "PPTX"].includes(upper)) return "Document";
  return "Other";
}

function dbResourceByName(
  resources: CourseResource[],
  name: string
): CourseResource | undefined {
  return resources.find((r) => r.name === name);
}

export function relatedResourcesForLecture(
  courseCode: string,
  lectureTitle: string,
  explicitFiles: LectureFileRef[],
  pool: CourseResource[],
  sourceResources: { name: string; kind?: string; ext?: string; section?: string }[]
) {
  const seen = new Set<string>();
  const linked: CourseResource[] = [];

  const add = (resource: CourseResource | undefined) => {
    if (!resource || seen.has(resource.name)) return;
    seen.add(resource.name);
    linked.push(resource);
  };

  for (const file of explicitFiles) {
    add(dbResourceByName(pool, file.name));
  }

  const row = { lectureTitle, courseCode };
  const scored = sourceResources
    .filter((item) => item.kind !== "Local Media Source" && item.kind !== "Transcript")
    .map((item) => ({
      item,
      score: relatedScore(row, item),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  for (const { item } of scored) {
    add(dbResourceByName(pool, item.name));
  }

  return linked.sort((a, b) => {
    const rank = (KIND_RANK[a.kind ?? ""] ?? 99) - (KIND_RANK[b.kind ?? ""] ?? 99);
    if (rank !== 0) return rank;
    return a.name.localeCompare(b.name, undefined, { numeric: true });
  });
}

export function organizeCourseResources(
  courseCode: string,
  courseTitle: string,
  dbResources: CourseResource[]
) {
  const archive = dbResources.filter(isArchivedResource);
  const active = dbResources.filter((r) => !isArchivedResource(r));
  const essentials = pickEssentials(active);

  const reservedNames = new Set(
    [essentials.syllabus, essentials.masteryGuide, essentials.textbookCompanion]
      .filter(Boolean)
      .map((r) => r!.name)
  );

  const pool = active.filter(
    (r) =>
      !reservedNames.has(r.name) &&
      !["Course Mastery Guide", "Textbook Companion", "Syllabus", "Transcript", "Local Media Source"].includes(
        r.kind ?? ""
      )
  );

  const sourceResources = getCanonicalCourseResources(courseCode, courseTitle);

  return { essentials, pool, archive, sourceResources };
}

export { relatedScore, resourceKindFromExt };
