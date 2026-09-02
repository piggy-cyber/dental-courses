import type { Metadata } from "next";
import { Bodoni_Moda, IBM_Plex_Mono, Inter, Source_Sans_3 } from "next/font/google";
import { LegalFooter } from "@/components/LegalFooter";
import { GlobalCanalProgress } from "@/components/GlobalCanalProgress";
import { SiteRouteEffects } from "@/components/SiteRouteEffects";
import { StructuredData } from "@/components/StructuredData";
import { PublicTelemetry } from "@/components/PublicTelemetry";
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

const brandSans = Inter({
  variable: "--font-fc-sans",
  subsets: ["latin"],
  display: "swap",
});

const brandDisplay = Bodoni_Moda({
  variable: "--font-fc-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://fourthcanal.com"),
  applicationName: "Fourth Canal",
  title: {
    default: "Fourth Canal: Recording transcripts for Notion",
    template: "%s · Fourth Canal",
  },
  description:
    "Capture authorized recording files in Chrome, verify them on your Mac, and store transcripts in your own Notion workspace.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { url: "/brand/favicon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/brand/favicon-192.png", sizes: "192x192", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Fourth Canal",
    title: "Fourth Canal: Recording transcripts for Notion",
    description:
      "Capture authorized recording files in Chrome, verify them on your Mac, and store transcripts in your own Notion workspace.",
    images: ["/brand/fourth-canal-social-preview-v2.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fourth Canal: Recording transcripts for Notion",
    description:
      "Capture authorized recording files in Chrome, verify them on your Mac, and store transcripts in your own Notion workspace.",
    images: ["/brand/fourth-canal-social-preview-v2.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "GZyhYFrrLW1Narzyzzn2wf0yamyfhoYNleRXMjHY_7c",
  },
};

const themeScript = `
(() => {
  try {
    const key = "d1-theme-mode";
    const saved = localStorage.getItem(key) || "light";
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
      className={`${sourceSans.variable} ${plexMono.variable} ${brandSans.variable} ${brandDisplay.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <StructuredData
          data={[
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Fourth Canal",
              url: "https://fourthcanal.com",
              description: "Independent creator of transcript and student workflow tools.",
            },
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Fourth Canal",
              url: "https://fourthcanal.com",
              inLanguage: "en-US",
              description: "Software for organizing authorized recording files in a customer-controlled Notion workspace.",
            },
          ]}
        />
        <SiteRouteEffects />
        <GlobalCanalProgress />
        {children}
        <LegalFooter />
        <PublicTelemetry />
      </body>
    </html>
  );
}
