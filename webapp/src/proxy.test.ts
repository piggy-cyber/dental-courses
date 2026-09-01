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

  it("redirects the former public pages to QueueMaster without calling Auth", async () => {
    mocks.getUser.mockRejectedValue(new Error("Auth temporarily unavailable"));

    const response = await proxy(request("/games/tooth-quest"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://fourthcanal.com/");
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  it("makes QueueMaster the production home", async () => {
    const response = await proxy(request("/?from=old-home"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it.each(["/queue", "/queue/about", "/queue/instructions", "/queue/support", "/queue/dashboard", "/queue/features", "/queue/use-cases", "/queue/pricing", "/queue/how-it-works", "/queue/privacy", "/queue/terms", "/queue/r/front-desk/join", "/queue/r/front-desk/staff", "/legal", "/visilearn/privacy"])(
    "keeps the published page available at %s",
    async (path) => {
      mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

      const response = await proxy(request(path));

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    },
  );

  it("unpublishes former protected pages before Auth is called", async () => {
    mocks.getUser.mockRejectedValue(new Error("Auth temporarily unavailable"));

    const response = await proxy(request("/home?tab=progress"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://fourthcanal.com/");
    expect(response.cookies.get("fc_auth_return_to")).toBeUndefined();
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  it("unpublishes Sim Clinic Duty before rendering its protected RPC", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await proxy(request("/clinic-duty"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://fourthcanal.com/");
    expect(response.cookies.get("fc_auth_return_to")).toBeUndefined();
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  it("unpublishes the read-only Sim Clinic Duty showcase", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await proxy(request("/clinic-duty/showcase"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://fourthcanal.com/");
  });

  it("unpublishes the shared calendar page", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await proxy(request("/calendar"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://fourthcanal.com/");
  });

  it.each(["/api/calendar.ics", "/api/lab-help-queue"])("keeps operational API behavior unchanged at %s", async (path) => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await proxy(request(path));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("clears an invalid Supabase session before redirecting a protected request", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: { code: "refresh_token_not_found", status: 400 },
    });

    const response = await proxy(request("/queue/r/front-desk/admin", "sb-project-auth-token=expired"));

    expect(response.status).toBe(200);
    expect(response.cookies.get("sb-project-auth-token")?.value).toBe("");
    expect(response.cookies.get("sb-project-auth-token")?.maxAge).toBe(0);
  });

  it("continues to serve QueueMaster without Supabase configuration", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const response = await proxy(request("/queue"));

    expect(response.status).toBe(200);
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });
});
