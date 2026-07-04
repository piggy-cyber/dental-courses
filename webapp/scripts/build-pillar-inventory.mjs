// Scans the cheat sheet hub and writes webapp/data/student-pillars.json.
//
// Usage: node scripts/build-pillar-inventory.mjs
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadSiteData } from "./lib/data.mjs";

const webappRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(webappRoot, "..");

const hubRoot = path.join(os.homedir(), "Downloads", "cheat sheet final");
const masteryDir = path.join(hubRoot, "01 - Cheat Sheets");
const textbookDir = path.join(hubRoot, "02 - Textbook Companions");
const pendingDir = path.join(hubRoot, "New Textbook Companions - Pending Add");

const SKIP_DIR = new Set([
  "review-ready",
  "legacy drafts",
  "assets",
  "figures",
  "figure exports",
]);

function slugify(code) {
  return code.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function isSkippablePath(filePath) {
  const parts = filePath.split(path.sep).map((p) => p.toLowerCase());
  return parts.some((part) => SKIP_DIR.has(part));
}

function listFiles(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIR.has(entry.name.toLowerCase())) continue;
      out.push(...listFiles(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

function extOf(filePath) {
  return path.extname(filePath).toLowerCase();
}

function isCompanionCandidate(filePath) {
  const base = path.basename(filePath);
  const ext = extOf(filePath);
  if (ext !== ".pdf" && ext !== ".docx") return false;
  if (isSkippablePath(filePath)) return false;
  if (!/textbook companion/i.test(base)) return false;
  if (/review ready|legacy|preview|exam mastery|final exam|\.png$/i.test(base)) return false;
  return true;
}

function matchesCourseCode(filePath, courseCode) {
  const base = path.basename(filePath);
  return base.startsWith(`${courseCode} `);
}

function pickPair(files, courseCode) {
  const pdf =
    files.find((f) => extOf(f) === ".pdf" && matchesCourseCode(f, courseCode)) ?? null;
  const docx =
    files.find((f) => extOf(f) === ".docx" && matchesCourseCode(f, courseCode)) ?? null;
  if (!pdf || !docx) return null;
  return {
    pdf: path.basename(pdf),
    docx: path.basename(docx),
    pdfPath: pdf,
    docxPath: docx,
    sourceDir: path.dirname(pdf),
  };
}

function findMasteryGuide(course) {
  const pdfName = `${course.code} ${course.title} Course Mastery Guide.pdf`;
  const docxName = `${course.code} ${course.title} Course Mastery Guide.docx`;
  const pdfPath = path.join(masteryDir, pdfName);
  const docxPath = path.join(masteryDir, docxName);
  if (!existsSync(pdfPath) || !existsSync(docxPath)) return null;
  return { pdf: pdfName, docx: docxName, pdfPath, docxPath };
}

function findTextbookCompanion(course) {
  const code = course.code;

  // 1) Pending Add — standard names only
  const pendingFiles = listFiles(pendingDir).filter(
    (f) => isCompanionCandidate(f) && matchesCourseCode(f, code)
  );
  const pendingPair = pickPair(pendingFiles, code);
  if (pendingPair) {
    return {
      ...pendingPair,
      source: "pending-add",
      folder: path.basename(pendingPair.sourceDir),
    };
  }

  // 2) approved/ subfolder anywhere under 02
  const textbookFiles = listFiles(textbookDir).filter(
    (f) => isCompanionCandidate(f) && matchesCourseCode(f, code)
  );
  const approvedFiles = textbookFiles.filter((f) =>
    f.split(path.sep).some((part) => part.toLowerCase() === "approved")
  );
  const approvedPair = pickPair(approvedFiles, code);
  if (approvedPair) {
    return {
      ...approvedPair,
      source: "textbook-approved",
      folder: path.basename(path.dirname(approvedPair.sourceDir)),
    };
  }

  // 3) root PDF/DOCX in course folder (not in skipped subdirs)
  const rootFiles = textbookFiles.filter((f) => {
    const rel = path.relative(textbookDir, f);
    return !rel.includes(path.sep) || rel.split(path.sep).length === 2;
  });
  const rootPair = pickPair(rootFiles, code);
  if (rootPair) {
    return {
      ...rootPair,
      source: "textbook-root",
      folder: path.basename(rootPair.sourceDir),
    };
  }

  return null;
}

const { courseData } = loadSiteData(repoRoot);

const pillars = [];
const summary = { masteryGuides: 0, textbookCompanions: 0, missingTextbook: [] };

for (const course of courseData) {
  const entry = {
    courseCode: course.code,
    title: course.title,
    slug: slugify(course.code),
  };

  const mastery = findMasteryGuide(course);
  if (mastery) {
    entry.masteryGuide = {
      pdf: mastery.pdf,
      docx: mastery.docx,
      sourceDir: masteryDir,
    };
    summary.masteryGuides += 1;
  }

  const textbook = findTextbookCompanion(course);
  if (textbook) {
    entry.textbookCompanion = {
      pdf: textbook.pdf,
      docx: textbook.docx,
      source: textbook.source,
      folder: textbook.folder,
      sourceDir: textbook.sourceDir,
    };
    summary.textbookCompanions += 1;
  } else {
    summary.missingTextbook.push(course.code);
  }

  pillars.push(entry);
}

const manifest = {
  generatedAt: new Date().toISOString(),
  hubRoot,
  masteryDir,
  textbookDir,
  pendingDir,
  summary,
  pillars,
};

const outPath = path.join(webappRoot, "data/student-pillars.json");
writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${outPath}`);
console.log(
  `${summary.masteryGuides} mastery guides, ${summary.textbookCompanions} textbook companions`
);
if (summary.missingTextbook.length) {
  console.log(`Missing textbook: ${summary.missingTextbook.join(", ")}`);
}
