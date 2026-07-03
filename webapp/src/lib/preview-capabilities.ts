export type PreviewStrategy =
  | "pdf"
  | "image"
  | "office"
  | "video"
  | "text"
  | "download";

const IMAGE_EXTS = new Set(["PNG", "JPG", "JPEG", "GIF", "WEBP", "SVG"]);
const OFFICE_EXTS = new Set(["DOC", "DOCX", "PPT", "PPTX", "XLS", "XLSX"]);
const VIDEO_EXTS = new Set(["MP4", "MOV", "WEBM"]);
const TEXT_EXTS = new Set(["TXT"]);

export function extUpper(ext: string | null | undefined) {
  return String(ext ?? "").toUpperCase();
}

export function previewStrategy(ext: string | null | undefined): PreviewStrategy {
  const upper = extUpper(ext);
  if (upper === "PDF") return "pdf";
  if (IMAGE_EXTS.has(upper)) return "image";
  if (OFFICE_EXTS.has(upper)) return "office";
  if (VIDEO_EXTS.has(upper)) return "video";
  if (TEXT_EXTS.has(upper)) return "text";
  return "download";
}

export function previewStrategyLabel(strategy: PreviewStrategy) {
  const labels: Record<PreviewStrategy, string> = {
    pdf: "PDF (native)",
    image: "Image (native)",
    office: "Office (Microsoft viewer)",
    video: "Video (native)",
    text: "Text (native)",
    download: "Download only",
  };
  return labels[strategy];
}

export function officeEmbedUrl(signedUrl: string) {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}`;
}
