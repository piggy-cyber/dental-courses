import { afterEach, describe, expect, it, vi } from "vitest";
import { validatePublicSupportInput } from "@/lib/support";
import { NextRequest } from "next/server";
import { getRequestFingerprint, getSupportServerConfig, verifyTurnstile } from "@/lib/support-server";

const originalVercelEnv = process.env.VERCEL_ENV;
const originalTurnstileSecret = process.env.TURNSTILE_SECRET_KEY;

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = originalVercelEnv;
  if (originalTurnstileSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
  else process.env.TURNSTILE_SECRET_KEY = originalTurnstileSecret;
});

const validInput = {
  category: "site",
  message: "The study guide page keeps showing the wrong course title.",
  replyEmail: "student@example.edu",
  name: "Student",
  pagePath: "/guides/restorative-health",
  "cf-turnstile-response": "verified-token",
  website: "",
};

describe("validatePublicSupportInput", () => {
  it("accepts a valid public support request", () => {
    expect(validatePublicSupportInput(validInput)).toMatchObject({ ok: true });
  });

  it("requires a reply email for privacy, copyright, security, and account concerns", () => {
    expect(validatePublicSupportInput({ ...validInput, category: "privacy", replyEmail: "" })).toMatchObject({
      ok: false,
      code: "validation_failed",
    });
  });

  it("rejects cross-origin paths, short reports, and filled honeypots", () => {
    expect(validatePublicSupportInput({ ...validInput, pagePath: "https://example.com" })).toMatchObject({ ok: false });
    expect(validatePublicSupportInput({ ...validInput, message: "Too short" })).toMatchObject({ ok: false });
    expect(validatePublicSupportInput({ ...validInput, website: "https://spam.example" })).toMatchObject({
      ok: false,
      code: "spam_detected",
    });
  });
});

describe("support rate-limit fingerprints", () => {
  it("creates a stable HMAC and never returns the raw address", () => {
    const request = new NextRequest("https://fourthcanal.com/api/support", {
      headers: { "x-vercel-forwarded-for": "203.0.113.25" },
    });
    const fingerprint = getRequestFingerprint(request, "test-secret");
    expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(fingerprint).not.toContain("203.0.113.25");
    expect(getRequestFingerprint(request, "test-secret")).toBe(fingerprint);
  });
});

describe("Turnstile production checks", () => {
  it("refuses Cloudflare test secrets in production", () => {
    process.env.VERCEL_ENV = "production";
    process.env.TURNSTILE_SECRET_KEY = "1x0000000000000000000000000000000AA";

    expect(getSupportServerConfig().turnstileSecret).toBeUndefined();
  });

  it("requires a successful response for the current request hostname", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      hostname: "example.com",
    }), { status: 200 })));

    const verified = await verifyTurnstile({
      token: "verified-token",
      secret: "real-secret",
      request: new NextRequest("https://fourthcanal.com/api/support", {
        headers: { "x-vercel-forwarded-for": "203.0.113.25" },
      }),
    });

    expect(verified).toBe(false);
  });
});
