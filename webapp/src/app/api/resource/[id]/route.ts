import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/access";

// Opens a private file through a short-lived signed URL.
// Only approved accounts get past the profile check.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { profile } = await getSessionProfile();
  if (!profile || profile.status !== "approved") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data: resource } = await supabase
    .from("resources")
    .select("storage_path")
    .eq("id", Number(id))
    .single();

  if (!resource?.storage_path) {
    return NextResponse.json({ error: "File not available" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: signed, error } = await admin.storage
    .from("course-files")
    .createSignedUrl(resource.storage_path, 60 * 10);

  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: "Could not sign URL" }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
