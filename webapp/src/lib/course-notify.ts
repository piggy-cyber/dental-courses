import "server-only";

import { getGroupMeBotId, postBotMessage } from "@/lib/groupme";

export function getGroupMeContentBotId(): string | null {
  return (
    process.env.GROUPME_CONTENT_BOT_ID?.trim() ||
    process.env.GROUPME_BOT_ID?.trim() ||
    null
  );
}

export function getGroupMeContentBotLabel(): string | null {
  return (
    process.env.GROUPME_CONTENT_BOT_LABEL?.trim() ||
    process.env.GROUPME_BOT_LABEL?.trim() ||
    null
  );
}

export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "https://dental-courses-piggy-cybers-projects.vercel.app";
}

export function formatCourseContentGroupMeText(input: {
  courseCode: string;
  courseTitle: string;
  fileCount: number;
  collectionLabel?: string | null;
  collectionId: string;
}): string {
  const url = `${getSiteUrl()}/course/${encodeURIComponent(input.courseCode)}?collection=${encodeURIComponent(input.collectionId)}`;
  const collection = input.collectionLabel ? ` · ${input.collectionLabel}` : "";
  const files =
    input.fileCount === 1 ? "1 new file" : `${input.fileCount} new files`;
  return [
    `New course content${collection}`,
    `${input.courseCode} · ${input.courseTitle}`,
    files,
    url,
  ].join("\n");
}

export async function notifyCourseContentBatch(input: {
  courseCode: string;
  courseTitle: string;
  fileCount: number;
  collectionId: string;
  collectionLabel?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.fileCount <= 0) return { ok: true };

  const botId = getGroupMeContentBotId();
  if (!botId) {
    return { ok: false, error: "GroupMe content bot is not configured." };
  }

  const text = formatCourseContentGroupMeText(input);

  try {
    await postBotMessage(botId, text);
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not post to GroupMe." };
  }
}
