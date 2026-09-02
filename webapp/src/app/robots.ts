import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
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
        ],
        disallow: [
          "/account",
          "/api/",
          "/auth/",
          "/legal/acceptable-use",
          "/legal/billing",
          "/legal/eula",
          "/legal/open-source",
          "/legal/privacy",
          "/legal/terms",
          "/legal/third-party-services",
          "/security/report",
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
