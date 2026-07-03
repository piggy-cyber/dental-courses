// Shared loader + matching logic ported from the static site
// (assets/js/course-page.js) so the database import produces the same
// lecture ordering, video matches, and canonical syllabus choices.
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

export function loadWindowFile(absPath) {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(readFileSync(absPath, "utf8"), context);
  return context.window;
}

export function loadSiteData(repoRoot) {
  const js = (rel) => path.join(repoRoot, "assets", "js", rel);

  const courseData = loadWindowFile(js("course-data.js")).courseData;
  const lectureData = loadWindowFile(js("lecture-data.js")).lectureData;
  const resourceMap = loadWindowFile(js("resource-map.js")).resourceMap;

  const youtubePath = existsSync(js("youtube-videos.private.js"))
    ? js("youtube-videos.private.js")
    : js("youtube-videos.js");
  const transcriptPath = existsSync(js("transcript-content.private.js"))
    ? js("transcript-content.private.js")
    : js("transcript-content.js");

  const youtubeVideos = loadWindowFile(youtubePath).youtubeVideos?.videos ?? [];
  const transcriptItems =
    loadWindowFile(transcriptPath).transcriptContent?.items ?? {};

  return { courseData, lectureData, resourceMap, youtubeVideos, transcriptItems };
}

// --- title matching (ported verbatim in behavior) ---

export function normalizeTitle(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/^tim\s+/, "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_\-./#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function compactTitle(value) {
  return normalizeTitle(value).replace(/[^a-z0-9]/g, "");
}

const YOUTUBE_ID_IN_URL =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
const YOUTUBE_URL_RE = new RegExp(YOUTUBE_ID_IN_URL.source, "g");

/** Parse a bare ID or full YouTube URL into an 11-char video id. */
export function parseYoutubeId(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(YOUTUBE_ID_IN_URL);
  return match?.[1] ?? null;
}

/**
 * Pull the lecture's YouTube id from transcript header text.
 * FLS transcripts use `Source: https://www.youtube.com/watch?v=…` on line 3.
 * Skips aggregate checklist rows (combined / 16-videos) that list many URLs.
 */
export function extractYoutubeIdFromTranscript(text, { lectureId } = {}) {
  if (!text) return null;
  if (lectureId && /(?:combined|16-videos)/i.test(lectureId)) return null;

  const sourceLine = text.match(/^Source:\s*(\S+)/im);
  if (sourceLine) {
    const id = parseYoutubeId(sourceLine[1]);
    if (id) return id;
  }

  const header = text.slice(0, 2500);
  const urls = [...header.matchAll(YOUTUBE_URL_RE)];
  if (urls.length === 1) return urls[0][1];
  return null;
}

/** Prefer studio catalog match; fall back to the URL embedded in transcript text. */
export function resolveLectureYoutube({ row, videoIndex, transcriptText }) {
  const matches = youtubeMatches(row, videoIndex);
  const catalogVideo =
    matches.find((v) => v.visibility !== "private") ?? matches[0] ?? null;
  if (catalogVideo) {
    return {
      id: catalogVideo.id,
      visibility: catalogVideo.visibility ?? "unlisted",
      source: "catalog",
    };
  }

  const transcriptId = extractYoutubeIdFromTranscript(transcriptText, {
    lectureId: row.id,
  });
  if (transcriptId) {
    return { id: transcriptId, visibility: "unlisted", source: "transcript" };
  }

  return { id: null, visibility: null, source: null };
}

export function compactResourceText(value, courseCode) {
  let text = normalizeTitle(value);
  const code = String(courseCode || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (code) text = text.replace(new RegExp(code.replace(/\s+/g, "\\s*"), "g"), " ");
  return text
    .replace(/\b(lecture|lectures|slides|slide|transcript|transcripts|youtube|video|videos|recording|recordings|fall|spring|2025|2026)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[^a-z0-9]/g, "");
}

export function titleFromFileName(value) {
  return normalizeTitle(value)
    .replace(/\b(pdf|pptx?|docx?|txt|apkg)\b$/i, "")
    .replace(/\b\d{4}[-_]\d{2}[-_]\d{2}\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function buildVideoIndex(youtubeVideos) {
  const byTitle = new Map();
  const byCompact = new Map();
  for (const video of youtubeVideos) {
    const normal = normalizeTitle(video.title);
    const compact = compactTitle(video.title);
    if (normal && !byTitle.has(normal)) byTitle.set(normal, video);
    if (compact && !byCompact.has(compact)) byCompact.set(compact, video);
  }
  return { byTitle, byCompact };
}

export function youtubeMatches(row, index) {
  const candidates = [
    row.lectureTitle,
    ...(row.media || []).map((item) => item.title || item.name),
  ];
  const matches = [];
  const seen = new Set();
  for (const candidate of candidates) {
    const match =
      index.byTitle.get(normalizeTitle(candidate)) ||
      index.byCompact.get(compactTitle(candidate));
    if (match && !seen.has(match.id)) {
      seen.add(match.id);
      matches.push(match);
    }
  }
  return matches;
}

// --- lecture ordering ---

function lectureOrderHint(title) {
  const text = normalizeTitle(title);
  const lectureNumber = text.match(/lecture\s*(\d+)/);
  if (lectureNumber) return Number(lectureNumber[1]);
  if (/basics|introduction/.test(text)) return 1;
  if (/genetic foundations|carcinogenesis$|carcinogenesis i\b/.test(text)) return 2;
  if (/beyond mutations|carcinogenesis ii\b/.test(text)) return 3;
  if (/clinical features/.test(text)) return 4;
  if (/diagnosis|treatment/.test(text)) return 5;
  return 999;
}

function naturalKey(value) {
  return normalizeTitle(value).replace(/^tim\s+/, "");
}

export function sortLectureRows(rows) {
  return rows.slice().sort((a, b) => {
    const hintA = lectureOrderHint(a.lectureTitle);
    const hintB = lectureOrderHint(b.lectureTitle);
    if (hintA !== hintB && Math.min(hintA, hintB) < 999) return hintA - hintB;
    if (a.date && b.date && a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.date && !b.date) return 1;
    if (!a.date && b.date) return -1;
    return naturalKey(a.lectureTitle).localeCompare(naturalKey(b.lectureTitle), undefined, {
      numeric: true,
    });
  });
}

// --- canonical syllabus ---

function syllabusScore(item, course) {
  const name = compactTitle(item.name);
  const code = compactTitle(course.code);
  const title = compactTitle(course.title || "");
  let score = 0;
  if (code && name.includes(code)) score += 60;
  if (title && name.includes(title.slice(0, Math.min(title.length, 16)))) score += 25;
  if (String(item.ext).toUpperCase() === "PDF") score += 12;
  if (/schedule/i.test(item.name)) score += 6;
  if (/syllabus/i.test(item.name)) score += 6;
  return score;
}

export function canonicalResources(resources, course) {
  const syllabi = resources.filter((item) => item.kind === "Syllabus");
  if (syllabi.length <= 1) return resources;
  const selected = syllabi
    .slice()
    .sort((a, b) => syllabusScore(b, course) - syllabusScore(a, course) || a.name.localeCompare(b.name))[0];
  return resources.filter((item) => item.kind !== "Syllabus" || item === selected);
}

// --- import filters (drop survival-guide bleed and known misfiles) ---

const ARCHIVE_SECTION = /^(Fall Semester|Previous Year|Spring Semester)\s*$/i;

export function shouldImportResource(item, courseCode) {
  if (item.origin === "Survival Guide") return false;
  if (ARCHIVE_SECTION.test(String(item.section || "").trim())) return false;

  if (courseCode === "HEWB 130") {
    if (/^(asdf|1\. ergo review)/i.test(item.name)) return false;
    if (/^Dental Materials SG/i.test(item.name)) return false;
    if (/^Copy of Lecture \d+/i.test(item.name)) return false;
  }

  return true;
}

// --- synthetic slide-based lecture rows for underlisted courses ---

function isLectureDeckResource(item) {
  if (["Syllabus", "Transcript", "Flashcards", "Study Guide"].includes(item.kind)) return false;
  const ext = String(item.ext || "").toUpperCase();
  if (!["PDF", "PPT", "PPTX"].includes(ext)) return false;
  if (!["Course Root", "Lecture match"].includes(item.section || "") && item.kind !== "Slides") return false;
  return !/(exam|review|outline|memorization|statistics|written notes|read me|study guide|syllabus)/i.test(item.name);
}

export function lectureNumberFromName(name) {
  const match = String(name || "").match(/\blecture\s*(\d+)/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

export function relatedScore(row, item, options = {}) {
  const rowKey = compactResourceText(row.lectureTitle, row.courseCode);
  const itemKey = compactResourceText(item.name, row.courseCode);
  if (!rowKey || !itemKey) return 0;
  if (rowKey === itemKey) return 95;
  if (itemKey.length >= 8 && rowKey.includes(itemKey)) return 84;
  if (rowKey.length >= 8 && itemKey.includes(rowKey)) return 82;

  const rowText = normalizeTitle(row.lectureTitle);
  const itemText = normalizeTitle(item.name);
  const stop = new Set(["and", "the", "for", "with", "part", "lecture", "lectures", "slides", "transcript", "video", "hwdp", "hewb", "rehe", "dspr", "ldrs", "mahe"]);
  const rowTokens = rowText.split(" ").filter((token) => token.length > 2 && !stop.has(token));
  const itemTokens = new Set(itemText.split(" ").filter((token) => token.length > 2 && !stop.has(token)));
  const overlap = rowTokens.filter((token) => itemTokens.has(token));
  if (!overlap.length) return 0;
  const longOverlap = overlap.filter((token) => token.length > 5).length;
  let score = overlap.length * 13 + longOverlap * 7;

  const fileLectureNum = lectureNumberFromName(item.name);
  const rowLectureNum = row.lectureNumber ?? options.lectureIndex ?? null;
  if (fileLectureNum && rowLectureNum && fileLectureNum === rowLectureNum) {
    score += 30;
  }

  if (options.pairedLectureNumbers?.length && fileLectureNum) {
    if (options.pairedLectureNumbers.includes(fileLectureNum)) {
      score += item.kind === "Study Guide" ? 25 : 10;
    }
  }

  return score >= 40 ? score : 0;
}

export function syntheticLectureRows(course, existingRows, resources) {
  const datedLectures = existingRows.filter((row) => row.date || row.transcript);
  if (datedLectures.length >= 5) return [];

  const candidates = resources.filter((item) => isLectureDeckResource(item));
  if (!candidates.length) return [];
  if (existingRows.length >= 8 && existingRows.length >= candidates.length * 0.65) return [];
  const existingTitles = existingRows.map((row) => row.lectureTitle);
  return candidates
    .filter(
      (item) =>
        !existingTitles.some(
          (title) => relatedScore({ lectureTitle: title, courseCode: course.code }, item) >= 70
        )
    )
    .slice(0, 12)
    .map((item) => {
      const lectureTitle = titleFromFileName(item.name);
      return {
        id: `${course.code.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${compactResourceText(item.name, course.code)}-file-row`,
        courseCode: course.code,
        courseTitle: course.title || "",
        semester: course.semester || "",
        date: "",
        lectureTitle,
        transcriptSource: `${item.ext || item.kind} deck`,
        transcript: false,
        synthetic: true,
        media: [],
        lectureFiles: [
          {
            name: item.name,
            title: lectureTitle,
            type: item.ext || item.kind,
            source: item.origin || "Course file",
          },
        ],
      };
    });
}

// --- env loading (reads webapp/.env.local without extra dependencies) ---

export function loadEnv(webappRoot) {
  const envPath = path.join(webappRoot, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !(match[1] in process.env)) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}
