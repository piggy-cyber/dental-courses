import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

export type YoutubeVideo = {
  id: string;
  title: string;
  duration?: string;
  visibility?: string;
  courseCode?: string;
};

function normalizeTitle(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/^tim\s+/, "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_\-./#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactTitle(value: string) {
  return normalizeTitle(value).replace(/[^a-z0-9]/g, "");
}

function loadVideos(): YoutubeVideo[] {
  const repoRoot = path.resolve(process.cwd(), "..");
  const jsDir = path.join(repoRoot, "assets", "js");
  const privatePath = path.join(jsDir, "youtube-videos.private.js");
  const publicPath = path.join(jsDir, "youtube-videos.js");
  const filePath = existsSync(privatePath) ? privatePath : publicPath;
  if (!existsSync(filePath)) return [];

  const context = { window: {} as { youtubeVideos?: { videos?: YoutubeVideo[] } } };
  vm.createContext(context);
  vm.runInContext(readFileSync(filePath, "utf8"), context);
  return context.window.youtubeVideos?.videos ?? [];
}

let cached: YoutubeVideo[] | null = null;

export function getYoutubeCatalog() {
  if (!cached) cached = loadVideos();
  return cached;
}

export function matchFilenameToYoutube(filename: string): YoutubeVideo | null {
  const catalog = getYoutubeCatalog();
  const normal = normalizeTitle(filename);
  const compact = compactTitle(filename);
  for (const video of catalog) {
    if (normalizeTitle(video.title) === normal || compactTitle(video.title) === compact) {
      return video;
    }
  }
  return null;
}

export function isEmbeddable(video: YoutubeVideo) {
  return video.visibility !== "private";
}
