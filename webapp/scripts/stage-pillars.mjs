// Copies canonical pillar PDF/DOCX into private-staging/student-pillars/.
//
// Usage: node scripts/stage-pillars.mjs
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webappRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(webappRoot, "..");
const stagingRoot = path.join(repoRoot, "private-staging/student-pillars");

const manifest = JSON.parse(
  readFileSync(path.join(webappRoot, "data/student-pillars.json"), "utf8")
);

let staged = 0;

for (const item of manifest.pillars) {
  const slug = item.slug;

  if (item.masteryGuide) {
    const destDir = path.join(stagingRoot, "course-mastery-guides", slug);
    mkdirSync(destDir, { recursive: true });
    for (const file of [item.masteryGuide.pdf, item.masteryGuide.docx]) {
      const src = path.join(item.masteryGuide.sourceDir, file);
      const dest = path.join(destDir, file);
      if (!existsSync(src)) {
        console.error(`Missing mastery guide: ${src}`);
        process.exit(1);
      }
      copyFileSync(src, dest);
      staged += 1;
      console.log(`Staged mastery ${item.courseCode}: ${file}`);
    }
  }

  if (item.textbookCompanion) {
    const destDir = path.join(stagingRoot, "textbook-companions", slug);
    mkdirSync(destDir, { recursive: true });
    for (const file of [item.textbookCompanion.pdf, item.textbookCompanion.docx]) {
      const src = path.join(item.textbookCompanion.sourceDir, file);
      const dest = path.join(destDir, file);
      if (!existsSync(src)) {
        console.error(`Missing textbook companion: ${src}`);
        process.exit(1);
      }
      copyFileSync(src, dest);
      staged += 1;
      console.log(`Staged textbook ${item.courseCode}: ${file}`);
    }
  }
}

console.log(`Done. ${staged} pillar files staged under ${stagingRoot}.`);
