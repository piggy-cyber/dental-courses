// Runs schema.sql against your Supabase Postgres database.
// Needs SUPABASE_DB_PASSWORD in webapp/.env.local (Supabase → Settings → Database).
import { readFileSync } from "node:fs";
import dns from "node:dns";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { loadEnv } from "./lib/data.mjs";

dns.setDefaultResultOrder("ipv4first");

const webappRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnv(webappRoot);

const password = process.env.SUPABASE_DB_PASSWORD;
const ref = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(
  /https:\/\/([^.]+)\.supabase\.co/
)?.[1];

if (!password || !ref) {
  console.error(
    "Add SUPABASE_DB_PASSWORD to webapp/.env.local (Supabase → Settings → Database → password)."
  );
  process.exit(1);
}

const client = new pg.Client({
  connectionString: `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
  ssl: { rejectUnauthorized: false },
});

const sql = readFileSync(path.join(webappRoot, "supabase", "schema.sql"), "utf8");

await client.connect();
try {
  await client.query(sql);
  console.log("Schema applied successfully.");
} finally {
  await client.end();
}
