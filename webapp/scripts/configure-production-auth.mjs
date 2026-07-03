// After Vercel deploy, add your live URL to Supabase auth allow-lists.
//
// Usage:
//   PRODUCTION_URL=https://d1-course-library.vercel.app node scripts/configure-production-auth.mjs
//
// Requires SUPABASE_ACCESS_TOKEN in .env.local (https://supabase.com/dashboard/account/tokens)
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./lib/data.mjs";

const webappRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnv(webappRoot);

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(
  /https:\/\/([^.]+)\.supabase\.co/
)?.[1];
const productionUrl = process.env.PRODUCTION_URL?.replace(/\/$/, "");

if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN in .env.local");
  process.exit(1);
}
if (!ref) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL in .env.local");
  process.exit(1);
}
if (!productionUrl) {
  console.error("Set PRODUCTION_URL to your Vercel deployment, e.g.:");
  console.error("  PRODUCTION_URL=https://d1-course-library.vercel.app node scripts/configure-production-auth.mjs");
  process.exit(1);
}

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  method: "GET",
  headers: { Authorization: `Bearer ${token}` },
});
if (!res.ok) {
  console.error(`Failed to read auth config (${res.status}): ${await res.text()}`);
  process.exit(1);
}

const current = await res.json();
const siteUrl = productionUrl;
const redirectUrls = new Set([
  ...(current.uri_allow_list ?? current.additional_redirect_urls ?? []),
  "http://localhost:3000",
  "http://localhost:3000/auth/callback",
  `${productionUrl}/auth/callback`,
]);

const patch = {
  site_url: siteUrl,
  uri_allow_list: [...redirectUrls],
};

const update = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(patch),
});

const text = await update.text();
if (!update.ok) {
  console.error(`Failed to update auth config (${update.status}): ${text}`);
  process.exit(1);
}

console.log("Supabase auth URLs updated for production:");
console.log(`  Site URL: ${siteUrl}`);
console.log(`  Redirect URLs include: ${productionUrl}/auth/callback`);
console.log("");
console.log("Google Cloud Console should already list:");
console.log(`  https://${ref}.supabase.co/auth/v1/callback`);
