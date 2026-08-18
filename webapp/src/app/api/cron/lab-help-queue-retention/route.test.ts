import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

import { GET } from "@/app/api/cron/lab-help-queue-retention/route";

function request(secret?: string) {
  return new Request("https://fourthcanal.com/api/cron/lab-help-queue-retention", {
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  });
}

beforeEach(() => {
  process.env.CRON_SECRET = "cron-secret";
  mocks.createAdminClient.mockReset();
});

describe("Lab Help Queue retention cron", () => {
  it("rejects requests without the Vercel cron secret", async () => {
    const response = await GET(request());
    expect(response.status).toBe(401);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("permanently purges expired queue and rate-limit records", async () => {
    const rpc = vi.fn(async () => ({
      data: [{ entries_removed: 4, limits_removed: 7 }],
      error: null,
    }));
    mocks.createAdminClient.mockReturnValue({ rpc });

    const response = await GET(request("cron-secret"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ removedEntries: 4, removedRateLimits: 7 });
    expect(rpc).toHaveBeenCalledWith("purge_lab_help_queue_data");
  });

  it("fails closed without exposing database details", async () => {
    mocks.createAdminClient.mockReturnValue({
      rpc: vi.fn(async () => ({ data: null, error: { message: "private details" } })),
    });

    const response = await GET(request("cron-secret"));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Lab queue retention failed" });
  });
});
