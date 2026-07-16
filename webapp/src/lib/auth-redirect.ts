export const AUTH_RETURN_COOKIE = "fc_auth_return_to";

const DEFAULT_RETURN_PATH = "/";
const RETURN_ORIGIN = "https://return.fourthcanal.invalid";
const MAX_RETURN_PATH_LENGTH = 2_048;
const ALLOWED_RETURN_PREFIXES = [
  "/admin",
  "/contacts",
  "/course",
  "/d1",
  "/games",
  "/grade-calculator",
  "/guides",
  "/home",
  "/library",
  "/owner",
  "/preview-lab",
  "/profile",
  "/resource",
] as const;

type AuthReturnCookie = {
  name: typeof AUTH_RETURN_COOKIE;
  value: string;
  options: {
    httpOnly: true;
    sameSite: "lax";
    secure: boolean;
    path: "/";
    maxAge: number;
  };
};

export function safeReturnPath(
  value: string | null | undefined,
  fallback = DEFAULT_RETURN_PATH,
) {
  if (
    !value ||
    value.length > MAX_RETURN_PATH_LENGTH ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return fallback;
  }

  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("//") || decoded.includes("\\")) return fallback;

    const resolved = new URL(value, RETURN_ORIGIN);
    const allowed = ALLOWED_RETURN_PREFIXES.some(
      (prefix) =>
        resolved.pathname === prefix || resolved.pathname.startsWith(`${prefix}/`),
    );
    if (resolved.origin !== RETURN_ORIGIN || !allowed) {
      return fallback;
    }

    return `${resolved.pathname}${resolved.search}`;
  } catch {
    return fallback;
  }
}

function authCookieOptions(secure: boolean, maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge,
  } as const;
}

export function authReturnCookie(value: string, secure: boolean): AuthReturnCookie {
  return {
    name: AUTH_RETURN_COOKIE,
    value: safeReturnPath(value),
    options: authCookieOptions(secure, 600),
  };
}

export function clearAuthReturnCookie(secure: boolean): AuthReturnCookie {
  return {
    name: AUTH_RETURN_COOKIE,
    value: "",
    options: authCookieOptions(secure, 0),
  };
}

export function authRedirectUrl(requestUrl: string, returnPath: string | null | undefined) {
  const origin = new URL(requestUrl).origin;
  return new URL(safeReturnPath(returnPath), origin);
}
