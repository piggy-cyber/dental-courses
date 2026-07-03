"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/access";

async function requireOwner() {
  const { profile } = await getSessionProfile();
  if (!profile || profile.role !== "owner" || profile.status !== "approved") {
    throw new Error("Not authorized");
  }
}

export async function setAccountStatus(
  userId: string,
  status: "approved" | "pending" | "revoked"
) {
  await requireOwner();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      status,
      approved_at: status === "approved" ? new Date().toISOString() : null,
    })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/owner");
}
