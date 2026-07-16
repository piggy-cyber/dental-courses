import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fourth Canal",
    short_name: "Fourth Canal",
    description:
      "A private, independent cohort workspace for lectures, transcripts, study guides, and course files.",
    start_url: "/",
    display: "browser",
    background_color: "#f2f0e8",
    theme_color: "#12345a",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
