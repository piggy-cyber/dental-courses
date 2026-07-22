import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const localEnvironment = await readFile(resolve(process.cwd(), ".env.local"), "utf8");
for (const line of localEnvironment.split(/\r?\n/)) {
  const separator = line.indexOf("=");
  if (separator <= 0 || line.startsWith("#")) continue;
  const key = line.slice(0, separator).trim();
  const value = line.slice(separator + 1).trim().replace(/^"|"$/g, "");
  if (key && !process.env[key]) process.env[key] = value;
}

const expectedVariantPrefix = "la-omar-da-l1-";
const expectedImageRecords = 25;
const bucket = "living-atlas-review-assets";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY before validating private Living Atlas images.");
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase
  .from("practice_source_media")
  .select("variant_id, storage_bucket, storage_path, sha256, mime_type, byte_size, cache_status, cache_error")
  .like("variant_id", `${expectedVariantPrefix}%`)
  .order("variant_id");

if (error) throw new Error(`Could not read Living Atlas private media: ${error.message}`);
const rows = data ?? [];
assert.equal(rows.length, expectedImageRecords, "Lecture 1 must retain 25 registered source-image records");
assert.equal(new Set(rows.map((row) => row.variant_id)).size, expectedImageRecords, "Each image record must have one stable question ID");

const cached = rows.filter((row) => row.cache_status === "cached");
const unavailable = rows.filter((row) => row.cache_status !== "cached");
assert.equal(cached.length + unavailable.length, expectedImageRecords);

for (const row of cached) {
  assert.equal(row.storage_bucket, bucket, `${row.variant_id} must use the private review bucket`);
  assert.ok(row.storage_path, `${row.variant_id} must have a private storage path`);
  assert.ok(row.sha256, `${row.variant_id} must retain a source hash`);
  assert.match(row.mime_type ?? "", /^image\//, `${row.variant_id} must retain an image MIME type`);
  assert.ok(Number(row.byte_size) > 0, `${row.variant_id} must retain an image byte size`);
  const { data: signed, error: signError } = await supabase.storage.from(bucket).createSignedUrl(row.storage_path, 60);
  assert.ok(!signError && signed?.signedUrl, `${row.variant_id} must be retrievable through a private signed URL`);
}

for (const row of unavailable) {
  assert.ok(row.cache_error, `${row.variant_id} must explain why the learner fallback is shown`);
}

const duplicateHashes = new Map();
for (const row of cached) {
  const paths = duplicateHashes.get(row.sha256) ?? new Set();
  paths.add(row.storage_path);
  duplicateHashes.set(row.sha256, paths);
}
for (const [hash, paths] of duplicateHashes) {
  assert.equal(paths.size, 1, `Hash ${hash} must map to one deduplicated private asset path`);
}

console.log(JSON.stringify({
  status: "ok",
  registered: rows.length,
  cached: cached.length,
  unavailable: unavailable.length,
  bucket,
}, null, 2));
