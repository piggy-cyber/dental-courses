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

// Refreshes the Supabase session cookie and keeps the private workspace private.
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtectedPath = protectedPathPrefixes.some((prefix) =>
    matchesPathPrefix(path, prefix)
  );
  // Bot uploads authenticate with a Bearer API key inside the route handler,
  // not a session cookie, so let them through to be authorized there.
  const isBotApi = path.startsWith("/api/admin/course-resource");

  if (!user && isProtectedPath && !isBotApi) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    const response = NextResponse.redirect(url);
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
