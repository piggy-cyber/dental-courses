const courses = window.courseData || [];
const inventory = window.sourceInventory || {};
const filters = Array.from(document.querySelectorAll(".filter-button"));
const results = document.querySelector("#library-results");
const search = document.querySelector("#library-search");
const resultCount = document.querySelector("#result-count");
const emptyState = document.querySelector("#empty-state");
const auditSummary = document.querySelector("#audit-summary");
const companionSection = document.querySelector("#textbook-companions");
let activeFilter = "all";
const sampleCourseCodes = new Set(["HEWB 121"]);

function accessMode() {
  return localStorage.getItem("d1-access-mode") || "visitor";
}

function hasApprovedAccess() {
  return accessMode() === "student" || accessMode() === "owner";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
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

function plural(count, singular, pluralLabel = `${singular}s`) {
  return `${formatNumber(count)} ${count === 1 ? singular : pluralLabel}`;
}

function categoryLabel(category) {
  return {
    documents: "docs",
    videos: "videos",
    images: "images",
    flashcards: "Anki",
    audio: "audio",
    archives: "archives",
    other: "other"
  }[category] || category;
}

function categorySummary(categories = {}) {
  const order = ["documents", "videos", "flashcards", "images", "audio", "archives", "other"];
  return order
    .filter((category) => categories[category])
    .map((category) => `${formatNumber(categories[category])} ${categoryLabel(category)}`)
    .join(" · ");
}

function sourceStats(course) {
  return (inventory.byCode || {})[course.code] || null;
}

function stagedMediaCount(stats) {
  if (!stats) return 0;
  return (stats.categories.images || 0) + (stats.categories.videos || 0);
}

function addResource(files, resources, key, type, label, chip) {
  if (!resources[key]) return;
  files.push({
    type,
    label,
    href: typeof resources[key] === "string" ? resources[key] : null,
    chip,
    locked: typeof resources[key] !== "string"
  });
}

function fileSet(course) {
  const files = [];
  const resources = course.resources || {};

  addResource(files, resources, "guide", "guide", "Guide", "PDF");
  addResource(files, resources, "syllabus", "syllabus", "Syllabus", "SYL");
  addResource(files, resources, "companion", "companion", "Textbook", "BOOK");
  addResource(files, resources, "coursePage", "web", "Course Page", "WEB");
  addResource(files, resources, "cheatSheet", "web", "Cheat Sheet", "WEB");
  addResource(files, resources, "images", "media", "Images", "IMG");
  addResource(files, resources, "videos", "media", "Videos", "VID");

  return files;
}

function sourceDetail(course) {
  const stats = sourceStats(course);
  if (!stats) return "";
  const mediaCount = stagedMediaCount(stats);
  const sample = sampleCourseCodes.has(course.code);
  const accessLabel = sample ? "Free sample" : hasApprovedAccess() ? "Approved access" : "Access required";
  const accessClass = sample || hasApprovedAccess() ? "access-open" : "access-locked";

  return `
    <p class="source-detail">
      <span class="${accessClass}">${accessLabel}</span>
      <span>${plural(stats.fileCount, "file")}</span>
      <span>${escapeHtml(compactResourceSummary(course))}</span>
      ${mediaCount ? `<span>${plural(mediaCount, "media file")}</span>` : ""}
    </p>
  `;
}

function sourcePills(course) {
  const stats = sourceStats(course);
  if (!stats) return "";

  const pills = [];
  if (activeFilter === "source") {
    pills.push(`
      <span class="file-pill source">
        <span>FILES</span>
        ${formatNumber(stats.fileCount)} files
      </span>
    `);
  }
  if (activeFilter === "media" && stagedMediaCount(stats)) {
    pills.push(`
      <span class="file-pill media">
        <span>MED</span>
        ${plural(stagedMediaCount(stats), "media file")}
      </span>
    `);
  }

  return pills.join("");
}

function fileTypeSummary(files) {
  return files
    .map((file) => file.label)
    .filter((label, index, labels) => labels.indexOf(label) === index)
    .join(" · ");
}

function compactResourceSummary(course) {
  const labels = fileSet(course).map((file) => {
    if (file.type === "companion") return "Textbook";
    if (file.type === "web") return "Pages";
    return file.label;
  });
  const uniqueLabels = labels.filter((label, index) => labels.indexOf(label) === index);
  if (!course.resources?.syllabus) uniqueLabels.push("Syllabus pending");
  return uniqueLabels.join(" / ");
}

function summaryWithPendingSyllabus(course, files) {
  const labels = fileTypeSummary(files);
  if (course.resources?.syllabus || activeFilter !== "all") return labels;
  return labels ? `${labels} · Syllabus pending` : "Syllabus pending";
}

function protectedPill(label, course) {
  if (sampleCourseCodes.has(course.code)) {
    return `
      <span class="file-pill sample-link">
        <span>FREE</span>
        ${escapeHtml(label)}
      </span>
    `;
  }
  if (hasApprovedAccess()) {
    return `
      <span class="file-pill access-link">
        <span>ACCESS</span>
        ${escapeHtml(label)}
      </span>
    `;
  }
  return `
    <span class="file-pill locked">
      <span>LOCK</span>
      ${escapeHtml(label)}
    </span>
  `;
}

function courseHubPill(course) {
  return `
    <a class="file-pill web" href="${courseHref(course)}">
      <span>HUB</span>
      Course hub
    </a>
  `;
}

function fileLinks(course) {
  const files = fileSet(course).filter((file) => activeFilter === "all" || file.type === activeFilter);
  const publicFiles = files.filter((file) => file.href);
  const lockedFiles = files.filter((file) => !file.href);

  if ((activeFilter === "source" || activeFilter === "media") && !publicFiles.length && !lockedFiles.length) {
    return sourcePills(course);
  }

  if (lockedFiles.length && !publicFiles.length) {
    const summary = activeFilter === "all" ? "" : summaryWithPendingSyllabus(course, lockedFiles);
    const protectedLinks = lockedFiles.map((file) => protectedPill(file.label, course)).join("");
    const hubLink = activeFilter === "all" ? courseHubPill(course) : "";
    return `
      ${summary ? `<span class="file-summary">${escapeHtml(summary)}</span>` : ""}
      ${hubLink}
      ${protectedLinks}
      ${sourcePills(course)}
    `;
  }

  const links = files.map((file) => {
    if (file.href) {
      return `
        <a class="file-pill ${file.type}" href="${file.href}" target="_blank" rel="noopener">
          <span>${file.chip}</span>
          ${escapeHtml(file.label)}
        </a>
      `;
    }

    return protectedPill(file.label, course);
  }).join("");

  const syllabusPending = !course.resources?.syllabus && (activeFilter === "all" || activeFilter === "syllabus")
    ? '<span class="file-pill pending"><span>SYL</span>Syllabus pending</span>'
    : "";

  const hubLink = activeFilter === "all" ? courseHubPill(course) : "";
  return hubLink + links + sourcePills(course) + syllabusPending;
}

function courseHref(course) {
  if (sampleCourseCodes.has(course.code)) {
    return `course.html?course=${encodeURIComponent(course.code)}&demo=sample`;
  }
  if (hasApprovedAccess()) {
    return `course.html?course=${encodeURIComponent(course.code)}`;
  }
  return `course.html?course=${encodeURIComponent(course.code)}`;
}

function courseMatches(course, query) {
  const files = fileSet(course);
  const stats = sourceStats(course);
  const searchable = [
    course.semester,
    course.code,
    course.title,
    course.area,
    stats ? stats.folder : "",
    stats ? categorySummary(stats.categories) : "",
    ...files.map((file) => file.label)
  ].join(" ").toLowerCase();

  let filterMatch = activeFilter === "all"
    || files.some((file) => file.type === activeFilter)
    || (activeFilter === "syllabus" && !course.resources?.syllabus);

  if (activeFilter === "source") filterMatch = Boolean(stats);
  if (activeFilter === "media") filterMatch = files.some((file) => file.type === "media") || stagedMediaCount(stats) > 0;

  return filterMatch && (!query || searchable.includes(query));
}

function renderAuditSummary() {
  const summary = inventory.summary;
  if (!auditSummary || !summary) return;
  const sampleCount = courses.filter((course) => sampleCourseCodes.has(course.code)).length;
  const protectedCount = Math.max(courses.length - sampleCount, 0);
  const accessCopy = hasApprovedAccess()
    ? ["Approved library access", "Protected classes open in this browser"]
    : ["Free sample plus approved library access", "FLS sample open"];

  auditSummary.innerHTML = `
    <p>
      <strong>${accessCopy[0]}</strong>
      <span>${accessCopy[1]}</span>
      <span>${formatNumber(protectedCount)} protected classes</span>
      <span>${formatNumber(summary.fileCount)} files mapped</span>
      <span>${formatNumber((summary.categories.videos || 0) + (summary.categories.images || 0))} media files</span>
      <span>organized by semester</span>
      <a class="summary-link" href="login.html">Sign in or request access</a>
    </p>
  `;
}

function render() {
  const query = search.value.trim().toLowerCase();
  const semesters = ["Fall 2025", "Spring 2026"];
  let visibleCount = 0;
  const html = semesters.map((semester) => {
    const semesterCourses = courses.filter((course) => course.semester === semester && courseMatches(course, query));
    visibleCount += semesterCourses.length;
    if (!semesterCourses.length) return "";
    const id = semesterCourses[0].semesterId;

    return `
      <section class="semester-section" id="${id}" aria-labelledby="${id}-title">
        <div class="semester-heading">
          <h2 id="${id}-title">${semester}</h2>
          <span>${semesterCourses.length} classes</span>
        </div>
        <div class="course-list-head" aria-hidden="true">
          <span>Code</span>
          <span>Class</span>
          <span>Files</span>
        </div>
        <div class="course-list">
          ${semesterCourses.map((course) => `
            <article class="course-row">
              <div class="course-id">
                <strong>${escapeHtml(course.code)}</strong>
                <span>${escapeHtml(course.area)}</span>
              </div>
              <div class="course-title">
                <h3><a href="${courseHref(course)}">${escapeHtml(course.title)}</a></h3>
                ${sourceDetail(course)}
              </div>
              <div class="course-files">
                ${fileLinks(course)}
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }).join("");

  results.innerHTML = html;
  resultCount.textContent = `${visibleCount} class${visibleCount === 1 ? "" : "es"} shown`;
  emptyState.textContent = emptyMessage(query);
  emptyState.hidden = visibleCount !== 0;
  if (companionSection) {
    companionSection.hidden = Boolean(query) || !["all", "companion"].includes(activeFilter);
  }
}

function emptyMessage(query) {
  if (activeFilter === "media") {
    return "No matching media files found.";
  }
  if (activeFilter === "source") {
    return "No matching class files found.";
  }
  if (activeFilter === "syllabus") {
    return "No matching syllabus files found.";
  }
  if (query) {
    return "No matching class or file found.";
  }
  return "No matching files found.";
}

filters.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filters.forEach((item) => {
      const selected = item === button;
      item.classList.toggle("is-active", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    render();
  });
});

search.addEventListener("input", render);
renderAuditSummary();
render();
