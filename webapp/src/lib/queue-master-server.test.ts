import { describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import {
  hashQueueGuestToken,
  isValidQueueGuestToken,
  isQueueSameOriginRequest,
  mapQueueDatabaseError,
  QUEUE_GUEST_COOKIE_MAX_AGE,
  setQueueGuestCookie,
} from "@/lib/queue-master-server";

describe("QueueMaster guest token boundary", () => {
  it("accepts only 32-byte base64url tokens", () => {
    expect(isValidQueueGuestToken("A".repeat(43))).toBe(true);
    expect(isValidQueueGuestToken("A".repeat(42))).toBe(false);
    expect(isValidQueueGuestToken("A".repeat(42) + ".")).toBe(false);
  });

  it("stores a deterministic SHA-256 hash, not the cookie token", () => {
    const token = "A".repeat(43);
    const hash = hashQueueGuestToken(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain(token);
    expect(hashQueueGuestToken(token)).toBe(hash);
  });

  it("uses the approved 30-day browser persistence window", () => {
    expect(QUEUE_GUEST_COOKIE_MAX_AGE).toBe(2_592_000);
  });

  it("sets a site-wide HttpOnly guest cookie so queue APIs receive it", () => {
    const request = new NextRequest("https://fourthcanal.com/api/queue");
    const response = NextResponse.json({ ok: true });
    setQueueGuestCookie(response, request, "A".repeat(43));
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=lax");
    expect(cookie).toContain("Path=/");
  });

  it("accepts the proxy-forwarded same origin and rejects cross-site mutations", () => {
    const sameOrigin = new NextRequest("http://localhost:3000/api/queue", {
      headers: {
        origin: "http://127.0.0.1:3100",
        host: "localhost:3000",
        "x-forwarded-host": "127.0.0.1:3100",
        "x-forwarded-proto": "http",
        "sec-fetch-site": "same-origin",
      },
    });
    const crossSite = new NextRequest("https://fourthcanal.com/api/queue", {
      headers: { origin: "https://evil.example", host: "fourthcanal.com", "sec-fetch-site": "cross-site" },
    });
    expect(isQueueSameOriginRequest(sameOrigin)).toBe(true);
    expect(isQueueSameOriginRequest(crossSite)).toBe(false);
  });

  it("maps database policy failures to non-sensitive messages", () => {
    const error = mapQueueDatabaseError("P0001: QUEUE_REASSIGN_BEFORE_REMOVAL internal details");
    expect(error.code).toBe("reassign_required");
    expect(error.message).not.toContain("internal details");
  });
});
