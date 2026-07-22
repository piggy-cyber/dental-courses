import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  createServerClient: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}));

import { proxy } from "@/proxy";

const SUPABASE_URL = "https://example.supabase.co";
const SUPABASE_KEY = "test-anon-key";

function request(path: string, cookie?: string) {
  return new NextRequest(`https://fourthcanal.com${path}`, {
    headers: cookie ? { cookie } : undefined,
  });
}

describe("request proxy", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = SUPABASE_KEY;
    mocks.getUser.mockReset();
    mocks.createServerClient.mockReset();
    mocks.createServerClient.mockReturnValue({ auth: { getUser: mocks.getUser } });
  });

  it("keeps public pages available when Auth is unavailable", async () => {
    mocks.getUser.mockRejectedValue(new Error("Auth temporarily unavailable"));

    const response = await proxy(request("/games/tooth-quest"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("fails closed for protected pages when Auth is unavailable", async () => {
    mocks.getUser.mockRejectedValue(new Error("Auth temporarily unavailable"));

    const response = await proxy(request("/home?tab=progress"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://fourthcanal.com/");
    expect(response.cookies.get("fc_auth_return_to")?.value).toBe("/home?tab=progress");
  });

  it("clears an invalid Supabase session before redirecting a protected request", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: { code: "refresh_token_not_found", status: 400 },
    });

    const response = await proxy(request("/profile", "sb-project-auth-token=expired"));

    expect(response.status).toBe(307);
    expect(response.cookies.get("sb-project-auth-token")?.value).toBe("");
    expect(response.cookies.get("sb-project-auth-token")?.maxAge).toBe(0);
  });

  it("continues to serve public routes without Supabase configuration", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const response = await proxy(request("/support"));

    expect(response.status).toBe(200);
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });
});
