import type { MetadataRoute } from "next";
import { getPublicGuideCourses } from "@/lib/public-guides";

const origin = "https://fourthcanal.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/about",
    "/legal",
    "/support",
    "/games/living-atlas",
    "/games/beta",
    "/games/tooth-quest",
    "/games/contact-area",
    "/games/eruption-timeline",
    "/games/root-canal-match",
    "/games/tooth-comparison-duel",
    "/games/gv-black-sorter",
    "/games/micp-occlusion-trainer",
    "/grade-calculator",
    "/guides",
  ];
  const guideRoutes = getPublicGuideCourses().map((course) => `/guides/${course.slug}`);
  return [...staticRoutes, ...guideRoutes].map((path) => ({
    url: `${origin}${path}`,
    lastModified: new Date("2026-07-16"),
    changeFrequency: path.startsWith("/guides") ? "monthly" : "weekly",
    priority: path === "" ? 1 : path === "/games/living-atlas" ? 0.9 : 0.7,
  }));
}
