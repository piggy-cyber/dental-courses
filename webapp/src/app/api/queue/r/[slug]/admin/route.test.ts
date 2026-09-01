import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  findLobbyBySlug: vi.fn(),
  getMembership: vi.fn(),
  requireQueueProfile: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/queue-master-server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/queue-master-server")>("@/lib/queue-master-server");
  return {
    ...actual,
    findLobbyBySlug: mocks.findLobbyBySlug,
    getMembership: mocks.getMembership,
    requireQueueProfile: mocks.requireQueueProfile,
    isQueueSameOriginRequest: () => true,
    isQueueJsonRequest: () => true,
  };
});

import { POST } from "@/app/api/queue/r/[slug]/admin/route";

const profileId = "11111111-1111-4111-8111-111111111111";
const lobbyId = "22222222-2222-4222-8222-222222222222";
const membershipId = "33333333-3333-4333-8333-333333333333";
const entryId = "44444444-4444-4444-8444-444444444444";

function request(body: object) {
  return new NextRequest("https://fourthcanal.com/api/queue/r/test-lobby/admin", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://fourthcanal.com" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mocks.rpc.mockReset().mockResolvedValue({ data: null, error: null });
  mocks.requireQueueProfile.mockReset().mockResolvedValue({ id: profileId, email: "owner@example.com", name: "Owner" });
  mocks.findLobbyBySlug.mockReset().mockResolvedValue({ id: lobbyId, slug: "test-lobby" });
  mocks.getMembership.mockReset().mockResolvedValue({ id: membershipId, role: "owner" });
});

describe("QueueMaster admin API actor boundary", () => {
  it("uses the Google session identity for entry actions", async () => {
    const response = await POST(request({
      type: "call",
      entryId,
      actorProfileId: "99999999-9999-4999-8999-999999999999",
    }), { params: Promise.resolve({ slug: "test-lobby" }) });

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("queue_call_entry_scoped", {
      p_lobby_id: lobbyId,
      p_entry_id: entryId,
      p_actor_profile_id: profileId,
    });
  });

  it("uses the owner session identity for promotion requests", async () => {
    const candidateId = "55555555-5555-4555-8555-555555555555";
    const response = await POST(request({
      type: "request_promotion",
      candidateId,
      ownerProfileId: "99999999-9999-4999-8999-999999999999",
    }), { params: Promise.resolve({ slug: "test-lobby" }) });

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("queue_request_admin_promotion", {
      p_candidate_id: candidateId,
      p_lobby_id: lobbyId,
      p_owner_profile_id: profileId,
    });
  });

  it("rejects a signed-in user without membership in this lobby", async () => {
    mocks.getMembership.mockResolvedValue(null);
    const response = await POST(request({ type: "call", entryId }), {
      params: Promise.resolve({ slug: "another-lobby" }),
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: "staff_required" });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("rejects an entry ID that belongs to another lobby", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "QUEUE_RESOURCE_LOBBY_MISMATCH private details" } });
    const response = await POST(request({ type: "call", entryId }), {
      params: Promise.resolve({ slug: "test-lobby" }),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: "resource_not_found",
      message: "That queue item does not belong to this lobby.",
    });
  });
});
