import { ImageResponse } from "next/og";

export const alt = "Fourth Canal — private cohort study workspace";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "edge";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          background: "#f2f0e8",
          color: "#1f2933",
          display: "flex",
          fontFamily: "sans-serif",
          height: "100%",
          padding: "56px",
          width: "100%",
        }}
      >
        <div
          style={{
            background: "#fffefa",
            border: "2px solid #b8bec8",
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "58px",
          }}
        >
          <div style={{ alignItems: "center", display: "flex", gap: "20px" }}>
            <div
              style={{
                alignItems: "center",
                background: "#12345a",
                color: "white",
                display: "flex",
                fontSize: "30px",
                fontWeight: 800,
                height: "76px",
                justifyContent: "center",
                width: "76px",
              }}
            >
              FC
            </div>
            <div style={{ color: "#12345a", display: "flex", fontSize: "58px", fontWeight: 800 }}>
              Fourth Canal
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div style={{ color: "#064f8f", display: "flex", fontSize: "24px", fontWeight: 700, letterSpacing: "0.08em" }}>
              INDEPENDENT COHORT STUDY WORKSPACE
            </div>
            <div style={{ display: "flex", fontSize: "46px", fontWeight: 700, lineHeight: 1.15, maxWidth: "900px" }}>
              Lectures, transcripts, study guides, and course files—organized in one private place.
            </div>
          </div>

          <div style={{ color: "#5f6b77", display: "flex", fontSize: "22px" }}>
            fourthcanal.com · Student-run · Not an official university site
          </div>
        </div>
      </div>
    ),
    size
  );
}
