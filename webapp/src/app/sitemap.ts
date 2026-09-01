import type { MetadataRoute } from "next";
const origin = "https://fourthcanal.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/legal", "/visilearn/privacy"].map((path) => ({
    url: `${origin}${path}`,
    lastModified: new Date(path === "/visilearn/privacy" ? "2026-08-19" : "2026-07-16"),
    changeFrequency: "yearly" as const,
    priority: 0.2,
  }));
}
