import path from "node:path";
import {
  canonicalResources,
  lectureNumberFromName,
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
  use_label?: string | null;
  size_mb?: number | null;
  storage_path: string | null;
  is_canonical_syllabus: boolean;
  lecture_id?: string | null;
  resource_role?: string | null;
  section_id?: string | null;
};

export type CourseEssentials = {
  syllabus: CourseResource[];
  masteryGuide: CourseResource[];
  textbookCompanion: CourseResource[];
};

const ARCHIVE_SECTION = /fall semester|survival guide|previous year|spring semester/i;
const MISFILED_NAME = /^(asdf|1\. ergo review|copy of lecture \d+)/i;
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
  const masteryGuide = active
    .filter((r) => r.kind === "Course Mastery Guide")
    .sort(sortResourceFormats);
  const textbookCompanion = active
    .filter((r) => r.kind === "Textbook Companion")
    .sort(sortResourceFormats);
  return {
    syllabus: syllabus ? [syllabus] : [],
    masteryGuide,
    textbookCompanion,
  };
}

function formatRank(resource: CourseResource) {
  const ext = String(resource.ext ?? "").toUpperCase();
  if (ext === "PDF") return 1;
  if (ext === "DOCX") return 2;
  if (ext === "DOC") return 3;
  if (ext === "PPTX") return 4;
  if (ext === "PPT") return 5;
  return 99;
}

function sortResourceFormats(a: CourseResource, b: CourseResource) {
  const rank = formatRank(a) - formatRank(b);
  if (rank !== 0) return rank;
  return a.name.localeCompare(b.name, undefined, { numeric: true });
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

function normalizeResourceName(name: string) {
  return name.replace(/\s+/g, " ").trim();
}

function dbResourceByName(
  resources: CourseResource[],
  name: string
): CourseResource | undefined {
  const exact = resources.find((r) => r.name === name);
  if (exact) return exact;
  const normalized = normalizeResourceName(name);
  if (normalized === name) return undefined;
  return resources.find((r) => normalizeResourceName(r.name) === normalized);
}

export function relatedResourcesForLecture(
  courseCode: string,
  lectureTitle: string,
  explicitFiles: LectureFileRef[],
  pool: CourseResource[],
  sourceResources: { name: string; kind?: string; ext?: string; section?: string }[],
  options: { lectureIndex?: number; lectureId?: string } = {}
) {
  const seen = new Set<string>();
  const linked: CourseResource[] = [];

  const add = (resource: CourseResource | undefined) => {
    if (!resource || seen.has(resource.name)) return;
    seen.add(resource.name);
    linked.push(resource);
  };

  if (options.lectureId) {
    for (const resource of pool) {
      if (resource.lecture_id === options.lectureId) {
        add(resource);
      }
    }
    if (linked.length > 0) {
      return linked.sort((a, b) => {
        const rank = (KIND_RANK[a.kind ?? ""] ?? 99) - (KIND_RANK[b.kind ?? ""] ?? 99);
        if (rank !== 0) return rank;
        return a.name.localeCompare(b.name, undefined, { numeric: true });
      });
    }
  }

  for (const file of explicitFiles) {
    add(dbResourceByName(pool, file.name));
  }

  if (!explicitFiles.length) {
    const pairedLectureNumbers = explicitFiles
      .map((file) => lectureNumberFromName(file.name))
      .filter((value): value is number => value !== null);

    const row = {
      lectureTitle,
      courseCode,
      lectureNumber: options.lectureIndex ?? null,
    };
    const scored = sourceResources
      .filter((item) => item.kind !== "Local Media Source" && item.kind !== "Transcript")
      .map((item) => ({
        item,
        score: relatedScore(row, item, {
          lectureIndex: options.lectureIndex,
          pairedLectureNumbers,
        }),
      }))
      .filter((entry) => entry.score >= 40)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    for (const { item } of scored) {
      add(dbResourceByName(pool, item.name));
    }
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
    [
      ...essentials.syllabus,
      ...essentials.masteryGuide,
      ...essentials.textbookCompanion,
    ].map((r) => r.name)
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

export { lectureNumberFromName, relatedScore, resourceKindFromExt };
