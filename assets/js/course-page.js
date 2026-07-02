const courseData = window.courseData || [];
const lectureData = window.lectureData || { rows: [], courses: [], summary: {} };
const resourceMap = window.resourceMap || { courses: {}, summary: {} };
let youtubeVideos = Array.isArray(window.youtubeVideos?.videos) ? window.youtubeVideos.videos : [];

const params = new URLSearchParams(window.location.search);
let currentCourseCode = params.get("course") || localStorage.getItem("d1-current-course") || "HWDP 131";
let activeKind = "All";
const sampleCourseCodes = new Set(["HEWB 121"]);

const courseNav = document.querySelector("#course-nav");
const courseSelect = document.querySelector("#course-select");
const courseView = document.querySelector("#course-view");
const courseSearch = document.querySelector("#course-search");
const accessBanner = document.querySelector("#access-banner");
const courseSemester = document.querySelector("#course-semester");
const courseTitle = document.querySelector("#course-title");
const courseSubtitle = document.querySelector("#course-subtitle");
const courseStats = document.querySelector("#course-stats");
const courseOverview = document.querySelector("#course-overview");
const lectureFeed = document.querySelector("#lecture-feed");
const lectureFeedCount = document.querySelector("#lecture-feed-count");
const resourceShelf = document.querySelector("#resource-shelf");
const resourceShelfCount = document.querySelector("#resource-shelf-count");
const resourceKindTabs = document.querySelector("#resource-kind-tabs");
const transcriptModal = document.querySelector("#transcript-modal");
const transcriptTitle = document.querySelector("#transcript-title");
const transcriptMeta = document.querySelector("#transcript-meta");
const transcriptText = document.querySelector("#transcript-text");
const transcriptClose = document.querySelector("#transcript-close");
const transcriptCopy = document.querySelector("#transcript-copy");
const transcriptDownload = document.querySelector("#transcript-download");
const transcriptStatus = document.querySelector("#transcript-status");
const resourceModal = document.querySelector("#resource-modal");
const resourceTitle = document.querySelector("#resource-title");
const resourceMeta = document.querySelector("#resource-meta");
const resourceDetail = document.querySelector("#resource-detail");
const resourceClose = document.querySelector("#resource-close");
const resourceOpen = document.querySelector("#resource-open");
const resourceCopyName = document.querySelector("#resource-copy-name");
const resourceStatus = document.querySelector("#resource-status");
let activeTranscript = null;
let activeResource = null;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  })[char]);
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

function normalizeTitle(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/^tim\s+/, "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_\-./#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactTitle(value) {
  return normalizeTitle(value).replace(/[^a-z0-9]/g, "");
}

function compactResourceText(value, courseCode = currentCourseCode) {
  let text = normalizeTitle(value);
  const code = String(courseCode || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (code) text = text.replace(new RegExp(code.replace(/\s+/g, "\\s*"), "g"), " ");
  return text
    .replace(/\b(lecture|lectures|slides|slide|transcript|transcripts|youtube|video|videos|recording|recordings|fall|spring|2025|2026)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[^a-z0-9]/g, "");
}

function titleFromFileName(value) {
  return normalizeTitle(value)
    .replace(/\b(pdf|pptx?|docx?|txt|apkg)\b$/i, "")
    .replace(/\b\d{4}[-_]\d{2}[-_]\d{2}\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function syllabusScore(item, courseCode = currentCourseCode, course = courseRecord()) {
  const name = compactTitle(item.name);
  const code = compactTitle(courseCode);
  const title = compactTitle(course?.title || "");
  let score = 0;
  if (code && name.includes(code)) score += 60;
  if (title && name.includes(title.slice(0, Math.min(title.length, 16)))) score += 25;
  if (String(item.ext).toUpperCase() === "PDF") score += 12;
  if (/schedule/i.test(item.name)) score += 6;
  if (/syllabus/i.test(item.name)) score += 6;
  return score;
}

function canonicalResources(resources, courseCode = currentCourseCode) {
  const course = courseData.find((item) => item.code === courseCode);
  const syllabi = resources.filter((item) => item.kind === "Syllabus");
  if (syllabi.length <= 1) return resources;
  const selectedSyllabus = syllabi
    .slice()
    .sort((a, b) => syllabusScore(b, courseCode, course) - syllabusScore(a, courseCode, course) || a.name.localeCompare(b.name))[0];
  return resources.filter((item) => item.kind !== "Syllabus" || item === selectedSyllabus);
}

function resourceKindFromExt(ext) {
  const value = String(ext || "").toUpperCase();
  if (["PPT", "PPTX"].includes(value)) return "Slides";
  if (["TXT", "VTT", "SRT"].includes(value)) return "Transcript";
  if (["APKG"].includes(value)) return "Flashcards";
  if (["PNG", "JPG", "JPEG", "WEBP"].includes(value)) return "Image";
  if (["PDF", "DOC", "DOCX"].includes(value)) return "Document";
  return "Document";
}

const resourceKindRank = {
  Transcript: 0,
  Slides: 1,
  Document: 2,
  "Study Guide": 3,
  Flashcards: 4,
  Syllabus: 5,
  Image: 6,
  Other: 7
};

const resourceKindCode = {
  Transcript: "TXT",
  Slides: "SLD",
  Document: "DOC",
  "Study Guide": "GUIDE",
  Flashcards: "ANKI",
  Syllabus: "SYL",
  Image: "IMG",
  Other: "FILE"
};

const resourceKindUse = {
  Transcript: "Use this as source text for review, summarizing, question generation, or comparing against the lecture recording.",
  Slides: "Use this while watching the lecture so diagrams, tables, and image-heavy details stay anchored to the instructor sequence.",
  Document: "Use this as a supporting handout or reference when the lecture points to a deeper explanation.",
  "Study Guide": "Use this after the lecture pass to check what matters most and organize review.",
  Flashcards: "Use this for spaced recall after you have watched the lecture and reviewed the transcript.",
  Syllabus: "Use this for course expectations, schedule references, and assignment context.",
  Image: "Use this when the topic depends on recognition, anatomy, radiographs, or visual comparison.",
  Other: "Use this as a supplemental file attached to the course library."
};

let videosByTitle = new Map();
let videosByCompactTitle = new Map();

function rebuildVideoIndexes() {
  videosByTitle = new Map();
  videosByCompactTitle = new Map();
  youtubeVideos.forEach((video) => {
    const normal = normalizeTitle(video.title);
    const compact = compactTitle(video.title);
    if (normal) videosByTitle.set(normal, video);
    if (compact) videosByCompactTitle.set(compact, video);
  });
}

rebuildVideoIndexes();

function findVideo(title) {
  const normal = normalizeTitle(title);
  const compact = compactTitle(title);
  return videosByTitle.get(normal) || videosByCompactTitle.get(compact) || null;
}

function youtubeMatches(row) {
  const candidates = [
    row.lectureTitle,
    ...(row.media || []).map((item) => item.title || item.name)
  ];
  const matches = [];
  const seen = new Set();
  candidates.forEach((candidate) => {
    const match = findVideo(candidate);
    if (match && !seen.has(match.id)) {
      seen.add(match.id);
      matches.push(match);
    }
  });
  return matches;
}

function isEmbeddable(video) {
  return video && video.visibility !== "private";
}

function sortLectureRows(rows) {
  return rows.slice().sort((a, b) => {
    const hintA = lectureOrderHint(a.lectureTitle);
    const hintB = lectureOrderHint(b.lectureTitle);
    if (hintA !== hintB && Math.min(hintA, hintB) < 999) return hintA - hintB;
    if (a.date && b.date && a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.date && !b.date) return 1;
    if (!a.date && b.date) return -1;
    return naturalKey(a.lectureTitle).localeCompare(naturalKey(b.lectureTitle), undefined, { numeric: true });
  });
}

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

function accessMode() {
  return params.get("demo") || localStorage.getItem("d1-access-mode") || "visitor";
}

function isSampleCourse(courseCode = currentCourseCode) {
  return sampleCourseCodes.has(courseCode);
}

function canPreviewDownloads() {
  return ["student", "owner"].includes(accessMode()) || isSampleCourse();
}

function transcriptItems() {
  return window.transcriptContent?.items || {};
}

function transcriptForRow(row) {
  return transcriptItems()[row.id] || null;
}

function courseRecord() {
  return courseData.find((course) => course.code === currentCourseCode) || courseData[0];
}

function courseResources() {
  return canonicalResources(resourceMap.courses?.[currentCourseCode]?.resources || [], currentCourseCode);
}

function courseLectureRows() {
  const baseRows = (lectureData.rows || []).filter((row) => row.courseCode === currentCourseCode);
  const expandedRows = [...baseRows, ...syntheticLectureRows(baseRows)];
  return sortLectureRows(expandedRows).map((row) => ({ ...row, youtube: youtubeMatches(row) }));
}

function syntheticLectureRows(existingRows) {
  const candidates = courseResources().filter((item) => isLectureDeckResource(item));
  if (!candidates.length) return [];
  if (existingRows.length >= 8 && existingRows.length >= candidates.length * 0.65) return [];
  const existingTitles = existingRows.map((row) => row.lectureTitle);
  return candidates
    .filter((item) => !existingTitles.some((title) => relatedScore({ lectureTitle: title, courseCode: currentCourseCode }, item) >= 70))
    .slice(0, 12)
    .map((item) => {
      const lectureTitle = titleFromFileName(item.name);
      return {
        id: `${currentCourseCode.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${compactResourceText(item.name)}-file-row`,
        courseCode: currentCourseCode,
        courseTitle: courseRecord()?.title || "",
        semester: courseRecord()?.semester || "",
        date: "",
        lectureTitle,
        transcriptSource: `${item.ext || item.kind} deck`,
        transcript: false,
        mediaCount: 0,
        lectureFileCount: 1,
        status: "matched",
        synthetic: true,
        media: [],
        lectureFiles: [{
          name: item.name,
          title: lectureTitle,
          type: item.ext || item.kind,
          source: item.origin || "Course file"
        }]
      };
    });
}

function isLectureDeckResource(item) {
  if (item.kind === "Syllabus" || item.kind === "Transcript" || item.kind === "Flashcards" || item.kind === "Study Guide") return false;
  const ext = String(item.ext || "").toUpperCase();
  if (!["PDF", "PPT", "PPTX"].includes(ext)) return false;
  if (!["Course Root", "Lecture match"].includes(item.section || "") && item.kind !== "Slides") return false;
  return !/(exam|review|outline|memorization|statistics|written notes|read me|study guide|syllabus)/i.test(item.name);
}

function explicitLectureResources(row) {
  return (row.lectureFiles || []).map((file) => ({
    name: file.name || file.title,
    ext: file.type || "",
    kind: resourceKindFromExt(file.type),
    use: "Lecture file",
    origin: file.source || "Course file",
    section: "Lecture match",
    sizeMb: "",
    score: 100,
    explicit: true
  }));
}

function relatedScore(row, item) {
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
  const score = overlap.length * 13 + longOverlap * 7;
  return score >= 28 ? score : 0;
}

function relatedResourcesForRow(row) {
  const seen = new Set();
  const resources = [];
  const add = (item) => {
    const key = `${item.kind}|${item.section}|${item.name}`.toLowerCase();
    if (!item.name || seen.has(key)) return;
    seen.add(key);
    resources.push(item);
  };

  explicitLectureResources(row).forEach(add);

  courseResources()
    .filter((item) => item.kind !== "Local Media Source" && item.kind !== "Transcript")
    .map((item) => ({ ...item, score: relatedScore(row, item), explicit: false }))
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    })
    .slice(0, 8)
    .forEach(add);

  return resources
    .sort((a, b) => {
      const rank = (resourceKindRank[a.kind] ?? 99) - (resourceKindRank[b.kind] ?? 99);
      if (rank !== 0) return rank;
      if ((b.explicit ? 1 : 0) !== (a.explicit ? 1 : 0)) return (b.explicit ? 1 : 0) - (a.explicit ? 1 : 0);
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    })
    .slice(0, 6);
}

function renderAccessBanner() {
  const mode = accessMode();
  const copy = isSampleCourse()
    ? ["Free sample course", "This sample course is open so students can preview the course hub before requesting full access."]
    : mode === "owner"
    ? ["Owner preview", "You can review the student experience and the approval queue."]
    : mode === "student"
      ? ["Approved student access", "Videos, transcripts, lecture packets, and supplemental files are organized into one course workspace."]
      : ["Access required", "Sign in or request access to open the protected course workspace."];

  const links = mode === "owner"
    ? [["login.html", "Account"], ["owner.html?demo=owner", "Owner queue"]]
    : [["login.html", "Account"], ["library.html", "Library"]];

  accessBanner.innerHTML = `
    <div>
      <strong>${escapeHtml(copy[0])}</strong>
      <span>${escapeHtml(copy[1])}</span>
    </div>
    <div class="access-actions">
      ${links.map(([href, label]) => `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`).join("")}
    </div>
  `;
}

function renderCourseControls() {
  courseSelect.innerHTML = courseData.map((course) => `
    <option value="${escapeHtml(course.code)}" ${course.code === currentCourseCode ? "selected" : ""}>
      ${escapeHtml(course.code)} ${escapeHtml(course.title)}
    </option>
  `).join("");

  const rows = courseLectureRows();
  const currentView = courseView.value || "lectures";
  const viewOptions = [
    ["lectures", "Lectures first", rows.length],
    ["youtube", "Videos with captions", rows.filter((row) => row.youtube.some(isEmbeddable)).length],
    ["needs-review", "Packet gaps", rows.filter((row) => row.status === "needs-review").length],
    ["resources", "Supplemental packets", rows.filter((row) => relatedResourcesForRow(row).length > 0).length]
  ];
  courseView.innerHTML = viewOptions.map(([value, label, count]) => `
    <option value="${escapeHtml(value)}" ${value === currentView ? "selected" : ""}>
      ${escapeHtml(label)} (${formatNumber(count)})
    </option>
  `).join("");

  courseNav.innerHTML = courseData.map((course) => `
    <a class="${course.code === currentCourseCode ? "is-active" : ""}" href="course.html?course=${encodeURIComponent(course.code)}&demo=${encodeURIComponent(accessMode())}" data-course="${escapeHtml(course.code)}">
      <span>${escapeHtml(course.semester)}</span>
      <strong>${escapeHtml(course.code)}</strong>
      <small>${escapeHtml(course.title)}</small>
    </a>
  `).join("");
}

function renderCourseHero() {
  const course = courseRecord();
  const rows = courseLectureRows();
  const resources = courseResources();
  const youtubeCount = rows.filter((row) => row.youtube.some(isEmbeddable)).length;
  const transcriptCount = rows.filter((row) => row.transcript).length;
  const fileCount = rows.reduce((count, row) => count + relatedResourcesForRow(row).length, 0);
  const resourceCounts = courseKindCounts(resources);

  document.title = `${course.code} ${course.title} | D1 Course Library`;
  courseSemester.textContent = course.semester;
  courseTitle.textContent = `${course.code} ${course.title}`;
  courseSubtitle.textContent = "Lectures, captions, slides, PDFs, study guides, flashcards, and supplemental resources in one course workspace.";

  courseStats.innerHTML = `
    <div><strong>${formatNumber(rows.length)}</strong><span>lectures</span></div>
    <div><strong>${formatNumber(transcriptCount)}</strong><span>captions</span></div>
    <div><strong>${formatNumber(youtubeCount)}</strong><span>videos</span></div>
    <div><strong>${formatNumber(fileCount)}</strong><span>packet files</span></div>
    <div><strong>${formatNumber(resources.length)}</strong><span>resources</span></div>
    <div><strong>${formatNumber(resourceCounts.Flashcards || 0)}</strong><span>flashcards</span></div>
  `;
}

function courseKindCounts(resources) {
  return resources.reduce((counts, item) => {
    counts[item.kind] = (counts[item.kind] || 0) + 1;
    return counts;
  }, {});
}

function renderCourseOverview() {
  const rows = courseLectureRows();
  const resources = courseResources().filter((item) => item.kind !== "Local Media Source");
  const kindCounts = courseKindCounts(resources);
  const videoRows = rows.filter((row) => row.youtube.some(isEmbeddable)).length;
  const packetRows = rows.filter((row) => relatedResourcesForRow(row).length > 0).length;
  const gapRows = rows.filter((row) => row.status === "needs-review").length;
  const transcriptRows = rows.filter((row) => row.transcript).length;
  const topKinds = ["Slides", "Document", "Transcript", "Study Guide", "Flashcards", "Syllabus"]
    .filter((kind) => kindCounts[kind])
    .map((kind) => [kind, kindCounts[kind]]);

  courseOverview.innerHTML = `
    <div class="overview-panel">
      <div>
        <p class="eyebrow">Course Map</p>
        <h2>Start with the lecture order, then open the packet beside each lecture.</h2>
      </div>
      <div class="overview-actions">
        <button type="button" data-overview-view="lectures">All lectures <span>${formatNumber(rows.length)}</span></button>
        <button type="button" data-overview-view="youtube">Videos <span>${formatNumber(videoRows)}</span></button>
        <button type="button" data-overview-view="resources">Packets <span>${formatNumber(packetRows)}</span></button>
        <button type="button" data-overview-view="needs-review">Gaps <span>${formatNumber(gapRows)}</span></button>
      </div>
    </div>
    <div class="overview-mix">
      <div><strong>${formatNumber(transcriptRows)}</strong><span>AI-ready transcripts beside lecture rows</span></div>
      <div><strong>${formatNumber(resources.length)}</strong><span>indexed supplemental files in the course shelf</span></div>
      <div class="overview-kind-list">
        ${topKinds.map(([kind, count]) => `
          <button type="button" data-overview-kind="${escapeHtml(kind)}">
            ${escapeHtml(kind)} <span>${formatNumber(count)}</span>
          </button>
        `).join("")}
      </div>
    </div>
  `;

  courseOverview.querySelectorAll("[data-overview-view]").forEach((button) => {
    button.addEventListener("click", () => {
      courseView.value = button.dataset.overviewView;
      renderLectures();
      document.querySelector("#lecture-feed-title")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  courseOverview.querySelectorAll("[data-overview-kind]").forEach((button) => {
    button.addEventListener("click", () => {
      activeKind = button.dataset.overviewKind;
      renderResourceShelf();
      document.querySelector("#resource-shelf-title")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function videoPanel(row) {
  const video = row.youtube.find(isEmbeddable) || row.youtube[0] || null;
  if (!video && row.synthetic) return filePreviewTile(row);
  if (!video) {
    return `
      <div class="mini-video-placeholder">
        <span>Caption ready</span>
        <strong>Video not attached yet</strong>
      </div>
    `;
  }
  if (!canPreviewDownloads()) {
    return `
      <div class="mini-video-placeholder">
        <span>Access required</span>
        <strong>Sign in to view video</strong>
      </div>
    `;
  }
  if (!isEmbeddable(video)) {
    return `
      <div class="mini-video-placeholder">
        <span>Private video</span>
        <strong>${escapeHtml(video.title)}</strong>
      </div>
    `;
  }
  return `
    <div class="mini-video">
      <iframe
        title="${escapeHtml(video.title)}"
        src="https://www.youtube.com/embed/${encodeURIComponent(video.id)}"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen></iframe>
    </div>
  `;
}

function filePreviewTile(row) {
  const file = row.lectureFiles?.[0] || {};
  return `
    <div class="mini-file-preview">
      <span>${escapeHtml(file.type || "FILE")}</span>
      <strong>${escapeHtml(row.lectureTitle)}</strong>
      <small>Slide-based lecture row</small>
    </div>
  `;
}

function transcriptAction(row) {
  const transcript = transcriptForRow(row);
  const state = !canPreviewDownloads() ? "Locked" : transcript ? "Open" : "Queued";
  const detail = !canPreviewDownloads()
    ? "Approved access opens transcript tools"
    : transcript
      ? `${formatNumber(transcript.wordCount)} words · copy or download`
      : "Transcript file is indexed for this lecture";
  return `
    <button class="resource-action transcript" type="button" data-transcript-id="${escapeHtml(row.id)}" aria-label="Open transcript for ${escapeHtml(row.lectureTitle)}">
      <span>TXT</span>
      <strong>${state} transcript</strong>
      <small>${escapeHtml(detail)}</small>
    </button>
  `;
}

function packetSummary(row, relatedResources) {
  const chips = [];
  if (row.youtube.some(isEmbeddable)) chips.push("Video");
  if (row.transcript) chips.push("Transcript");
  if (relatedResources.length) chips.push(`${relatedResources.length} files`);
  return chips.length ? `<div class="lecture-packet-summary">${chips.map((chip) => `<span>${escapeHtml(chip)}</span>`).join("")}</div>` : "";
}

function relatedResourceButtons(row) {
  const resources = relatedResourcesForRow(row);
  if (!resources.length) {
    return '<span class="empty-inline">Related files pending review</span>';
  }
  return resources.map((item, index) => {
    const detailParts = [item.use, item.section, item.sizeMb ? `${item.sizeMb} MB` : ""].filter(Boolean);
    return `
      <button class="resource-action" type="button" data-resource-row="${escapeHtml(row.id)}" data-resource-index="${index}" data-resource-kind="${escapeHtml(item.kind)}">
        <span>${escapeHtml(resourceKindCode[item.kind] || item.ext || "FILE")}</span>
        <strong>${escapeHtml(item.name)}</strong>
        <small>${escapeHtml(canPreviewDownloads() ? detailParts.join(" · ") || "Indexed in protected library" : "Access required")}</small>
      </button>
    `;
  }).join("");
}

function rowMatches(row, query) {
  const haystack = [
    row.lectureTitle,
    row.date,
    row.transcriptSource,
    ...(row.lectureFiles || []).map((file) => `${file.name} ${file.title}`),
    ...(row.media || []).map((item) => `${item.name} ${item.title}`),
    ...row.youtube.map((video) => video.title),
    ...relatedResourcesForRow(row).map((item) => `${item.name} ${item.kind} ${item.section} ${item.use}`)
  ].join(" ").toLowerCase();
  return !query || haystack.includes(query);
}

function rowViewMatches(row, view) {
  if (view === "youtube") return row.youtube.some(isEmbeddable);
  if (view === "needs-review") return row.status === "needs-review";
  if (view === "resources") return relatedResourcesForRow(row).length > 0;
  return true;
}

function renderLectures() {
  const query = courseSearch.value.trim().toLowerCase();
  const view = courseView.value;
  const rows = courseLectureRows().filter((row) => rowViewMatches(row, view) && rowMatches(row, query));

  lectureFeed.innerHTML = rows.map((row, index) => {
    const relatedResources = relatedResourcesForRow(row);
    return `
    <article class="course-lecture-card ${relatedResources.length ? "has-packet" : ""}">
      <div class="lecture-number">${String(index + 1).padStart(2, "0")}</div>
      <div class="lecture-video-cell">${videoPanel(row)}</div>
      <div class="lecture-main-cell">
        <div class="lecture-meta">
          <span>${escapeHtml(row.date || "Order by title")}</span>
          <span>${escapeHtml(row.transcriptSource || "Transcript")}</span>
          <span>${row.status === "matched" ? "Packet paired" : "Packet pending"}</span>
        </div>
        <h3>${escapeHtml(row.lectureTitle)}</h3>
        ${packetSummary(row, relatedResources)}
        <div class="lecture-resource-grid">
          ${transcriptAction(row)}
          ${relatedResourceButtons(row)}
        </div>
      </div>
    </article>
  `;
  }).join("");

  lectureFeedCount.textContent = `${formatNumber(rows.length)} rows`;
  bindTranscriptButtons(rows);
  bindResourceButtons(rows);
}

function bindTranscriptButtons(rows) {
  const rowMap = new Map(rows.map((row) => [row.id, row]));
  lectureFeed.querySelectorAll("[data-transcript-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const row = rowMap.get(button.dataset.transcriptId);
      if (row) openTranscript(row);
    });
  });
}

function bindResourceButtons(rows) {
  const rowMap = new Map(rows.map((row) => [row.id, row]));
  lectureFeed.querySelectorAll("[data-resource-row]").forEach((button) => {
    button.addEventListener("click", () => {
      const row = rowMap.get(button.dataset.resourceRow);
      const index = Number(button.dataset.resourceIndex);
      const item = row ? relatedResourcesForRow(row)[index] : null;
      if (item) openResource(item, row);
    });
  });
}

function openTranscript(row) {
  if (!canPreviewDownloads()) {
    activeTranscript = null;
    transcriptTitle.textContent = row.lectureTitle;
    transcriptMeta.textContent = `${row.courseCode} · Access required`;
    transcriptText.value = "Sign in after approval to open, copy, or download this transcript.";
    transcriptStatus.textContent = "Transcript locked.";
    transcriptCopy.disabled = true;
    transcriptDownload.disabled = true;
    transcriptModal.hidden = false;
    return;
  }
  const transcript = transcriptForRow(row);
  activeTranscript = transcript ? { row, transcript } : null;
  transcriptTitle.textContent = row.lectureTitle;
  transcriptMeta.textContent = `${row.courseCode} · ${row.transcriptSource || "Transcript"} · ${transcript ? formatNumber(transcript.wordCount) : "0"} words`;
  transcriptText.value = transcript?.text || "Transcript content is staged for protected hosting, but no local preview text was found for this row.";
  transcriptStatus.textContent = transcript ? "Transcript ready." : "Transcript unavailable in preview.";
  transcriptCopy.disabled = !transcript;
  transcriptDownload.disabled = !transcript;
  transcriptModal.hidden = false;
  transcriptText.focus();
}

function resourceAccessState(item) {
  if (!canPreviewDownloads()) return "Access required";
  if (item.locked === false) return "Available";
  return "Approved library access";
}

function resourceDetailRows(item, row = null) {
  const rows = [
    ["Type", item.kind || resourceKindFromExt(item.ext)],
    ["Course section", item.section || "Course library"],
    ["Source", item.origin || "Course file"],
    ["Size", item.sizeMb ? `${item.sizeMb} MB` : "Not listed"],
    ["Access", resourceAccessState(item)]
  ];
  if (row) rows.unshift(["Lecture", row.lectureTitle]);
  return rows;
}

function openResource(item, row = null) {
  activeResource = { item, row };
  const kind = item.kind || resourceKindFromExt(item.ext);
  resourceTitle.textContent = item.name;
  resourceMeta.textContent = `${kind} · ${currentCourseCode}`;
  resourceDetail.innerHTML = `
    ${resourcePreviewPanel(item)}
    <div class="resource-detail-grid">
      ${resourceDetailRows(item, row).map(([label, value]) => `
        <div>
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `).join("")}
    </div>
    <section class="resource-use-panel">
      <span>How to use this</span>
      <p>${escapeHtml(resourceKindUse[kind] || resourceKindUse.Other)}</p>
    </section>
  `;
  resourceStatus.textContent = canPreviewDownloads()
    ? "This protected item is indexed for the course packet. Preview opens after secure file hosting is connected."
    : "Sign in after approval to open this file.";
  resourceOpen.textContent = canPreviewDownloads() ? "Open protected file" : "Locked";
  resourceOpen.disabled = true;
  resourceCopyName.disabled = false;
  resourceModal.hidden = false;
}

function resourcePreviewPanel(item) {
  const ext = String(item.ext || "").toUpperCase();
  const kind = item.kind || resourceKindFromExt(ext);
  const locked = !canPreviewDownloads();
  const title = locked ? "Access required" : previewTitle(ext, kind);
  const detail = locked
    ? "Approved access opens file preview and download tools."
    : previewDetail(ext, kind);
  return `
    <section class="resource-preview-panel ${locked ? "is-locked" : ""}">
      <div class="preview-sheet">
        <span>${escapeHtml(ext || resourceKindCode[kind] || "FILE")}</span>
        <strong>${escapeHtml(item.name)}</strong>
        <small>${escapeHtml(previewSheetCopy(ext, kind))}</small>
      </div>
      <div>
        <span>Preview</span>
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(detail)}</p>
      </div>
    </section>
  `;
}

function previewTitle(ext, kind) {
  if (ext === "PDF") return "PDF preview slot";
  if (["PPT", "PPTX"].includes(ext) || kind === "Slides") return "Slide preview slot";
  if (["DOC", "DOCX"].includes(ext)) return "Document preview slot";
  return "File preview slot";
}

function previewDetail(ext, kind) {
  if (ext === "PDF") return "A page preview appears here once the protected file is connected.";
  if (["PPT", "PPTX"].includes(ext) || kind === "Slides") return "Slide thumbnails appear here once the protected deck is connected.";
  if (["DOC", "DOCX"].includes(ext)) return "Document pages appear here once the protected file is connected.";
  return "A protected preview appears here when this file type is connected.";
}

function previewSheetCopy(ext, kind) {
  if (["PPT", "PPTX"].includes(ext) || kind === "Slides") return "Deck preview";
  if (ext === "PDF") return "Page preview";
  if (["DOC", "DOCX"].includes(ext)) return "Document preview";
  return "Protected file";
}

function closeResource() {
  resourceModal.hidden = true;
  activeResource = null;
}

async function copyResourceName() {
  if (!activeResource) return;
  try {
    await navigator.clipboard.writeText(activeResource.item.name);
    resourceStatus.textContent = "File name copied.";
  } catch (_) {
    resourceStatus.textContent = activeResource.item.name;
  }
}

function closeTranscript() {
  transcriptModal.hidden = true;
  activeTranscript = null;
}

async function copyTranscript() {
  if (!activeTranscript) return;
  try {
    await navigator.clipboard.writeText(activeTranscript.transcript.text);
    transcriptStatus.textContent = "Copied.";
  } catch (_) {
    transcriptText.select();
    transcriptStatus.textContent = "Select and copy from the text box.";
  }
}

function downloadTranscript() {
  if (!activeTranscript) return;
  const blob = new Blob([activeTranscript.transcript.text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = activeTranscript.transcript.downloadName || `${activeTranscript.row.id}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  transcriptStatus.textContent = "Download started.";
}

function resourceKinds(resources) {
  const base = ["All", "Transcript", "Slides", "Study Guide", "Flashcards", "Syllabus", "Document", "Image"];
  return base.filter((kind) => kind === "All" || resources.some((item) => item.kind === kind));
}

function resourceMatches(item, query) {
  const haystack = [item.name, item.kind, item.use, item.origin, item.section, item.ext].join(" ").toLowerCase();
  return !query || haystack.includes(query);
}

function renderResourceShelf() {
  const resources = courseResources().filter((item) => item.kind !== "Local Media Source");
  const kinds = resourceKinds(resources);
  const kindCounts = resources.reduce((counts, item) => {
    counts[item.kind] = (counts[item.kind] || 0) + 1;
    return counts;
  }, { All: resources.length });
  if (!kinds.includes(activeKind)) activeKind = "All";
  resourceKindTabs.innerHTML = kinds.map((kind) => `
    <button class="filter-button ${kind === activeKind ? "is-active" : ""}" type="button" data-kind="${escapeHtml(kind)}">
      ${escapeHtml(kind)} ${formatNumber(kindCounts[kind] || 0)}
    </button>
  `).join("");

  resourceKindTabs.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      activeKind = button.dataset.kind;
      renderResourceShelf();
    });
  });

  const query = courseSearch.value.trim().toLowerCase();
  const shown = resources
    .filter((item) => (activeKind === "All" || item.kind === activeKind) && resourceMatches(item, query))
    .slice(0, 180);

  resourceShelf.innerHTML = shown.map((item, index) => `
    <article class="resource-card">
      <div>
        <span>${escapeHtml(item.kind)}</span>
        <strong>${escapeHtml(item.name)}</strong>
        <small>${escapeHtml(item.section)} · ${escapeHtml(item.origin)} · ${escapeHtml(item.sizeMb)} MB</small>
      </div>
      <button type="button" data-shelf-index="${index}">${canPreviewDownloads() ? "Open" : "Locked"}</button>
    </article>
  `).join("");

  resourceShelfCount.textContent = `${formatNumber(shown.length)} shown`;
  resourceShelf.querySelectorAll("[data-shelf-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = shown[Number(button.dataset.shelfIndex)];
      if (item) openResource(item);
    });
  });
}

function renderAll() {
  localStorage.setItem("d1-current-course", currentCourseCode);
  renderAccessBanner();
  renderCourseControls();
  renderCourseHero();
  renderCourseOverview();
  renderLectures();
  renderResourceShelf();
}

courseSelect.addEventListener("change", () => {
  currentCourseCode = courseSelect.value;
  const next = new URL(window.location.href);
  next.searchParams.set("course", currentCourseCode);
  next.searchParams.set("demo", accessMode());
  window.history.replaceState({}, "", next);
  renderAll();
});

courseView.addEventListener("change", renderLectures);
courseSearch.addEventListener("input", () => {
  renderLectures();
  renderResourceShelf();
});
transcriptClose.addEventListener("click", closeTranscript);
transcriptModal.addEventListener("click", (event) => {
  if (event.target === transcriptModal) closeTranscript();
});
transcriptCopy.addEventListener("click", copyTranscript);
transcriptDownload.addEventListener("click", downloadTranscript);
resourceClose.addEventListener("click", closeResource);
resourceModal.addEventListener("click", (event) => {
  if (event.target === resourceModal) closeResource();
});
resourceCopyName.addEventListener("click", copyResourceName);
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !transcriptModal.hidden) closeTranscript();
  if (event.key === "Escape" && !resourceModal.hidden) closeResource();
});
function refreshPrivateData() {
  youtubeVideos = Array.isArray(window.youtubeVideos?.videos) ? window.youtubeVideos.videos : [];
  rebuildVideoIndexes();
  renderAll();
}

window.addEventListener("d1-private-data-ready", refreshPrivateData);
if (window.d1PrivateDataReady) refreshPrivateData();

renderAll();
