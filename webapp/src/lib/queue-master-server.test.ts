import { describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  createServerClient: vi.fn(),
  getSupabaseAdminKey: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
  getSupabaseAdminKey: mocks.getSupabaseAdminKey,
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createServerClient }));

import {
  getQueueHome,
  getQueueProfile,
  hashQueueGuestToken,
  isValidQueueGuestToken,
  isQueueSameOriginRequest,
  mapQueueDatabaseError,
  QUEUE_GUEST_COOKIE_MAX_AGE,
  setQueueGuestCookie,
} from "@/lib/queue-master-server";

describe("QueueMaster guest token boundary", () => {
  it("keeps public pages available when private server credentials are absent", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "publishable-key");
    mocks.getSupabaseAdminKey.mockReturnValue("");

    await expect(getQueueProfile()).resolves.toBeNull();
    await expect(getQueueHome(null, null)).resolves.toEqual({
      lobbies: [],
      guestLobby: null,
      promotionRequests: [],
    });
    expect(mocks.createServerClient).not.toHaveBeenCalled();
    expect(mocks.createAdminClient).not.toHaveBeenCalled();

    vi.unstubAllEnvs();
  });

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

  it("maps lobby lifecycle failures without leaking database details", () => {
    expect(mapQueueDatabaseError("QUEUE_LOBBY_LIMIT details").code).toBe("lobby_limit_reached");
    expect(mapQueueDatabaseError("QUEUE_LOBBY_CLOSED details").code).toBe("lobby_closed");
    expect(mapQueueDatabaseError("QUEUE_ACTIVE_ENTRIES details").code).toBe("active_entries");
  });
});
