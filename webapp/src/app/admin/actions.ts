"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/access";
import { isAdmin } from "@/lib/roles";

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
  const supabase = await createClient();

  const update: Record<string, unknown> = {
    status,
    approved_at: status === "approved" ? new Date().toISOString() : null,
  };
  if (status === "approved") {
    update.approved_by = adminId;
  }

  const { error } = await supabase.from("profiles").update(update).eq("id", userId);
  if (error) throw new Error(error.message);

  revalidateAdminPaths();
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
  revalidateAdminPaths();
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
  revalidateAdminPaths();
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

function revalidateAdminPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/accounts");
  revalidatePath("/admin/team");
  revalidatePath("/admin/operations");
  revalidatePath("/owner");
}
