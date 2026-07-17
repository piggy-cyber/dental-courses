import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const compactMark = read("public/brand/fourth-canal-compact-color.svg");
const primaryGroup = compactMark.match(/<g>([\s\S]*?)<\/g>/)?.[1] ?? "";
const assetStrands = (primaryGroup.match(/<path\b/g) ?? []).length;
if (assetStrands !== 4) {
  failures.push(`Compact brand mark has ${assetStrands} primary strands; expected 4.`);
}

const signalPanel = read("src/components/PublicSignalPanel.tsx");
const pathBlock = signalPanel.match(/const CANAL_PATHS = \[([\s\S]*?)\] as const;/)?.[1] ?? "";
const interactiveStrands = (pathBlock.match(/^\s*"M/gm) ?? []).length;
if (interactiveStrands !== 4) {
  failures.push(`Interactive public mark has ${interactiveStrands} strands; expected 4.`);
}
if (!signalPanel.includes('data-canal-count="4"')) {
  failures.push("Interactive public mark is missing data-canal-count=4.");
}

const homePage = read("src/app/page.tsx");
for (const forbidden of ["Three Fourth Canal", "03 / 03", "PUBLIC STUDY DESK"]) {
  if (homePage.includes(forbidden)) failures.push(`Old three-strand copy remains: ${forbidden}`);
}

const guides = JSON.parse(read("src/data/public-guides.json"));
const guideHtml = guides.courses
  .flatMap((course) => Object.values(course.guides))
  .map((guide) => guide.html)
  .join("");
const tableCount = (guideHtml.match(/<table\b/g) ?? []).length;
const wrapperCount = (guideHtml.match(/class="guide-table-scroll"/g) ?? []).length;
if (tableCount !== wrapperCount) {
  failures.push(`Guide table wrappers do not match: ${tableCount} tables, ${wrapperCount} wrappers.`);
}
if (tableCount === 0 || !guideHtml.includes("data-label=")) {
  failures.push("Guide catalog is missing responsive table labels.");
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Brand integrity verified: 4 strands and ${tableCount} responsive guide tables.`);
