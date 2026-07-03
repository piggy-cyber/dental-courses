"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/access";
import { isAdmin } from "@/lib/roles";
import { normalizeTiers } from "@/lib/tiers";

export async function requireAdminProfile() {
  const { profile, userId } = await getSessionProfile();
  if (!isAdmin(profile) || !userId) {
    throw new Error("Not authorized");
  }
  return { profile, userId };
}

export async function setAccountStatus(
  userId: string,
  status: "approved" | "pending" | "revoked"
) {
  const { userId: adminId } = await requireAdminProfile();
  if (userId === adminId && status !== "approved") {
    throw new Error("You cannot revoke or pend your own admin account.");
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

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
  await requireAdminProfile();
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
  await requireAdminProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ access_tiers: normalizeTiers(tiers) })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  revalidateAdminPaths(userId);
}

export async function saveAdminNote(userId: string, note: string) {
  await requireAdminProfile();
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
  await requireAdminProfile();
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

  const { error: recheckError } = await supabase.rpc("recheck_roster_matches");
  if (recheckError) throw new Error(recheckError.message);
  revalidateAdminPaths();
}

export async function recheckRosterMatches(): Promise<number> {
  await requireAdminProfile();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("recheck_roster_matches");
  if (error) throw new Error(error.message);
  revalidateAdminPaths();
  return Number(data ?? 0);
}

export async function promoteToAdmin(userId: string) {
  await requireAdminProfile();
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
  const { userId: adminId } = await requireAdminProfile();
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

function cleanOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed || null;
}

function revalidateAdminPaths(accountId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/accounts");
  if (accountId) revalidatePath(`/admin/accounts/${accountId}`);
  revalidatePath("/admin/roster");
  revalidatePath("/admin/team");
  revalidatePath("/admin/operations");
  revalidatePath("/library");
  revalidatePath("/owner");
}
