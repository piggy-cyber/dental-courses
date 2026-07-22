import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const requireMedia = process.argv.includes("--require-media");
const datasetVersion = "omar-d3-source-edition-v1";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !secretKey || secretKey === "YOUR-SERVICE-ROLE-KEY") throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY before validating the D3 source edition.");
const supabase = createClient(supabaseUrl, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function rows(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data ?? [];
}

async function countIn(table, sourceIds, filter) {
  let total = 0;
  for (let index = 0; index < sourceIds.length; index += 100) {
    let query = supabase.from(table).select("id", { count: "exact", head: true }).in("source_id", sourceIds.slice(index, index + 100));
    if (filter) query = filter(query);
    const { count, error } = await query;
    if (error) throw new Error(`Could not count ${table}: ${error.message}`);
    total += count ?? 0;
  }
  return total;
}

const d3Courses = await rows(supabase.from("practice_course_catalog").select("course_code").eq("academic_year", "D3"), "D3 course catalog");
assert.equal(d3Courses.length, 5, "Expected five D3 Living Atlas course pages.");
const imports = await rows(supabase.from("practice_source_imports").select("source_id, content_sha256").eq("dataset_version", datasetVersion), "D3 source imports");
assert.equal(imports.length, 22, "Expected 22 immutable D3 source imports.");
assert.ok(imports.every((entry) => /^[a-f0-9]{64}$/.test(entry.content_sha256)), "Every D3 source must retain a SHA-256 fingerprint.");
const sourceIds = imports.map((entry) => entry.source_id);
const [courseSources, banks] = await Promise.all([
  rows(supabase.from("practice_course_sources").select("source_id, status").in("source_id", sourceIds), "D3 course-source links"),
  rows(supabase.from("practice_banks").select("source_id, bank_kind, provenance, status").in("source_id", sourceIds), "D3 recall banks"),
]);
assert.equal(courseSources.length, 22, "Expected one course-source link per D3 source set.");
assert.ok(courseSources.every((entry) => entry.status === "released"), "D3 source sets must be released for founder Recall Practice.");
assert.equal(banks.length, 22, "Expected one Recall Practice bank per D3 source set.");
assert.ok(banks.every((bank) => bank.bank_kind === "recall_practice" && bank.provenance === "source_derived" && bank.status === "published"), "D3 banks must remain published source-derived Recall Practice.");
const sourceCardCount = await countIn("practice_questions", sourceIds);
assert.equal(sourceCardCount, 1203, "Expected 1,203 immutable D3 source cards.");
const imageCardCount = await countIn("practice_questions", sourceIds, (query) => query.not("source_image_url", "is", null));
assert.equal(imageCardCount, 77, "Expected 77 D3 image-bearing source cards.");
const cachedImageCardCount = requireMedia ? await countIn("practice_questions", sourceIds, (query) => query.not("image_storage_path", "is", null)) : null;
if (requireMedia) assert.equal(cachedImageCardCount, 77, "Every D3 source image must have a private storage path.");
console.log(JSON.stringify({ status: "valid", d3Courses: d3Courses.length, sourceSets: imports.length, recallBanks: banks.length, sourceCards: sourceCardCount, imageCards: imageCardCount, cachedImageCards: cachedImageCardCount }, null, 2));
