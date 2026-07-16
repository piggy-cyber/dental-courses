import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/about", "/legal", "/games", "/grade-calculator", "/guides"],
        disallow: [
          "/admin",
          "/api",
          "/auth",
          "/contacts",
          "/course",
          "/d1",
          "/home",
          "/library",
          "/owner",
          "/preview-lab",
          "/profile",
          "/resource",
          "/ui-preview",
        ],
      },
    ],
    sitemap: "https://fourthcanal.com/sitemap.xml",
  };
}
