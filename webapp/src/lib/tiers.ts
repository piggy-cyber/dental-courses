import type { Profile } from "@/lib/access";

export type AccessTier = "d1" | "d2" | "d3" | "d4";

export const ACCESS_TIERS: AccessTier[] = ["d1", "d2", "d3", "d4"];

export function cohortToTier(cohort: string | null | undefined): AccessTier | null {
  const match = cohort?.trim().toLowerCase().match(/^(d[1-4])-/);
  if (!match) return null;
  return ACCESS_TIERS.includes(match[1] as AccessTier) ? (match[1] as AccessTier) : null;
}

export function tierLabel(tier: string | null | undefined): string {
  const normalized = tier?.toLowerCase();
  return ACCESS_TIERS.includes(normalized as AccessTier)
    ? normalized!.toUpperCase()
    : "No tier";
}

export function normalizeTiers(tiers: string[]): AccessTier[] {
  return ACCESS_TIERS.filter((tier) => tiers.includes(tier));
}

export function canAccessTier(
  profile: Pick<Profile, "role" | "status" | "access_tiers"> | null | undefined,
  tier: string | null | undefined
): boolean {
  if (!profile || profile.status !== "approved") return false;
  if (profile.role === "owner") return true;
  return !!tier && profile.access_tiers.includes(tier.toLowerCase());
}
