import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "QueueMaster by Fourth Canal",
    short_name: "QueueMaster",
    description:
      "A quiet, fair, and organized way to manage classroom questions and help queues.",
    start_url: "/",
    display: "browser",
    background_color: "#F8FAFC",
    theme_color: "#059669",
    icons: [
      {
        src: "/brand/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/brand/favicon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/brand/favicon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
