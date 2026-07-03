import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  email: string;
  name: string | null;
  role: "student" | "owner";
  status: "pending" | "approved" | "revoked";
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
    .select("id, email, name, role, status")
    .eq("id", user.id)
    .single();

  return { profile: (profile as Profile) ?? null, userId: user.id };
}
