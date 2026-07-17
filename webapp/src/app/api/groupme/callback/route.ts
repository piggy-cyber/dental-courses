import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GROUPME_OAUTH_COOKIE } from "@/lib/groupme-oauth";

function profileRedirect(origin: string, query: string) {
  return NextResponse.redirect(`${origin}/workspace-settings?${query}`);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const accessToken = searchParams.get("access_token");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(GROUPME_OAUTH_COOKIE)?.value;
  cookieStore.delete(GROUPME_OAUTH_COOKIE);

  if (!accessToken) {
    return profileRedirect(origin, "groupme=error&reason=missing_token");
  }

  if (!expectedState) {
    return profileRedirect(origin, "groupme=error&reason=invalid_state");
  }

  // GroupMe may omit state on implicit callback; verify when present.
  if (state && state !== expectedState) {
    return profileRedirect(origin, "groupme=error&reason=invalid_state");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return profileRedirect(origin, "groupme=error&reason=not_signed_in");
  }
  const { data: profile } = await supabase.from("profiles").select("status").eq("id", user.id).maybeSingle();
  if (profile?.status !== "approved") return new NextResponse(null, { status: 404 });

  const { error } = await supabase
    .from("profiles")
    .update({
      groupme_access_token: accessToken,
      groupme_connected_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return profileRedirect(origin, "groupme=error&reason=save_failed");
  }

  return profileRedirect(origin, "groupme=connected");
}
