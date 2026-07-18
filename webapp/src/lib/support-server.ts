import "server-only";

import { createHmac } from "node:crypto";
import type { NextRequest } from "next/server";

export function getSupportServerConfig() {
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY?.trim();
  const rateLimitSecret = process.env.SUPPORT_RATE_LIMIT_SECRET?.trim();
  return { turnstileSecret, rateLimitSecret };
}

function getClientIp(request: NextRequest): string | null {
  const forwarded =
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for");
  const value = forwarded?.split(",")[0]?.trim();
  return value && value.length <= 128 ? value : null;
}

export function getRequestFingerprint(request: NextRequest, secret: string): string | null {
  const clientIp = getClientIp(request);
  if (!clientIp) return null;
  return createHmac("sha256", secret).update(clientIp).digest("hex");
}

export async function verifyTurnstile(input: {
  token: string;
  secret: string;
  request: NextRequest;
}): Promise<boolean> {
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret: input.secret,
      response: input.token,
      ...(getClientIp(input.request) ? { remoteip: getClientIp(input.request)! } : {}),
    }),
    cache: "no-store",
  });

  if (!response.ok) return false;
  const result = (await response.json()) as { success?: boolean };
  return result.success === true;
}
