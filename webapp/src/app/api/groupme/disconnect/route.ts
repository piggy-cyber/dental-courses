import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const origin = new URL(request.url).origin;

  if (!user) {
    return NextResponse.redirect(`${origin}/?auth_error=1`);
  }
  const { data: profile } = await supabase.from("profiles").select("status").eq("id", user.id).maybeSingle();
  if (profile?.status !== "approved") return new NextResponse(null, { status: 404 });

  const { error } = await supabase
    .from("profiles")
    .update({
      groupme_access_token: null,
      groupme_connected_at: null,
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.redirect(`${origin}/workspace-settings?groupme=error&reason=disconnect_failed`);
  }

  return NextResponse.redirect(`${origin}/workspace-settings?groupme=disconnected`);
}
