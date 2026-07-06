// Prints SQL for resource organization schema. Paste into Supabase SQL editor.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sqlPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../supabase/resource-organization.sql"
);
console.log(readFileSync(sqlPath, "utf8"));
