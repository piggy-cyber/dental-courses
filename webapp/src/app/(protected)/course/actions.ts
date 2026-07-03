"use server";

import { createClient } from "@/lib/supabase/server";

export async function reportResourceProblem(resourceId: number, message: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await supabase.from("resource_reports").insert({
    resource_id: resourceId,
    user_id: user.id,
    message,
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
