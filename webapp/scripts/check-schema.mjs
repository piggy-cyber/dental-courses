import { loadEnv } from "./lib/data.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const webappRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnv(webappRoot);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const tables = ["profiles", "courses", "lectures", "transcripts", "resources"];
for (const table of tables) {
  const { error } = await supabase.from(table).select("*").limit(0);
  console.log(`${table}: ${error ? error.message : "ok"}`);
}
