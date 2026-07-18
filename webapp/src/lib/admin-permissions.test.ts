import { describe, expect, it } from "vitest";
import { hasAdminPermission } from "@/lib/admin-permissions";
import type { Profile } from "@/lib/access";

function profile(overrides: Partial<Profile>): Profile {
  const base: Profile = {
    id: "00000000-0000-0000-0000-000000000001",
    email: "student@example.edu",
    name: null,
    username: null,
    bio: null,
    avatar_url: null,
    access_note: null,
    role: "student",
    status: "approved",
    roster_id: null,
    roster_match: false,
    access_tiers: [],
    admin_note: null,
    canvas_ics_url: null,
    council_title: null,
    admin_permissions: [],
    delegated_at: null,
    delegated_by: null,
    graduation_year: null,
    roster_access_approved: false,
  };
  return { ...base, ...overrides };
}

describe("communications permission", () => {
  it("does not expand existing officer access and remains automatic for a full administrator", () => {
    expect(
      hasAdminPermission(profile({ admin_permissions: ["operations.manage"] }), "communications.manage")
    ).toBe(false);
    expect(hasAdminPermission(profile({ role: "owner" }), "communications.manage")).toBe(true);
  });
});
