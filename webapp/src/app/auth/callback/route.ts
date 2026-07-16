import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_RETURN_COOKIE,
  authRedirectUrl,
  clearAuthReturnCookie,
  safeReturnPath,
} from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/server";

function redirectAfterAuth(requestUrl: string, returnPath: string) {
  const response = NextResponse.redirect(authRedirectUrl(requestUrl, returnPath));
  const clearCookie = clearAuthReturnCookie(requestUrl.startsWith("https://"));
  response.cookies.set(clearCookie.name, clearCookie.value, clearCookie.options);
  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const returnPath = safeReturnPath(request.cookies.get(AUTH_RETURN_COOKIE)?.value);

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return redirectAfterAuth(request.url, returnPath);
    }
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as "email" | "signup" | "invite" | "recovery" | "email_change",
      token_hash,
    });
    if (!error) {
      return redirectAfterAuth(request.url, returnPath);
    }
  }

  const errorUrl = new URL("/", origin);
  errorUrl.searchParams.set("auth_error", "1");
  return NextResponse.redirect(errorUrl);
}
