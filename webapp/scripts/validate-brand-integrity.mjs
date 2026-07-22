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

const gameShell = read("src/components/games/GameShell.tsx");
if (!gameShell.includes('import { PublicHeader } from "@/components/PublicHeader";') || !gameShell.includes("<PublicHeader />")) {
  failures.push("Game shell must use the shared public header for consistent navigation.");
}
if (gameShell.includes("brandTile") || gameShell.includes(">FC<")) {
  failures.push("Game shell has reintroduced the forbidden FC tile.");
}

const gameBrand = read("GAME_BRAND.md");
for (const requiredToken of ["#091327", "#0F1E3A", "#F2EDE2", "#C86A3A", "#73D3C5"]) {
  if (!gameBrand.includes(requiredToken)) failures.push(`Game brand guideline is missing ${requiredToken}.`);
}
if (!gameBrand.includes("four-strand") || !gameBrand.includes("three-strand")) {
  failures.push("Game brand guideline is missing its four-strand safeguard.");
}

const globalCanalProgress = read("src/components/GlobalCanalProgress.tsx");
const globalPathBlock = globalCanalProgress.match(/const CANAL_PATHS = \[([\s\S]*?)\] as const;/)?.[1] ?? "";
const globalStrands = (globalPathBlock.match(/^\s*"M/gm) ?? []).length;
if (globalStrands !== 4) {
  failures.push(`Global progress mark has ${globalStrands} strands; expected 4.`);
}

const siteNavigation = read("src/components/SiteNavigation.tsx");
for (const href of ['href: "/"', 'href: "/guides"', 'href: "/games"', 'href: "/grade-calculator"', 'href: "/about"']) {
  if (!siteNavigation.includes(href)) failures.push(`Shared site navigation is missing ${href}.`);
}

const gamesEntry = read("src/app/(games)/games/page.tsx");
if (!gamesEntry.includes('redirect("/games/living-atlas")')) {
  failures.push("Games entry route does not redirect to Living Atlas.");
}

const gamesHub = read("src/app/(games)/games/beta/page.tsx");
if (!gamesHub.includes("Public beta")) failures.push("Arcade hub is missing its public beta label.");
for (const gameRoute of [
  "/games/living-atlas",
  "/games/contact-area",
  "/games/eruption-timeline",
  "/games/root-canal-match",
  "/games/tooth-comparison-duel",
  "/games/gv-black-sorter",
  "/games/micp-occlusion-trainer",
]) {
  if (!gamesHub.includes(gameRoute)) failures.push(`Arcade hub is missing ${gameRoute}.`);
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
