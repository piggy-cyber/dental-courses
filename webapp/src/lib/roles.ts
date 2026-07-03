import type { Profile } from "@/lib/access";

/** DB role is still `owner`; UI labels this Admin. */
export function isAdmin(profile: Profile | null | undefined): boolean {
  return profile?.role === "owner" && profile.status === "approved";
}

export function adminLabel(role: Profile["role"]): string {
  return role === "owner" ? "Admin" : "Student";
}
