import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));

import { GET } from "@/app/api/cron/queue-pilot-retention/route";

function request(secret?: string) {
  return new Request("https://fourthcanal.com/api/cron/queue-pilot-retention", {
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  });
}

beforeEach(() => {
  process.env.CRON_SECRET = "cron-secret";
  mocks.createAdminClient.mockReset();
});

describe("QueueMaster retention cron", () => {
  it("requires the existing Vercel cron secret", async () => {
    const response = await GET(request());
    expect(response.status).toBe(401);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("purges expired entries and guest sessions", async () => {
    const rpc = vi.fn(async () => ({
      data: [{ entries_deleted: 3, sessions_deleted: 2 }],
      error: null,
    }));
    mocks.createAdminClient.mockReturnValue({ rpc });
    const response = await GET(request("cron-secret"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ removedEntries: 3, removedGuestSessions: 2 });
    expect(rpc).toHaveBeenCalledWith("purge_queue_pilot_data");
  });
});
