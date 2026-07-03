import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./lib/data.mjs";

const webappRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(webappRoot, "..");
loadEnv(webappRoot);

const args = process.argv.slice(2);
const fileArgIndex = args.indexOf("--file");
const inputPath =
  fileArgIndex >= 0 && args[fileArgIndex + 1]
    ? path.resolve(args[fileArgIndex + 1])
    : path.join(repoRoot, "private-staging", "roster.csv");

if (!existsSync(inputPath)) {
  console.error(`Roster CSV not found: ${inputPath}`);
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY to webapp/.env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted && char === '"' && next === '"') {
      value += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (!quoted && char === ",") {
      row.push(value);
      value = "";
      continue;
    }

    if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  row.push(value);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows;
}

function csvRecords(text) {
  const rows = parseCsv(text);
  const headers = rows.shift()?.map((header) => header.trim()) ?? [];
  return rows.map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index]?.trim() ?? ""]))
  );
}

function normalizeEmail(value) {
  const email = value.trim().toLowerCase();
  return email || null;
}

const records = csvRecords(readFileSync(inputPath, "utf8"));
let inserted = 0;
let updated = 0;

for (const record of records) {
  const fullName = record.full_name?.trim();
  const cohort = record.cohort?.trim().toLowerCase();
  const email = normalizeEmail(record.email ?? "");
  const status = record.status?.trim() || "expected";

  if (!fullName || !cohort) {
    console.warn(`Skipping row without full_name or cohort: ${JSON.stringify(record)}`);
    continue;
  }

  let query = supabase.from("student_roster").select("id").limit(1);
  query = email
    ? query.ilike("email", email)
    : query.eq("full_name", fullName).eq("cohort", cohort).is("email", null);

  const { data: existing, error: selectError } = await query;
  if (selectError) throw new Error(selectError.message);

  const payload = {
    full_name: fullName,
    email,
    cohort,
    status,
  };

  if (existing?.[0]?.id) {
    const { error } = await supabase
      .from("student_roster")
      .update(payload)
      .eq("id", existing[0].id);
    if (error) throw new Error(error.message);
    updated += 1;
  } else {
    const { error } = await supabase.from("student_roster").insert(payload);
    if (error) throw new Error(error.message);
    inserted += 1;
  }
}

console.log(`Roster import complete. Inserted: ${inserted}. Updated: ${updated}.`);
