import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGroupMeAuthorizeUrl, getGroupMeClientId } from "@/lib/groupme";
import { GROUPME_OAUTH_COOKIE, GROUPME_OAUTH_MAX_AGE } from "@/lib/groupme-oauth";

export async function GET(request: Request) {
  const clientId = getGroupMeClientId();
  if (!clientId) {
    return NextResponse.json({ error: "GroupMe is not configured." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const origin = new URL(request.url).origin;
    return NextResponse.redirect(`${origin}/?auth_error=1`);
  }

  const state = randomUUID();
  const cookieStore = await cookies();
  cookieStore.set(GROUPME_OAUTH_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: GROUPME_OAUTH_MAX_AGE,
    path: "/",
  });

  const authorizeUrl = getGroupMeAuthorizeUrl(clientId, state);
  return NextResponse.redirect(authorizeUrl);
}
