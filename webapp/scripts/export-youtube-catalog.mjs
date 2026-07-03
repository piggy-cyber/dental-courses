// Writes embeddable YouTube metadata for production (Vercel has no private JS files).
// Run from webapp/: node scripts/export-youtube-catalog.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadSiteData } from "./lib/data.mjs";

const webappRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(webappRoot, "..");
const { youtubeVideos } = loadSiteData(repoRoot);

const videos = youtubeVideos
  .filter((video) => video.visibility !== "private" && video.id)
  .map(({ id, title, duration, visibility, courseCode }) => ({
    id,
    title,
    duration,
    visibility,
    courseCode,
  }));

const outPath = path.join(webappRoot, "src/data/youtube-catalog.json");
mkdirSync(path.dirname(outPath), { recursive: true });
writeFileSync(
  outPath,
  `${JSON.stringify({ generatedAt: new Date().toISOString(), videos }, null, 2)}\n`
);
console.log(`Wrote ${videos.length} embeddable videos to ${path.relative(webappRoot, outPath)}`);
