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

function parseBoolean(value) {
  return ["true", "1", "yes", "y", "allowed"].includes(value.trim().toLowerCase());
}

function graduationYearFromRecord(record) {
  const direct = Number(record.graduation_year);
  if (Number.isInteger(direct) && direct >= 2000 && direct <= 2200) return direct;

  const legacy = record.cohort?.trim().toLowerCase().match(/^d([1-4])-(\d{4})$/);
  if (!legacy) return null;
  return Number(legacy[2]) + (5 - Number(legacy[1]));
}

const records = csvRecords(readFileSync(inputPath, "utf8"));
let inserted = 0;
let updated = 0;

for (const record of records) {
  const fullName = record.full_name?.trim();
  const graduationYear = graduationYearFromRecord(record);
  const email = normalizeEmail(record.email ?? "");
  const status = record.status?.trim() || "expected";
  const accessApproved = parseBoolean(record.access_approved ?? "");

  if (!fullName || !graduationYear) {
    console.warn(`Skipping row without full_name or graduation_year: ${JSON.stringify(record)}`);
    continue;
  }

  let query = supabase.from("student_roster").select("id").limit(2);
  query = email
    ? query.ilike("email", email)
    : query.ilike("full_name", fullName).eq("graduation_year", graduationYear);

  const { data: existing, error: selectError } = await query;
  if (selectError) throw new Error(selectError.message);
  if ((existing?.length ?? 0) > 1) {
    throw new Error(`Ambiguous roster name in Class of ${graduationYear}: ${fullName}`);
  }

  const payload = {
    full_name: fullName,
    email,
    cohort: `class-${graduationYear}`,
    graduation_year: graduationYear,
    status,
    access_approved: accessApproved,
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
