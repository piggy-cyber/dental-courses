import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fourth Canal",
    short_name: "Fourth Canal",
    description:
      "A private, independent cohort workspace for lectures, transcripts, study guides, and course files.",
    start_url: "/",
    display: "browser",
    background_color: "#F2EDE2",
    theme_color: "#0F1E3A",
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
