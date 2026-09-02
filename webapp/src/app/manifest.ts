import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fourth Canal",
    short_name: "Fourth Canal",
    description:
      "Capture authorized recording files and store transcripts in your own Notion workspace.",
    start_url: "/",
    display: "browser",
    background_color: "#F7F8F9",
    theme_color: "#17375F",
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
