// Copies textbook companion PDF/DOCX from Downloads into private-staging.
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webappRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(webappRoot, "..");
const manifest = JSON.parse(
  readFileSync(path.join(webappRoot, "data/textbook-companions.json"), "utf8")
);

for (const item of manifest.companions) {
  const slug = item.courseCode.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const destDir = path.join(repoRoot, "private-staging/textbook-companions", slug);
  mkdirSync(destDir, { recursive: true });

  for (const file of [item.pdf, item.docx]) {
    const src = path.join(manifest.sourceDir, item.folder, file);
    const dest = path.join(destDir, file);
    if (!existsSync(src)) {
      console.error(`Missing: ${src}`);
      process.exit(1);
    }
    copyFileSync(src, dest);
    console.log(`Staged ${item.courseCode}: ${file}`);
  }
}

console.log(`Done. ${manifest.companions.length} courses staged.`);
