const lectureData = window.lectureData || { summary: {}, courses: [], rows: [] };
const courseData = window.courseData || [];
let youtubeVideos = Array.isArray(window.youtubeVideos?.videos) ? window.youtubeVideos.videos : [];

const courseFilter = document.querySelector("#course-filter");
const statusFilter = document.querySelector("#status-filter");
const searchInput = document.querySelector("#management-search");
const summaryEl = document.querySelector("#management-summary");
const countEl = document.querySelector("#management-count");
const rowsEl = document.querySelector("#lecture-rows");
const emptyEl = document.querySelector("#management-empty");
const unmatchedEl = document.querySelector("#unmatched-videos");
const unmatchedCountEl = document.querySelector("#unmatched-count");

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

let videosByTitle = new Map();
let videosByCompactTitle = new Map();

function rebuildVideoIndexes() {
  videosByTitle = new Map();
  videosByCompactTitle = new Map();
  youtubeVideos.forEach((video) => {
    const title = normalizeTitle(video.title);
    const compact = compactTitle(video.title);
    if (title) videosByTitle.set(title, video);
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

let enrichedRows = [];
let matchedVideoIds = new Set();

function rebuildRows() {
  enrichedRows = (lectureData.rows || []).map((row) => ({
    ...row,
    youtube: youtubeMatches(row)
  }));
  matchedVideoIds = new Set(enrichedRows.flatMap((row) => row.youtube.map((video) => video.id)));
}

rebuildRows();

function isEmbeddable(video) {
  return video && video.visibility !== "private";
}

function videoEmbed(video) {
  if (!video) return "";
  if (!isEmbeddable(video)) {
    return `
      <div class="video-placeholder">
        <span>PRIVATE</span>
        <strong>${escapeHtml(video.title)}</strong>
        <small>Change YouTube visibility to unlisted before students can view it.</small>
      </div>
    `;
  }

  return `
    <div class="video-embed">
      <iframe
        title="${escapeHtml(video.title)}"
        src="https://www.youtube.com/embed/${encodeURIComponent(video.id)}"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen></iframe>
    </div>
  `;
}

function videoPills(videos) {
  if (!videos.length) return '<span class="file-pill pending"><span>YT</span>No YouTube match</span>';
  return videos.map((video) => `
    <span class="file-pill ${isEmbeddable(video) ? "media" : "locked"}">
      <span>${isEmbeddable(video) ? "YT" : "PRIV"}</span>
      ${escapeHtml(video.duration || "Video")}
    </span>
  `).join("");
}

function filePills(files = []) {
  if (!files.length) return '<span class="file-pill pending"><span>FILE</span>No file matched</span>';
  return files.map((file) => `
    <span class="file-pill ${file.type === "PDF" ? "guide" : "companion"}">
      <span>${escapeHtml(file.type || "FILE")}</span>
      ${escapeHtml(file.name || file.title)}
    </span>
  `).join("");
}

function transcriptLabel(row) {
  return row.transcriptSource === "YouTube" ? "YouTube caption" : "Transcript";
}

function rowMatches(row, query) {
  const searchable = [
    row.courseCode,
    row.courseTitle,
    row.semester,
    row.date,
    row.lectureTitle,
    row.transcriptSource,
    ...(row.media || []).map((item) => `${item.title} ${item.name}`),
    ...(row.lectureFiles || []).map((file) => `${file.title} ${file.name}`)
  ].join(" ").toLowerCase();

  return !query || searchable.includes(query);
}

function statusMatches(row, status) {
  if (status === "youtube") return row.youtube.length > 0;
  if (status === "matched") return row.status === "matched";
  if (status === "needs-review") return row.status === "needs-review";
  if (status === "files") return (row.lectureFiles || []).length > 0;
  return true;
}

function renderSummary() {
  const embeddable = youtubeVideos.filter(isEmbeddable).length;
  const privateCount = youtubeVideos.filter((video) => video.visibility === "private").length;
  const rowsWithYoutube = enrichedRows.filter((row) => row.youtube.some(isEmbeddable)).length;

  summaryEl.innerHTML = `
    <div><strong>${formatNumber(lectureData.summary.transcriptCount)}</strong><span>captions</span></div>
    <div><strong>${formatNumber(lectureData.summary.matchedLectureCount)}</strong><span>file matches</span></div>
    <div><strong>${formatNumber(embeddable)}</strong><span>YouTube embeds</span></div>
    <div><strong>${formatNumber(rowsWithYoutube)}</strong><span>caption rows with video</span></div>
    <div><strong>${formatNumber(privateCount)}</strong><span>private videos</span></div>
  `;
}

function renderCourseFilter() {
  const options = [
    '<option value="all">All classes</option>',
    ...courseData.map((course) => `
      <option value="${escapeHtml(course.code)}">${escapeHtml(course.code)} ${escapeHtml(course.title)}</option>
    `)
  ];
  courseFilter.innerHTML = options.join("");
}

function renderRows() {
  const selectedCourse = courseFilter.value;
  const selectedStatus = statusFilter.value;
  const query = searchInput.value.trim().toLowerCase();
  const filteredRows = enrichedRows.filter((row) => (
    (selectedCourse === "all" || row.courseCode === selectedCourse)
    && statusMatches(row, selectedStatus)
    && rowMatches(row, query)
  ));

  rowsEl.innerHTML = filteredRows.map((row) => {
    const primaryVideo = row.youtube.find(isEmbeddable) || row.youtube[0] || null;
    return `
      <article class="lecture-row">
        <div class="lecture-left">
          ${videoEmbed(primaryVideo)}
          <div class="lecture-meta">
            <span>${escapeHtml(row.courseCode)}</span>
            <span>${escapeHtml(row.date || "No date")}</span>
            <span>${escapeHtml(transcriptLabel(row))}</span>
          </div>
          <h2>${escapeHtml(row.lectureTitle)}</h2>
          <div class="lecture-pills">
            ${videoPills(row.youtube)}
            <span class="file-pill ${row.status === "matched" ? "source" : "pending"}">
              <span>${row.status === "matched" ? "OK" : "REV"}</span>
              ${row.status === "matched" ? "Matched" : "Needs review"}
            </span>
          </div>
        </div>
        <div class="lecture-right">
          <h3>${escapeHtml(row.courseTitle)}</h3>
          <div class="lecture-pills">${filePills(row.lectureFiles)}</div>
        </div>
      </article>
    `;
  }).join("");

  countEl.textContent = `${formatNumber(filteredRows.length)} lecture row${filteredRows.length === 1 ? "" : "s"} shown`;
  emptyEl.hidden = filteredRows.length !== 0;
}

function renderUnmatchedVideos() {
  const unmatched = youtubeVideos.filter((video) => !matchedVideoIds.has(video.id));
  unmatchedCountEl.textContent = `${formatNumber(unmatched.length)} video${unmatched.length === 1 ? "" : "s"}`;
  unmatchedEl.innerHTML = unmatched.map((video) => `
    <article class="unmatched-video">
      ${videoEmbed(video)}
      <div>
        <span>${escapeHtml(video.courseCode || "Unassigned")}</span>
        <strong>${escapeHtml(video.title)}</strong>
        <small>${escapeHtml(video.visibility)} · ${escapeHtml(video.duration || "No duration")}</small>
      </div>
    </article>
  `).join("");
}

[courseFilter, statusFilter, searchInput].forEach((control) => {
  control.addEventListener("input", renderRows);
  control.addEventListener("change", renderRows);
});

renderSummary();
renderCourseFilter();
renderRows();
renderUnmatchedVideos();

function refreshPrivateData() {
  youtubeVideos = Array.isArray(window.youtubeVideos?.videos) ? window.youtubeVideos.videos : [];
  rebuildVideoIndexes();
  rebuildRows();
  renderSummary();
  renderRows();
  renderUnmatchedVideos();
}

window.addEventListener("d1-private-data-ready", refreshPrivateData);
if (window.d1PrivateDataReady) refreshPrivateData();
