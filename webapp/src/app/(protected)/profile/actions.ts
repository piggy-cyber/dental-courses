"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fetchGroupMeGroups } from "@/lib/groupme";

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

  const allowed = {
    name: fields.name?.trim().slice(0, 120) || null,
    username: fields.username?.trim().toLowerCase() || null,
    bio: fields.bio?.trim().slice(0, 280) || null,
    avatar_url: fields.avatar_url ?? undefined,
  };

  const { error } = await supabase
    .from("profiles")
    .update(allowed)
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return {};
}

export async function updateWorkspaceCalendar(canvas_ics_url: string | null): Promise<{ error?: string }> {
  const { profile, userId } = await (await import("@/lib/access")).getSessionProfile();
  if (!profile || !userId || profile.status !== "approved") return { error: "Not found." };
  if (canvas_ics_url) {
    const validationError = validateCanvasCalendarUrl(canvas_ics_url);
    if (validationError) return { error: validationError };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ canvas_ics_url }).eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/home");
  revalidatePath("/workspace-settings");
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
  const { profile: sessionProfile } = await (await import("@/lib/access")).getSessionProfile();
  if (!sessionProfile || sessionProfile.status !== "approved") return { ok: false, error: "Not found." };

  const { data: groupMeProfile } = await supabase
    .from("profiles")
    .select("groupme_access_token")
    .eq("id", user.id)
    .single();

  const token = groupMeProfile?.groupme_access_token;
  if (!token) return { ok: false, error: "GroupMe is not connected." };

  try {
    const groups = await fetchGroupMeGroups(token);
    return { ok: true, groupCount: groups.length };
  } catch {
    return { ok: false, error: "Could not reach GroupMe. Try reconnecting." };
  }
}
