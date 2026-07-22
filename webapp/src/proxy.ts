import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authReturnCookie } from "@/lib/auth-redirect";

const protectedPathPrefixes = [
  "/admin",
  "/api/admin",
  "/api/groupme",
  "/api/resource",
  "/contacts",
  "/course",
  "/d1",
  "/home",
  "/library",
  "/owner",
  "/preview-lab",
  "/profile",
  "/resource",
  "/workspace-settings",
] as const;

function matchesPathPrefix(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function clearInvalidAuthCookies(request: NextRequest, response: NextResponse) {
  request.cookies
    .getAll()
    .filter((cookie) => cookie.name.startsWith("sb-"))
    .forEach((cookie) => response.cookies.set(cookie.name, "", { path: "/", maxAge: 0 }));
}

// Refreshes the Supabase session cookie and keeps the private workspace private.
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const path = request.nextUrl.pathname;
  const isProtectedPath = protectedPathPrefixes.some((prefix) =>
    matchesPathPrefix(path, prefix)
  );
  // Bot uploads authenticate with a Bearer API key inside the route handler,
  // not a session cookie, so let them through to be authorized there.
  const isBotApi = path.startsWith("/api/admin/course-resource");
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  if (!hasSupabaseConfig) {
    if (!isProtectedPath || isBotApi) return supabaseResponse;
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
          Object.entries(headers ?? {}).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value as string)
          );
        },
      },
    }
  );

  let user = null;
  let authError: { code?: string; status?: number } | null = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
    authError = result.error;
  } catch {
    // A public request should still render when Auth is temporarily unavailable.
    authError = { status: 0 };
  }

  const invalidRefreshToken =
    authError?.code === "refresh_token_not_found" ||
    authError?.code === "invalid_refresh_token" ||
    authError?.status === 400;
  if (invalidRefreshToken) {
    clearInvalidAuthCookies(request, supabaseResponse);
  }

  if (!user && isProtectedPath && !isBotApi) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    const response = NextResponse.redirect(url);
    if (invalidRefreshToken) clearInvalidAuthCookies(request, response);
    const returnCookie = authReturnCookie(
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
      request.nextUrl.protocol === "https:",
    );
    response.cookies.set(returnCookie.name, returnCookie.value, returnCookie.options);
    return response;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
