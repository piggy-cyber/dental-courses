// Prints SQL for content_events audit table. Paste into Supabase SQL editor.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sqlPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../supabase/content-events.sql"
);
console.log(readFileSync(sqlPath, "utf8"));
