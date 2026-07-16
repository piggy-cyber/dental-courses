import type { Metadata } from "next";
import { IBM_Plex_Mono, Source_Sans_3 } from "next/font/google";
import { LegalFooter } from "@/components/LegalFooter";
import "./globals.css";

const sourceSans = Source_Sans_3({
  variable: "--font-sans-app",
  subsets: ["latin"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono-app",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://fourthcanal.com"),
  applicationName: "Fourth Canal",
  title: {
    default: "Fourth Canal",
    template: "%s · Fourth Canal",
  },
  description:
    "A private, independent cohort workspace for lectures, transcripts, study guides, and course files.",
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Fourth Canal",
    title: "Fourth Canal",
    description:
      "A private, independent cohort workspace for lectures, transcripts, study guides, and course files.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fourth Canal",
    description:
      "A private, independent cohort workspace for lectures, transcripts, study guides, and course files.",
  },
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
};

const themeScript = `
(() => {
  try {
    const key = "d1-theme-mode";
    const saved = localStorage.getItem(key) || "system";
    const mode = saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = mode === "system" ? (prefersDark ? "dark" : "light") : mode;
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.themeMode = mode;
  } catch {
    document.documentElement.dataset.theme = "light";
    document.documentElement.dataset.themeMode = "system";
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sourceSans.variable} ${plexMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
        <LegalFooter />
      </body>
    </html>
  );
}
