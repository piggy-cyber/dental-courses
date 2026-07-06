import "server-only";

const BUCKET = "course-files";
const DEFAULT_COLLECTION = "d1-2025-2026";

export function getUploadMaxBytes(): number {
  const mb = Number(process.env.UPLOAD_MAX_MB ?? 50);
  return (Number.isFinite(mb) && mb > 0 ? mb : 50) * 1024 * 1024;
}

export function sanitizePathSegment(segment: string): string {
  return segment
    .normalize("NFC")
    .replace(/[''´`']/g, "_")
    .replace(/[–—]/g, "-")
    .replace(/[\[\]#?*]/g, "_")
    .replace(/[^\x00-\x7F]/g, "_");
}

export function courseSlug(courseCode: string): string {
  return sanitizePathSegment(courseCode.replace(/\s+/g, "-"));
}

export function buildAdminUploadStorageKey(
  collectionId: string,
  courseCode: string,
  fileName: string
): string {
  const prefix =
    collectionId && collectionId !== DEFAULT_COLLECTION
      ? `library/${sanitizePathSegment(collectionId)}`
      : "library";
  const safeName = sanitizePathSegment(fileName);
  return `${prefix}/${courseSlug(courseCode)}/${safeName}`;
}

export function fileExtension(name: string): string | null {
  const match = name.match(/\.([^.]+)$/);
  return match ? match[1].toUpperCase() : null;
}

export function bytesToMb(bytes: number): number {
  return Math.round((bytes / (1024 * 1024)) * 100) / 100;
}

export { BUCKET };
