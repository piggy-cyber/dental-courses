import type { MetadataRoute } from "next";
import { getPublicGuideCourses } from "@/lib/public-guides";

const origin = "https://fourthcanal.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["", "/about", "/legal", "/games", "/games/tooth-quest", "/grade-calculator", "/guides"];
  const guideRoutes = getPublicGuideCourses().flatMap((course) => [
    `/guides/${course.slug}`,
    `/guides/${course.slug}/${course.guides.mastery.slug}`,
    `/guides/${course.slug}/${course.guides.textbook.slug}`,
  ]);
  return [...staticRoutes, ...guideRoutes].map((path) => ({
    url: `${origin}${path}`,
    lastModified: new Date("2026-07-16"),
    changeFrequency: path.startsWith("/guides") ? "monthly" : "weekly",
    priority: path === "" ? 1 : path === "/games/tooth-quest" ? 0.9 : 0.7,
  }));
}
