import type { Profile } from "@/lib/access";

export const ADMIN_PERMISSION_DEFINITIONS = [
  {
    id: "accounts.manage",
    label: "Student access",
    description: "Manage D1/D2 labels, course collections, notes, and revocations.",
    href: "/admin/accounts",
  },
  {
    id: "roster.manage",
    label: "Official roster",
    description: "Add exact Google emails and run roster matching.",
    href: "/admin/roster",
  },
  {
    id: "collections.manage",
    label: "Course collections",
    description: "Create and organize the resource sets assigned to students.",
    href: "/admin/collections",
  },
  {
    id: "courses.manage",
    label: "Courses and files",
    description: "Edit courses, lectures, transcripts, and uploaded resources.",
    href: "/admin/courses",
  },
  {
    id: "operations.manage",
    label: "Reports and operations",
    description: "Review student reports, upload coverage, and activity history.",
    href: "/admin/operations",
  },
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSION_DEFINITIONS)[number]["id"];

export const ADMIN_PERMISSION_VALUES = ADMIN_PERMISSION_DEFINITIONS.map(
  (permission) => permission.id
) as AdminPermission[];

export type CouncilPresetId =
  | "president"
  | "vice-president"
  | "academic-chair"
  | "membership-chair"
  | "resource-chair"
  | "custom"
  | "none";

export type CouncilPreset = {
  id: CouncilPresetId;
  label: string;
  description: string;
  title: string;
  fullAccess: boolean;
  permissions: AdminPermission[];
};

export const COUNCIL_PRESETS: CouncilPreset[] = [
  {
    id: "president",
    label: "President",
    title: "President",
    description: "Full control, including council delegation and every administrative area.",
    fullAccess: true,
    permissions: [...ADMIN_PERMISSION_VALUES],
  },
  {
    id: "vice-president",
    label: "Vice President",
    title: "Vice President",
    description: "The same full access as the President for continuity and handoff.",
    fullAccess: true,
    permissions: [...ADMIN_PERMISSION_VALUES],
  },
  {
    id: "academic-chair",
    label: "Academic Chair",
    title: "Academic Chair",
    description: "Owns course organization, study resources, and academic issue follow-up.",
    fullAccess: false,
    permissions: ["collections.manage", "courses.manage", "operations.manage"],
  },
  {
    id: "membership-chair",
    label: "Membership Chair",
    title: "Membership Chair",
    description: "Maintains exact roster emails and each student's library access.",
    fullAccess: false,
    permissions: ["accounts.manage", "roster.manage"],
  },
  {
    id: "resource-chair",
    label: "Resource Chair",
    title: "Resource Chair",
    description: "Maintains lectures, files, transcripts, and operational follow-up.",
    fullAccess: false,
    permissions: ["courses.manage", "operations.manage"],
  },
  {
    id: "custom",
    label: "Custom role",
    title: "Council Member",
    description: "Choose a title and only the responsibilities this person needs.",
    fullAccess: false,
    permissions: [],
  },
  {
    id: "none",
    label: "No council access",
    title: "",
    description: "Student access only. Removes delegated administrative responsibilities.",
    fullAccess: false,
    permissions: [],
  },
];

export function hasAdminPermission(
  profile: Profile | null | undefined,
  permission: AdminPermission
): boolean {
  if (!profile || profile.status !== "approved") return false;
  return profile.role === "owner" || profile.admin_permissions.includes(permission);
}

export function canOpenAdmin(profile: Profile | null | undefined): boolean {
  if (!profile || profile.status !== "approved") return false;
  return profile.role === "owner" || profile.admin_permissions.length > 0;
}

export function hasFullCouncilAccess(profile: Profile | null | undefined): boolean {
  return profile?.status === "approved" && profile.role === "owner";
}

export function canViewAllCourseData(profile: Profile | null | undefined): boolean {
  return (
    hasAdminPermission(profile, "collections.manage") ||
    hasAdminPermission(profile, "courses.manage") ||
    hasAdminPermission(profile, "operations.manage")
  );
}

export function councilLabel(profile: Profile): string {
  if (profile.council_title) return profile.council_title;
  return profile.role === "owner" ? "Full administrator" : "Student";
}
