"use server";

import { createClient } from "@/lib/supabase/server";

export type IssueCategory =
  | "file"
  | "missing"
  | "wrong_match"
  | "broken_link"
  | "site"
  | "account"
  | "other";

export async function reportResourceProblem(input: {
  resourceId?: number | null;
  courseCode?: string | null;
  category: IssueCategory;
  message: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const message = input.message.trim();
  if (message.length < 8) {
    return { ok: false, error: "Add a little more detail so an admin can act on it." };
  }

  const { error } = await supabase.from("resource_reports").insert({
    resource_id: input.resourceId ?? null,
    course_code: input.courseCode ?? null,
    user_id: user.id,
    category: input.category,
    message,
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
