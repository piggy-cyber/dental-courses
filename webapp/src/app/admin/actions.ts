"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/access";
import {
  ADMIN_PERMISSION_VALUES,
  hasAdminPermission,
  hasFullCouncilAccess,
  type AdminPermission,
} from "@/lib/admin-permissions";
import { normalizeTiers } from "@/lib/tiers";

export async function requireAdminProfile(permission?: AdminPermission) {
  const { profile, userId } = await getSessionProfile();
  if (!profile || !userId || (permission && !hasAdminPermission(profile, permission))) {
    throw new Error("Not authorized");
  }
  if (!permission && profile.role !== "owner" && profile.admin_permissions.length === 0) {
    throw new Error("Not authorized");
  }
  return { profile, userId };
}

export async function requireFullAdminProfile() {
  const { profile, userId } = await getSessionProfile();
  if (!hasFullCouncilAccess(profile) || !profile || !userId) {
    throw new Error("Only the President or Vice President can manage council access.");
  }
  return { profile, userId };
}

export async function setAccountStatus(
  userId: string,
  status: "approved" | "pending" | "revoked"
) {
  const { profile: adminProfile, userId: adminId } = await requireAdminProfile("accounts.manage");
  if (userId === adminId && status !== "approved") {
    throw new Error("You cannot revoke or pend your own admin account.");
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  if (status === "approved") {
    const { data: target } = await supabase
      .from("profiles")
      .select("email, role, council_title, admin_permissions")
      .eq("id", userId)
      .maybeSingle();
    if (!target?.email) throw new Error("Account not found.");

    const targetHasCouncilAccess =
      target.role === "owner" ||
      Boolean(target.council_title) ||
      (target.admin_permissions?.length ?? 0) > 0;
    if (targetHasCouncilAccess && !hasFullCouncilAccess(adminProfile)) {
      throw new Error("Only the President or Vice President can change a council member status.");
    }

    const { data: roster } = await supabase
      .from("student_roster")
      .select("id")
      .ilike("email", target.email)
      .neq("status", "withdrawn")
      .limit(1)
      .maybeSingle();
    if (!roster) {
      throw new Error("Add this exact Google email to the roster before approving access.");
    }
  } else {
    const { data: target } = await supabase
      .from("profiles")
      .select("role, council_title, admin_permissions")
      .eq("id", userId)
      .maybeSingle();
    const targetHasCouncilAccess =
      target?.role === "owner" ||
      Boolean(target?.council_title) ||
      (target?.admin_permissions?.length ?? 0) > 0;
    if (targetHasCouncilAccess && !hasFullCouncilAccess(adminProfile)) {
      throw new Error("Only the President or Vice President can change a council member status.");
    }
  }

  const update: Record<string, unknown> = {
    status,
    approved_at: status === "approved" ? now : null,
    approved_by: status === "approved" ? adminId : null,
    revoked_at: status === "revoked" ? now : null,
    revoked_by: status === "revoked" ? adminId : null,
  };

  const { error } = await supabase.from("profiles").update(update).eq("id", userId);
  if (error) throw new Error(error.message);

  revalidateAdminPaths(userId);
}

export async function updateAccountProfile(
  userId: string,
  fields: {
    name?: string | null;
    username?: string | null;
    bio?: string | null;
  }
) {
  await requireAdminProfile("accounts.manage");
  const supabase = await createClient();

  const update = {
    name: cleanOptionalText(fields.name),
    username: cleanOptionalText(fields.username),
    bio: cleanOptionalText(fields.bio),
  };

  const { error } = await supabase.from("profiles").update(update).eq("id", userId);
  if (error) throw new Error(error.message);
  revalidateAdminPaths(userId);
}

export async function setAccessTiers(userId: string, tiers: string[]) {
  await requireAdminProfile("accounts.manage");
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ access_tiers: normalizeTiers(tiers) })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  revalidateAdminPaths(userId);
}

export async function setResourceCollectionGrants(userId: string, collectionIds: string[]) {
  const { userId: adminId } = await requireAdminProfile("accounts.manage");
  const supabase = await createClient();
  const normalized = [...new Set(collectionIds.map((id) => id.trim()).filter(Boolean))];

  if (normalized.length > 0) {
    const { data: collections, error: collectionError } = await supabase
      .from("resource_collections")
      .select("id")
      .in("id", normalized);
    if (collectionError) throw new Error(collectionError.message);
    const found = new Set((collections ?? []).map((collection) => collection.id));
    const missing = normalized.filter((id) => !found.has(id));
    if (missing.length) {
      throw new Error(`Unknown resource collection: ${missing.join(", ")}`);
    }
  }

  const { error: deleteError } = await supabase
    .from("profile_resource_collection_grants")
    .delete()
    .eq("profile_id", userId);
  if (deleteError) throw new Error(deleteError.message);

  if (normalized.length > 0) {
    const { error: insertError } = await supabase
      .from("profile_resource_collection_grants")
      .insert(
        normalized.map((collectionId) => ({
          profile_id: userId,
          collection_id: collectionId,
          granted_by: adminId,
        }))
      );
    if (insertError) throw new Error(insertError.message);
  }

  revalidateAdminPaths(userId);
  revalidatePath("/home");
  revalidatePath("/library");
}

export async function createResourceCollection(input: {
  id?: string | null;
  label: string;
  shortLabel: string;
  description?: string | null;
  sourceTier?: string | null;
  sourceCohort?: string | null;
  defaultForTier?: boolean;
}) {
  await requireAdminProfile("collections.manage");
  const supabase = await createClient();

  const label = input.label.trim();
  const shortLabel = input.shortLabel.trim();
  const sourceTier = cleanOptionalText(input.sourceTier)?.toLowerCase() ?? null;
  const sourceCohort = cleanOptionalText(input.sourceCohort)?.toLowerCase() ?? null;
  const id = cleanOptionalText(input.id) ?? slugifyCollectionId(label || shortLabel);

  if (!id || !/^[a-z0-9][a-z0-9-]{2,62}$/.test(id)) {
    throw new Error("Collection ID must use lowercase letters, numbers, and hyphens.");
  }
  if (!label) throw new Error("Collection name is required.");
  if (!shortLabel) throw new Error("Short label is required.");
  if (sourceTier && !["d1", "d2", "d3", "d4"].includes(sourceTier)) {
    throw new Error("Source tier must be D1, D2, D3, or D4.");
  }

  const { count } = await supabase
    .from("resource_collections")
    .select("*", { count: "exact", head: true });

  const { error } = await supabase.from("resource_collections").insert({
    id,
    label,
    short_label: shortLabel,
    description: cleanOptionalText(input.description),
    source_tier: sourceTier,
    source_cohort: sourceCohort,
    default_for_tier: Boolean(input.defaultForTier),
    sort_order: ((count ?? 0) + 1) * 10,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath("/admin/collections");
  revalidatePath("/admin/accounts");
}

export async function saveAdminNote(userId: string, note: string) {
  await requireAdminProfile("accounts.manage");
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ admin_note: note.trim() || null })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  revalidateAdminPaths(userId);
}

export async function addRosterEntry(input: {
  fullName: string;
  email?: string | null;
  cohort: string;
}) {
  await requireAdminProfile("roster.manage");
  const fullName = input.fullName.trim();
  const email = input.email?.trim().toLowerCase() || null;
  const cohort = input.cohort.trim().toLowerCase();

  if (!fullName) throw new Error("Roster name is required.");
  if (!/^d[1-4]-\d{4}$/.test(cohort)) throw new Error("Use a cohort like d1-2025.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Use a valid email address.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("student_roster")
    .insert({ full_name: fullName, email, cohort, status: "expected" });
  if (error) throw new Error(error.message);

  const { error: recheckError } = await createAdminClient().rpc("recheck_roster_matches");
  if (recheckError) throw new Error(recheckError.message);
  revalidateAdminPaths();
}

export async function recheckRosterMatches(): Promise<number> {
  await requireAdminProfile("roster.manage");
  const { data, error } = await createAdminClient().rpc("recheck_roster_matches");
  if (error) throw new Error(error.message);
  revalidateAdminPaths();
  return Number(data ?? 0);
}

export async function promoteToAdmin(userId: string) {
  await requireFullAdminProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role: "owner" })
    .eq("id", userId)
    .eq("role", "student");
  if (error) throw new Error(error.message);
  revalidateAdminPaths(userId);
}

export async function demoteAdmin(userId: string) {
  const { userId: adminId } = await requireFullAdminProfile();
  if (userId === adminId) {
    throw new Error("You cannot demote yourself.");
  }

  const supabase = await createClient();
  const { count } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "owner")
    .eq("status", "approved");

  if ((count ?? 0) <= 1) {
    throw new Error("Cannot demote the last admin.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: "student" })
    .eq("id", userId)
    .eq("role", "owner");
  if (error) throw new Error(error.message);
  revalidateAdminPaths(userId);
}

export async function saveAccessNote(note: string) {
  const { userId } = await getSessionProfile();
  if (!userId) throw new Error("Not signed in.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ access_note: note.trim() || null })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function updateReportStatus(
  reportId: number,
  status: "open" | "resolved" | "dismissed",
  adminNote?: string
) {
  const { userId } = await requireAdminProfile("operations.manage");
  const supabase = await createClient();
  const update = {
    status,
    admin_note: cleanOptionalText(adminNote),
    resolved_at: status === "open" ? null : new Date().toISOString(),
    resolved_by: status === "open" ? null : userId,
  };
  const { error } = await supabase
    .from("resource_reports")
    .update(update)
    .eq("id", reportId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/admin/operations");
}

export async function setCouncilAccess(input: {
  userId: string;
  title?: string | null;
  fullAccess: boolean;
  permissions: string[];
}) {
  const { userId: adminId } = await requireFullAdminProfile();
  const title = cleanOptionalText(input.title);
  const permissions = [
    ...new Set(input.permissions.filter((permission) =>
      ADMIN_PERMISSION_VALUES.includes(permission as AdminPermission)
    )),
  ] as AdminPermission[];

  const grantsCouncilAccess = input.fullAccess || permissions.length > 0 || Boolean(title);
  if (grantsCouncilAccess && !title) throw new Error("A council role title is required.");
  if (title && title.length < 2) throw new Error("Role title must be at least 2 characters.");
  if (title && title.length > 80) throw new Error("Role title must be 80 characters or fewer.");
  if (!input.fullAccess && input.userId === adminId) {
    throw new Error("You cannot remove your own full access.");
  }

  const admin = createAdminClient();
  const { data: target, error: targetError } = await admin
    .from("profiles")
    .select("id, email, role, status")
    .eq("id", input.userId)
    .maybeSingle();
  if (targetError) throw new Error(targetError.message);
  if (!target) throw new Error("Account not found.");
  if (target.status !== "approved") {
    throw new Error("Council access requires an approved roster account.");
  }

  if (grantsCouncilAccess && target.role !== "owner") {
    const { data: exactRoster, error: rosterError } = await admin
      .from("student_roster")
      .select("id")
      .ilike("email", target.email)
      .neq("status", "withdrawn")
      .limit(1)
      .maybeSingle();
    if (rosterError) throw new Error(rosterError.message);
    if (!exactRoster) {
      throw new Error("Add this exact Google email to the roster before delegating access.");
    }
  }

  if (target.role === "owner" && !input.fullAccess) {
    const { count } = await admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "owner")
      .eq("status", "approved");
    if ((count ?? 0) <= 1) throw new Error("Cannot remove the last full administrator.");
  }

  const { error } = await admin
    .from("profiles")
    .update({
      role: input.fullAccess ? "owner" : "student",
      council_title: grantsCouncilAccess ? title : null,
      admin_permissions: input.fullAccess ? [] : permissions,
      delegated_at: new Date().toISOString(),
      delegated_by: adminId,
    })
    .eq("id", input.userId);
  if (error) throw new Error(error.message);

  revalidateAdminPaths(input.userId);
  revalidatePath("/admin/team");
}

function cleanOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed || null;
}

function slugifyCollectionId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}

function revalidateAdminPaths(accountId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/accounts");
  if (accountId) revalidatePath(`/admin/accounts/${accountId}`);
  revalidatePath("/admin/roster");
  revalidatePath("/admin/team");
  revalidatePath("/admin/operations");
  revalidatePath("/admin/courses");
  revalidatePath("/library");
  revalidatePath("/owner");
}
