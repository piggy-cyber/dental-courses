import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/queue/about", "/queue/instructions", "/queue/privacy", "/queue/terms", "/visilearn/privacy"],
        disallow: [
          "/api/",
          "/auth/",
          "/signin",
          "/queue/dashboard",
          "/queue/r/",
          "/queue/support",
          "/queue/features",
          "/queue/use-cases",
          "/queue/pricing",
        ],
      },
    ],
    sitemap: "https://fourthcanal.com/sitemap.xml",
  };
}
