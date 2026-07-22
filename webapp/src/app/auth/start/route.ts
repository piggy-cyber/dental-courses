import { NextResponse, type NextRequest } from "next/server";
import { authReturnCookie, safeReturnPath } from "@/lib/auth-redirect";

export async function POST(request: NextRequest) {
  const body = await request.formData();
  const next = safeReturnPath(typeof body.get("next") === "string" ? String(body.get("next")) : null);
  const wantsJson = request.headers.get("accept")?.includes("application/json");
  const response = wantsJson
    ? NextResponse.json({ ok: true })
    : NextResponse.redirect(new URL("/signin", request.url));
  const cookie = authReturnCookie(next, request.nextUrl.protocol === "https:");
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
