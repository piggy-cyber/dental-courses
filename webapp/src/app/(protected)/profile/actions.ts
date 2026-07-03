"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ProfileUpdate = {
  name?: string | null;
  username?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
};

export async function updateProfile(fields: ProfileUpdate): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  if (fields.username) {
    const { data: taken } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", fields.username)
      .neq("id", user.id)
      .maybeSingle();
    if (taken) return { error: "That username is already taken." };
  }

  const { error } = await supabase
    .from("profiles")
    .update(fields)
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/home");
  revalidatePath("/profile");
  return {};
}
