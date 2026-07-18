import { describe, expect, it } from "vitest";
import { safeReturnPath } from "@/lib/auth-redirect";
import { withOptionalSession } from "@/lib/access";

describe("auth return paths", () => {
  it("keeps a safe internal route", () => {
    expect(safeReturnPath("/games/tooth-quest?mode=sprint")).toBe("/games/tooth-quest?mode=sprint");
  });

  it("rejects cross-origin and unapproved return paths", () => {
    expect(safeReturnPath("https://example.com")).toBe("/");
    expect(safeReturnPath("/support")).toBe("/");
  });
});

describe("optional sessions", () => {
  it("falls back when optional public session lookup fails", async () => {
    await expect(withOptionalSession(async () => Promise.reject(new Error("Auth unavailable")), "public")).resolves.toBe("public");
  });
});
