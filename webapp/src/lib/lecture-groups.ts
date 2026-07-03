import type { CourseResource } from "@/lib/course-organize";

export type LectureRow = {
  id: string;
  title: string;
  lecture_date: string | null;
  transcript_source: string | null;
  youtube_id: string | null;
  youtube_visibility: string | null;
  synthetic: boolean;
  sort_order?: number;
};

export type LectureWithFiles = {
  lecture: LectureRow;
  files: CourseResource[];
};

export type LectureTrack = "module" | "class";

export type LecturePartGroup = {
  kind: "series";
  title: string;
  sharedFiles: CourseResource[];
  parts: Array<{
    partLabel: string;
    lecture: LectureRow;
    files: CourseResource[];
  }>;
};

export type SessionGroup = {
  kind: "session";
  lecture: LectureRow;
  files: CourseResource[];
  topics: string[];
};

export type SingleGroup = {
  kind: "single";
  lecture: LectureRow;
  files: CourseResource[];
};

export type MetaGroup = {
  kind: "meta";
  lecture: LectureRow;
  files: CourseResource[];
};

export type DisplayLectureGroup = LecturePartGroup | SessionGroup | SingleGroup;

export type OrganizedLectures = {
  moduleGroups: DisplayLectureGroup[];
  classGroups: DisplayLectureGroup[];
  meta: MetaGroup[];
};

export function isMetaLecture(lecture: Pick<LectureRow, "id" | "title">) {
  if (/(?:combined|16-videos)/i.test(lecture.id)) return true;
  return /youtube lecture transcripts|16 videos|combined transcript/i.test(lecture.title);
}

export function parseSeriesPart(title: string) {
  const numeric = title.match(/^(.+?)\s+(\d+)$/);
  if (numeric) {
    return {
      base: numeric[1].trim(),
      part: numeric[2],
      partLabel: `Part ${numeric[2]}`,
    };
  }

  const roman = title.match(/^(.+?)\s+(I{1,3}|IV|V|VI{0,3}|IX|X|XI{0,3})$/i);
  if (roman) {
    return {
      base: roman[1].trim(),
      part: roman[2],
      partLabel: `Part ${roman[2].toUpperCase()}`,
    };
  }

  return { base: title.trim(), part: null, partLabel: null };
}

/** One Echo360 class block that covers several comma-separated topics. */
export function isMultiTopicSession(title: string) {
  if (!title.includes(",")) return false;
  return title.split(",").every((segment) => segment.trim().length > 1);
}

export function classifyLectureTrack(lecture: LectureRow): LectureTrack {
  if (isMultiTopicSession(lecture.title)) return "class";
  const source = lecture.transcript_source?.toLowerCase() ?? "";
  if (lecture.youtube_id || source === "youtube") return "module";
  return "class";
}

function intersectSharedFiles(allParts: CourseResource[][]) {
  if (!allParts.length) return { shared: [] as CourseResource[], byPart: allParts };

  let sharedNames = new Set(allParts[0].map((file) => file.name));
  for (const files of allParts.slice(1)) {
    const names = new Set(files.map((file) => file.name));
    sharedNames = new Set([...sharedNames].filter((name) => names.has(name)));
  }

  const pickShared = (files: CourseResource[]) =>
    files.filter((file) => sharedNames.has(file.name));
  const shared = pickShared(allParts[0]);
  const byPart = allParts.map((files) =>
    files.filter((file) => !sharedNames.has(file.name))
  );

  return { shared, byPart };
}

function sortModuleTrack(rows: LectureWithFiles[]) {
  return rows.slice().sort(
    (a, b) => (a.lecture.sort_order ?? 0) - (b.lecture.sort_order ?? 0)
  );
}

function sortClassTrack(rows: LectureWithFiles[]) {
  return rows.slice().sort((a, b) => {
    const dateA = a.lecture.lecture_date ?? "";
    const dateB = b.lecture.lecture_date ?? "";
    if (dateA && dateB && dateA !== dateB) return dateA.localeCompare(dateB);
    if (dateA && !dateB) return -1;
    if (!dateA && dateB) return 1;
    return (a.lecture.sort_order ?? 0) - (b.lecture.sort_order ?? 0);
  });
}

function groupRowsInTrack(sorted: LectureWithFiles[]): DisplayLectureGroup[] {
  const groups: DisplayLectureGroup[] = [];
  let index = 0;

  while (index < sorted.length) {
    const row = sorted[index];
    const parsed = parseSeriesPart(row.lecture.title);

    if (parsed.part) {
      const parts = [
        {
          partLabel: parsed.partLabel!,
          lecture: row.lecture,
          files: row.files,
        },
      ];
      let next = index + 1;
      while (next < sorted.length) {
        const candidate = sorted[next];
        const nextParsed = parseSeriesPart(candidate.lecture.title);
        if (!nextParsed.part || nextParsed.base !== parsed.base) break;
        parts.push({
          partLabel: nextParsed.partLabel!,
          lecture: candidate.lecture,
          files: candidate.files,
        });
        next += 1;
      }

      if (parts.length >= 2) {
        const { shared, byPart } = intersectSharedFiles(parts.map((part) => part.files));
        groups.push({
          kind: "series",
          title: parsed.base,
          sharedFiles: shared,
          parts: parts.map((part, partIndex) => ({
            ...part,
            files: byPart[partIndex],
          })),
        });
        index = next;
        continue;
      }
    }

    if (isMultiTopicSession(row.lecture.title)) {
      groups.push({
        kind: "session",
        lecture: row.lecture,
        files: row.files,
        topics: row.lecture.title
          .split(",")
          .map((topic) => topic.trim())
          .filter(Boolean),
      });
      index += 1;
      continue;
    }

    groups.push({ kind: "single", lecture: row.lecture, files: row.files });
    index += 1;
  }

  return groups;
}

export function groupLecturesForDisplay(rows: LectureWithFiles[]): OrganizedLectures {
  const meta: MetaGroup[] = [];
  const moduleRows: LectureWithFiles[] = [];
  const classRows: LectureWithFiles[] = [];

  for (const row of rows) {
    if (isMetaLecture(row.lecture)) {
      meta.push({ kind: "meta", ...row });
      continue;
    }
    if (classifyLectureTrack(row.lecture) === "module") {
      moduleRows.push(row);
    } else {
      classRows.push(row);
    }
  }

  return {
    moduleGroups: groupRowsInTrack(sortModuleTrack(moduleRows)),
    classGroups: groupRowsInTrack(sortClassTrack(classRows)),
    meta,
  };
}


export function lectureEmbeddable(lecture: LectureRow) {
  return Boolean(lecture.youtube_id && lecture.youtube_visibility !== "private");
}
