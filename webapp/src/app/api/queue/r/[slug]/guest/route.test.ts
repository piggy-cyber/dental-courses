import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  findLobbyBySlug: vi.fn(),
  getOrCreateGuestSession: vi.fn(),
  requireGuestSession: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/queue-master-server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/queue-master-server")>("@/lib/queue-master-server");
  return {
    ...actual,
    findLobbyBySlug: mocks.findLobbyBySlug,
    getOrCreateGuestSession: mocks.getOrCreateGuestSession,
    requireGuestSession: mocks.requireGuestSession,
    isQueueSameOriginRequest: () => true,
    isQueueJsonRequest: () => true,
  };
});

import { POST } from "@/app/api/queue/r/[slug]/guest/route";

const lobbyId = "11111111-1111-4111-8111-111111111111";
const guestSessionId = "22222222-2222-4222-8222-222222222222";
const entryId = "33333333-3333-4333-8333-333333333333";

function request(body: object) {
  return new NextRequest("https://fourthcanal.com/api/queue/r/test-lobby/guest", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: "fc_queue_guest=guest-cookie-token",
      origin: "https://fourthcanal.com",
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mocks.rpc.mockReset().mockResolvedValue({ data: null, error: null });
  mocks.findLobbyBySlug.mockReset().mockResolvedValue({ id: lobbyId, slug: "test-lobby" });
  mocks.getOrCreateGuestSession.mockReset().mockResolvedValue({
    session: { id: guestSessionId },
    token: "guest-cookie-token",
    created: false,
  });
  mocks.requireGuestSession.mockReset().mockResolvedValue({ id: guestSessionId });
});

describe("QueueMaster guest API actor boundary", () => {
  it("uses the hashed-cookie session identity for guest transitions", async () => {
    const response = await POST(request({
      type: "finish",
      entryId,
      guestSessionId: "99999999-9999-4999-8999-999999999999",
      actorProfileId: "99999999-9999-4999-8999-999999999999",
    }), { params: Promise.resolve({ slug: "test-lobby" }) });

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("queue_transition_entry_scoped", {
      p_lobby_id: lobbyId,
      p_entry_id: entryId,
      p_to_status: "completed",
      p_actor_kind: "guest",
      p_actor_profile_id: null,
      p_guest_session_id: guestSessionId,
    });
  });

  it("uses the server-created guest session when checking in", async () => {
    const membershipId = "44444444-4444-4444-8444-444444444444";
    const response = await POST(request({
      type: "check_in",
      firstName: "Guest",
      location: "Desk 8",
      membershipId,
      guestSessionId: "99999999-9999-4999-8999-999999999999",
    }), { params: Promise.resolve({ slug: "test-lobby" }) });

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("queue_join_lobby", {
      p_lobby_id: lobbyId,
      p_guest_session_id: guestSessionId,
      p_guest_first_name: "Guest",
      p_location: "Desk 8",
      p_assigned_membership_id: membershipId,
    });
  });

  it("rejects an owned entry ID submitted through another lobby URL", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "QUEUE_RESOURCE_LOBBY_MISMATCH internal row" } });
    const response = await POST(request({ type: "finish", entryId }), {
      params: Promise.resolve({ slug: "test-lobby" }),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: "resource_not_found",
      message: "That queue item does not belong to this lobby.",
    });
  });
});
