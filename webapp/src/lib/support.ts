export const SUPPORT_CATEGORIES = [
  "site",
  "account",
  "accessibility",
  "content",
  "privacy",
  "copyright",
  "security",
  "other",
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export type PublicSupportInput = {
  category: SupportCategory;
  message: string;
  replyEmail: string | null;
  name: string | null;
  pagePath: string | null;
  turnstileToken: string;
};

export type SupportValidationResult =
  | { ok: true; data: PublicSupportInput }
  | { ok: false; code: "validation_failed" | "spam_detected"; message: string };

const EMAIL_REQUIRED_CATEGORIES = new Set<SupportCategory>([
  "account",
  "privacy",
  "copyright",
  "security",
]);

function readText(value: unknown, maximum: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maximum ? normalized : null;
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isSameOriginPath(value: string): boolean {
  if (!value.startsWith("/") || value.startsWith("//")) return false;
  try {
    const url = new URL(value, "https://fourthcanal.com");
    return url.origin === "https://fourthcanal.com";
  } catch {
    return false;
  }
}

export function validatePublicSupportInput(payload: unknown): SupportValidationResult {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, code: "validation_failed", message: "Enter the details of your request." };
  }

  const record = payload as Record<string, unknown>;
  if (readText(record.website, 500)) {
    return { ok: false, code: "spam_detected", message: "We could not send that request." };
  }

  const category = readText(record.category, 32);
  if (!category || !SUPPORT_CATEGORIES.includes(category as SupportCategory)) {
    return { ok: false, code: "validation_failed", message: "Choose a request type." };
  }

  const message = readText(record.message, 4000);
  if (!message || message.length < 20) {
    return {
      ok: false,
      code: "validation_failed",
      message: "Please include at least 20 characters so we can understand the issue.",
    };
  }

  const replyEmail = readText(record.replyEmail, 254);
  if (replyEmail && !isEmail(replyEmail)) {
    return { ok: false, code: "validation_failed", message: "Enter a valid reply email." };
  }

  const supportCategory = category as SupportCategory;
  if (EMAIL_REQUIRED_CATEGORIES.has(supportCategory) && !replyEmail) {
    return {
      ok: false,
      code: "validation_failed",
      message: "A reply email is required for this type of request.",
    };
  }

  const pagePath = readText(record.pagePath, 2048);
  if (pagePath && !isSameOriginPath(pagePath)) {
    return { ok: false, code: "validation_failed", message: "Use a page from Fourth Canal." };
  }

  const turnstileToken = readText(record["cf-turnstile-response"], 4096);
  if (!turnstileToken) {
    return { ok: false, code: "validation_failed", message: "Complete the security check before sending." };
  }

  return {
    ok: true,
    data: {
      category: supportCategory,
      message,
      replyEmail,
      name: readText(record.name, 120),
      pagePath,
      turnstileToken,
    },
  };
}

export function isReplyEmailRequired(category: SupportCategory): boolean {
  return EMAIL_REQUIRED_CATEGORIES.has(category);
}
