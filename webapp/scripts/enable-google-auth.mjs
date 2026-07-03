// Enables Google OAuth on your Supabase project via the Management API.
//
// 1. Create a personal access token: https://supabase.com/dashboard/account/tokens
// 2. Add to webapp/.env.local:  SUPABASE_ACCESS_TOKEN=sbp_...
// 3. Run:  node scripts/enable-google-auth.mjs
//
// GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must already be in .env.local.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./lib/data.mjs";

const webappRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnv(webappRoot);

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(
  /https:\/\/([^.]+)\.supabase\.co/
)?.[1];
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!token) {
  console.error(
    "Missing SUPABASE_ACCESS_TOKEN in .env.local\n" +
      "Create one at https://supabase.com/dashboard/account/tokens"
  );
  process.exit(1);
}
if (!ref || !clientId || !clientSecret) {
  console.error(
    "Need NEXT_PUBLIC_SUPABASE_URL, GOOGLE_CLIENT_ID, and GOOGLE_CLIENT_SECRET in .env.local"
  );
  process.exit(1);
}

const body = {
  external_google_enabled: true,
  external_google_client_id: clientId,
  external_google_secret: clientSecret,
};

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

const text = await res.text();
if (!res.ok) {
  console.error(`Failed (${res.status}): ${text}`);
  process.exit(1);
}

console.log("Google OAuth enabled on Supabase project:", ref);
console.log("");
console.log("Also confirm in Google Cloud Console (APIs & Services → Credentials):");
console.log("  Authorized redirect URI:");
console.log(`    https://${ref}.supabase.co/auth/v1/callback`);
console.log("");
console.log("Supabase → Auth → URL Configuration should include:");
console.log("  http://localhost:3000");
console.log("  http://localhost:3000/auth/callback");
