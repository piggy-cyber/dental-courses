"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fetchGroupMeGroups } from "@/lib/groupme";

type ProfileUpdate = {
  name?: string | null;
  username?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  canvas_ics_url?: string | null;
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

  if (fields.canvas_ics_url) {
    const validationError = validateCanvasCalendarUrl(fields.canvas_ics_url);
    if (validationError) return { error: validationError };
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

function validateCanvasCalendarUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "Use the full Canvas calendar feed URL.";
  }

  if (url.protocol !== "https:") {
    return "Canvas calendar URL must start with https://";
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname !== "canvas.case.edu" && !hostname.endsWith(".instructure.com")) {
    return "Use a Canvas calendar feed URL.";
  }

  if (!url.pathname.toLowerCase().endsWith(".ics")) {
    return "Use the Canvas calendar feed URL ending in .ics.";
  }

  return null;
}

export async function testGroupMeConnection(): Promise<
  { ok: true; groupCount: number } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("groupme_access_token")
    .eq("id", user.id)
    .single();

  const token = profile?.groupme_access_token;
  if (!token) return { ok: false, error: "GroupMe is not connected." };

  try {
    const groups = await fetchGroupMeGroups(token);
    return { ok: true, groupCount: groups.length };
  } catch {
    return { ok: false, error: "Could not reach GroupMe. Try reconnecting." };
  }
}
