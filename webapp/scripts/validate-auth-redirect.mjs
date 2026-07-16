import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { NextResponse } from "next/server.js";
import ts from "typescript";

const helperPath = fileURLToPath(
  new URL("../src/lib/auth-redirect.ts", import.meta.url),
);
const source = await readFile(helperPath, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const {
  authRedirectUrl,
  authReturnCookie,
  clearAuthReturnCookie,
  safeReturnPath,
} = await import(
  `data:text/javascript;base64,${Buffer.from(transpiled).toString("base64")}`
);

assert.equal(safeReturnPath("/games/tooth-quest"), "/games/tooth-quest");
assert.equal(
  safeReturnPath("/games/root-canal-match?mode=clinical"),
  "/games/root-canal-match?mode=clinical",
);
assert.equal(safeReturnPath("/admin/accounts/123"), "/admin/accounts/123");
assert.equal(safeReturnPath("/games/tooth-quest#answer"), "/games/tooth-quest");
assert.equal(safeReturnPath("https://evil.example/path"), "/home");
assert.equal(safeReturnPath("//evil.example/path"), "/home");
assert.equal(safeReturnPath("/\\\\evil.example/path"), "/home");
assert.equal(safeReturnPath("/%5Cevil.example/path"), "/home");
assert.equal(safeReturnPath("/auth/callback?code=secret"), "/home");
assert.equal(safeReturnPath("/api/admin/course-resource"), "/home");
assert.equal(safeReturnPath("/_next/static/chunk.js"), "/home");
assert.equal(safeReturnPath(`/games/${"x".repeat(2_100)}`), "/home");
assert.equal(safeReturnPath("/"), "/home");
assert.equal(safeReturnPath(null), "/home");

const previewRequest =
  "https://dental-courses-abc-piggy-cybers-projects.vercel.app/auth/callback?code=test";
const returnCookie = authReturnCookie("/games/tooth-quest?mode=speed", true);
const unauthenticatedResponse = NextResponse.redirect(new URL("/", previewRequest));
unauthenticatedResponse.cookies.set(
  returnCookie.name,
  returnCookie.value,
  returnCookie.options,
);
const returnHeader = unauthenticatedResponse.headers.get("set-cookie") ?? "";
assert.equal(unauthenticatedResponse.headers.get("location"), new URL("/", previewRequest).href);
assert.match(returnHeader, /^fc_auth_return_to=%2Fgames%2Ftooth-quest%3Fmode%3Dspeed;/);
assert.match(returnHeader, /HttpOnly/i);
assert.match(returnHeader, /SameSite=Lax/i);
assert.match(returnHeader, /Secure/i);
assert.match(returnHeader, /Path=\//i);
assert.match(returnHeader, /Max-Age=600/i);
assert.doesNotMatch(returnHeader, /Domain=/i);

const successResponse = NextResponse.redirect(
  authRedirectUrl(previewRequest, "/games/tooth-quest?mode=speed"),
);
const clearCookie = clearAuthReturnCookie(true);
successResponse.cookies.set(clearCookie.name, clearCookie.value, clearCookie.options);
const clearHeader = successResponse.headers.get("set-cookie") ?? "";
assert.equal(
  successResponse.headers.get("location"),
  "https://dental-courses-abc-piggy-cybers-projects.vercel.app/games/tooth-quest?mode=speed",
);
assert.match(clearHeader, /^fc_auth_return_to=;/);
assert.match(clearHeader, /Max-Age=0/i);
assert.match(clearHeader, /HttpOnly/i);
assert.match(clearHeader, /SameSite=Lax/i);
assert.match(clearHeader, /Secure/i);
assert.doesNotMatch(clearHeader, /Domain=/i);

assert.equal(
  authRedirectUrl(previewRequest, "//evil.example/path").href,
  "https://dental-courses-abc-piggy-cybers-projects.vercel.app/home",
);

console.log("Validated auth return paths, redirect locations, and cookie response headers.");
