import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const requireMedia = process.argv.includes("--require-media");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !secretKey || secretKey === "YOUR-SERVICE-ROLE-KEY") {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY before validating the D2 source edition.");
}
const supabase = createClient(supabaseUrl, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function rows(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data ?? [];
}

async function countIn(table, field, values, filters = []) {
  let total = 0;
  for (let index = 0; index < values.length; index += 100) {
    let query = supabase.from(table).select("id", { count: "exact", head: true }).in(field, values.slice(index, index + 100));
    for (const filter of filters) query = filter(query);
    const { count, error } = await query;
    if (error) throw new Error(`Could not count ${table}: ${error.message}`);
    total += count ?? 0;
  }
  return total;
}

const d2Courses = await rows(
  supabase.from("practice_course_catalog").select("course_code, slug, academic_year, term").eq("academic_year", "D2"),
  "D2 course catalog",
);
assert.equal(d2Courses.length, 17, "Expected 17 D2 Living Atlas course pages.");

const aliases = await rows(
  supabase.from("practice_course_aliases").select("course_code, related_course_code, relationship"),
  "D2 course aliases",
);
assert.equal(aliases.filter((alias) => alias.relationship === "paired_lab").length, 4, "Expected four paired lecture/lab aliases.");

const imports = await rows(
  supabase.from("practice_source_imports").select("source_id, dataset_version, content_sha256").eq("dataset_version", "omar-d2-source-edition-v1"),
  "D2 source imports",
);
assert.equal(imports.length, 168, "Expected 168 immutable D2 source imports.");
assert.ok(imports.every((entry) => /^[a-f0-9]{64}$/.test(entry.content_sha256)), "Every D2 source must retain a SHA-256 fingerprint.");
const sourceIds = imports.map((entry) => entry.source_id);

const [courseSources, banks] = await Promise.all([
  rows(supabase.from("practice_course_sources").select("course_code, source_id, status").in("source_id", sourceIds), "D2 course-source links"),
  rows(supabase.from("practice_banks").select("id, source_id, course_code, bank_kind, provenance, status, source_card_count, question_count").in("source_id", sourceIds), "D2 recall banks"),
]);
assert.equal(courseSources.length, 168, "Expected one course-source link per D2 source set.");
assert.ok(courseSources.every((entry) => entry.status === "released"), "D2 source sets must be released for founder Recall Practice.");
assert.equal(banks.length, 168, "Expected one Recall Practice bank per D2 source set.");
assert.ok(banks.every((bank) => bank.bank_kind === "recall_practice" && bank.provenance === "source_derived" && bank.status === "published"), "D2 banks must remain published source-derived Recall Practice.");

const sourceCardCount = await countIn("practice_questions", "source_id", sourceIds);
assert.equal(sourceCardCount, 12900, "Expected 12,900 immutable D2 source cards.");
const imageCardCount = await countIn("practice_questions", "source_id", sourceIds, [(query) => query.not("source_image_url", "is", null)]);
assert.equal(imageCardCount, 5255, "Expected 5,255 D2 image-bearing source cards.");

let cachedImageCardCount = null;
if (requireMedia) {
  cachedImageCardCount = await countIn("practice_questions", "source_id", sourceIds, [(query) => query.not("image_storage_path", "is", null)]);
  assert.equal(cachedImageCardCount, 5255, "Every D2 source image must have a private storage path.");
}

console.log(JSON.stringify({
  status: "valid",
  d2Courses: d2Courses.length,
  aliases: aliases.length,
  sourceSets: imports.length,
  recallBanks: banks.length,
  sourceCards: sourceCardCount,
  imageCards: imageCardCount,
  cachedImageCards: cachedImageCardCount,
}, null, 2));
