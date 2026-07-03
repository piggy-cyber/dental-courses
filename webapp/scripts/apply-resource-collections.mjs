// Applies supabase/resource-collections.sql
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
const dbUrl = process.env.SUPABASE_DB_URL;
const ref = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(
  /https:\/\/([^.]+)\.supabase\.co/
)?.[1];

if (!dbUrl && (!password || !ref)) {
  console.error("Add SUPABASE_DB_PASSWORD or SUPABASE_DB_URL to webapp/.env.local");
  process.exit(1);
}

const poolerHost = process.env.SUPABASE_POOLER_HOST ?? "aws-1-ca-central-1.pooler.supabase.com";
const poolerPort = process.env.SUPABASE_POOLER_PORT ?? "6543";

const client = new pg.Client({
  connectionString:
    dbUrl ??
    `postgresql://postgres.${ref}:${encodeURIComponent(password)}@${poolerHost}:${poolerPort}/postgres`,
  ssl: { rejectUnauthorized: false },
});

const sql = readFileSync(path.join(webappRoot, "supabase", "resource-collections.sql"), "utf8");

await client.connect();
try {
  await client.query(sql);
  console.log("Resource collection migration applied.");
} catch (error) {
  console.error(error.message);
  process.exit(1);
} finally {
  await client.end();
}
