import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  access_note: string | null;
  role: "student" | "owner";
  status: "pending" | "approved" | "revoked";
  roster_id: string | null;
  roster_match: boolean;
  access_tiers: string[];
  admin_note: string | null;
};

export async function getSessionProfile(): Promise<{
  profile: Profile | null;
  userId: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { profile: null, userId: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, email, name, username, bio, avatar_url, access_note, role, status, roster_id, roster_match, access_tiers, admin_note"
    )
    .eq("id", user.id)
    .single();

  return { profile: (profile as Profile) ?? null, userId: user.id };
}
