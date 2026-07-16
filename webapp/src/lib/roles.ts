import type { Profile } from "@/lib/access";
import { canOpenAdmin, hasFullCouncilAccess } from "@/lib/admin-permissions";

/** Compatibility helper: any approved delegated council member may open admin. */
export function isAdmin(profile: Profile | null | undefined): boolean {
  return canOpenAdmin(profile);
}

export function isFullAdmin(profile: Profile | null | undefined): boolean {
  return hasFullCouncilAccess(profile);
}

export function adminLabel(role: Profile["role"], councilTitle?: string | null): string {
  if (councilTitle) return councilTitle;
  return role === "owner" ? "Full administrator" : "Student";
}
