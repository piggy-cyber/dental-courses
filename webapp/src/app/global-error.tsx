"use client";

import Link from "next/link";

export default function GlobalError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.5rem", background: "#f2f0e8", color: "#1f2933", fontFamily: "Arial, sans-serif" }}>
          <section style={{ maxWidth: "34rem", border: "1px solid #b8bec8", background: "#fffefa", padding: "2rem", textAlign: "center" }}>
            <p style={{ color: "#064f8f", fontSize: ".75rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>Fourth Canal</p>
            <h1 style={{ color: "#12345a" }}>The site needs a moment.</h1>
            <p>Try loading the page again. If this continues, use support after the site recovers.</p>
            <p style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: ".75rem", marginTop: "1.5rem" }}>
              <button type="button" onClick={() => unstable_retry()}>Try again</button>
              <Link href="/">Home</Link>
              <Link href="/support">Support</Link>
            </p>
          </section>
        </main>
      </body>
    </html>
  );
}
