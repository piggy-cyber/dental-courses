import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), requireQueueProfile: vi.fn(), findLobbyBySlug: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/queue-master-server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/queue-master-server")>("@/lib/queue-master-server");
  return { ...actual, requireQueueProfile: mocks.requireQueueProfile, findLobbyBySlug: mocks.findLobbyBySlug, isQueueSameOriginRequest: () => true, isQueueJsonRequest: () => true };
});

import { POST } from "@/app/api/queue/r/[slug]/staff/route";

function request(body: object) {
  return new NextRequest("https://fourthcanal.com/api/queue/r/test-lobby/staff", { method: "POST", headers: { "content-type": "application/json", origin: "https://fourthcanal.com" }, body: JSON.stringify(body) });
}

beforeEach(() => {
  mocks.rpc.mockReset().mockResolvedValue({ data: null, error: null });
  mocks.requireQueueProfile.mockReset().mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111", email: "staff@example.com", name: "Staff Person" });
  mocks.findLobbyBySlug.mockReset().mockResolvedValue({ id: "22222222-2222-4222-8222-222222222222", slug: "test-lobby" });
});

describe("QueueMaster staff API actor boundary", () => {
  it("ignores request-supplied identity when joining", async () => {
    const response = await POST(request({ type: "join", profileId: "99999999-9999-4999-8999-999999999999", email: "attacker@example.com" }), { params: Promise.resolve({ slug: "test-lobby" }) });
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("queue_join_staff_pool", {
      p_lobby_id: "22222222-2222-4222-8222-222222222222",
      p_profile_id: "11111111-1111-4111-8111-111111111111",
      p_display_name: "Staff Person",
      p_email: "staff@example.com",
    });
  });

  it("uses the Google session identity when accepting a request", async () => {
    const requestId = "33333333-3333-4333-8333-333333333333";
    const response = await POST(request({ type: "accept", requestId, candidateProfileId: "99999999-9999-4999-8999-999999999999" }), { params: Promise.resolve({ slug: "test-lobby" }) });
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("queue_respond_admin_promotion", expect.objectContaining({ p_request_id: requestId, p_candidate_profile_id: "11111111-1111-4111-8111-111111111111" }));
    expect(mocks.rpc).toHaveBeenCalledWith("queue_respond_admin_promotion", expect.objectContaining({ p_lobby_id: "22222222-2222-4222-8222-222222222222" }));
  });

  it("rejects malformed request IDs before calling the database", async () => {
    const response = await POST(request({ type: "accept", requestId: "another-lobby-request" }), { params: Promise.resolve({ slug: "test-lobby" }) });
    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("returns a safe denial when a request belongs to another candidate", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "QUEUE_PROMOTION_FORBIDDEN private details" } });
    const requestId = "33333333-3333-4333-8333-333333333333";
    const response = await POST(request({ type: "accept", requestId }), {
      params: Promise.resolve({ slug: "test-lobby" }),
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "promotion_forbidden",
      message: "You can only respond to your own admin request.",
    });
  });
});
