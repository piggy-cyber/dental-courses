import type { MetadataRoute } from "next";
const origin = "https://fourthcanal.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "/",
    "/visilearn",
    "/transcript",
    "/notion",
    "/pricing",
    "/compatibility",
    "/security",
    "/download",
    "/changelog",
    "/support",
    "/queue",
    "/queue/about",
    "/queue/instructions",
    "/queue/privacy",
    "/queue/terms",
    "/visilearn/privacy",
  ].map((path) => ({
    url: `${origin}${path}`,
    lastModified: new Date(path === "/visilearn/privacy" ? "2026-08-19" : "2026-09-02"),
    changeFrequency: "yearly" as const,
    priority: path === "/" ? 1 : path === "/visilearn" || path === "/transcript" ? 0.8 : 0.4,
  }));
}
