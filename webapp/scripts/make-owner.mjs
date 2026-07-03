// Promotes an account to owner (and approves it).
// Sign in on the site once first, then run:
//   node scripts/make-owner.mjs you@gmail.com
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./lib/data.mjs";

const webappRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnv(webappRoot);

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/make-owner.mjs you@gmail.com");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const { data, error } = await supabase
  .from("profiles")
  .update({ role: "owner", status: "approved", approved_at: new Date().toISOString() })
  .eq("email", email)
  .select("email");

if (error) {
  console.error(error.message);
  process.exit(1);
}
if (!data?.length) {
  console.error(
    `No account found for ${email}. Sign in on the website once, then run this again.`
  );
  process.exit(1);
}
console.log(`${email} is now the owner with full access.`);
