import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

// D3 Quizlet images are hash-checked locally, stored privately, and registered
// through a service-only function. The browser never receives the source URL.

const scriptDirectory = resolve(fileURLToPath(new URL(".", import.meta.url)));
const webappRoot = resolve(scriptDirectory, "..");
const foundryRoot = process.env.ASSESSMENT_FOUNDRY_ROOT
  ? resolve(process.env.ASSESSMENT_FOUNDRY_ROOT)
  : resolve(webappRoot, "../../../../../Projects/fourth-canal-assessment-foundry");
const sourceRoot = process.env.OMAR_D3_SOURCE_ROOT
  ? resolve(process.env.OMAR_D3_SOURCE_ROOT)
  : join(foundryRoot, "00 Source Library/D3 Canonical Flashcards");
const mediaRoot = process.env.OMAR_D3_MEDIA_ROOT
  ? resolve(process.env.OMAR_D3_MEDIA_ROOT)
  : "/Users/rickahn/Downloads/Fourth Canal Quizlet Library/D3";
const bucket = "living-atlas-review-assets";
const datasetVersion = "omar-d3-source-edition-v1";
const shouldCommit = process.argv.includes("--commit");
const concurrency = 4;
const batchSize = 500;

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const chunks = (values, size) => Array.from({ length: Math.ceil(values.length / size) }, (_, index) => values.slice(index * size, (index + 1) * size));
const json = async (path) => JSON.parse(await readFile(path, "utf8"));
function mimeType(path) {
  const extension = extname(path).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  if (extension === ".gif") return "image/gif";
  throw new Error(`Unsupported cached source-image type: ${path}`);
}

async function walk(directory, results = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path, results);
    else if (entry.name.endsWith(".extracted.json")) results.push(path);
  }
  return results;
}

async function loadSets() {
  const sets = [];
  for (const entry of await readdir(sourceRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const catalog = await json(join(sourceRoot, entry.name, "folder.catalog.json"));
    for (const set of catalog.sets ?? []) sets.push({ set, capture: await json(join(sourceRoot, entry.name, set.sourceManifest)) });
  }
  if (sets.length !== 22) throw new Error(`Expected 22 D3 source sets; found ${sets.length}.`);
  return sets;
}

async function mediaDirectories() {
  const byExternalId = new Map();
  for (const extractedPath of await walk(mediaRoot)) {
    const extracted = await json(extractedPath);
    const externalId = String(extracted.source?.externalId ?? "");
    if (!externalId || byExternalId.has(externalId)) throw new Error(`D3 local-media identity is invalid for ${extractedPath}.`);
    byExternalId.set(externalId, dirname(extractedPath));
  }
  if (byExternalId.size !== 22) throw new Error(`Expected 22 local D3 media directories; found ${byExternalId.size}.`);
  return byExternalId;
}

async function makePlan() {
  const [sets, directories] = await Promise.all([loadSets(), mediaDirectories()]);
  const assets = new Map();
  const references = [];
  for (const { set, capture } of sets) {
    const externalId = String(set.externalId);
    const directory = directories.get(externalId);
    if (!directory) throw new Error(`Local D3 media is missing for ${capture.source.title}.`);
    const auditByCard = new Map((await json(join(directory, "image-audit.json"))).map((entry) => [entry.cardNumber, entry]));
    for (const card of capture.cards) {
      if (!card.sourceImageUrl) continue;
      const image = auditByCard.get(card.order);
      if (!image || image.sourceImageUrl !== card.sourceImageUrl || !image.embeddedFilename || !image.embeddedSha256) throw new Error(`${capture.source.title} card ${card.order} has incomplete image evidence.`);
      const filePath = join(directory, "images", image.embeddedFilename);
      const bytes = await readFile(filePath);
      const hash = sha256(bytes);
      if (hash !== image.embeddedSha256) throw new Error(`${capture.source.title} card ${card.order} failed its image hash check.`);
      const id = `media:${hash}`;
      if (!assets.has(id)) {
        const extension = extname(image.embeddedFilename).toLowerCase();
        assets.set(id, { id, sha256: hash, sourceUrl: card.sourceImageUrl, filePath, extension, mimeType: mimeType(filePath), byteSize: (await stat(filePath)).size, storagePath: `omar-d3/${hash.slice(0, 2)}/${hash}${extension}` });
      }
      references.push({ externalId, sourceOrder: card.order, sourceUrl: card.sourceImageUrl, assetId: id });
    }
  }
  if (references.length !== 77 || assets.size !== 74) throw new Error(`D3 media baseline failed: ${references.length} references and ${assets.size} distinct assets.`);
  return { assets: [...assets.values()], references };
}

async function pooled(items, worker) {
  let cursor = 0;
  return Promise.all(Array.from({ length: concurrency }, async () => {
    const output = [];
    while (cursor < items.length) output.push(await worker(items[cursor++]));
    return output;
  })).then((groups) => groups.flat());
}

async function rowsIn(client, table, columns, ids) {
  const rows = [];
  for (const values of chunks(ids, 100)) {
    const { data, error } = await client.from(table).select(columns).in("id", values);
    if (error) throw new Error(`Could not inspect ${table}: ${error.message}`);
    rows.push(...(data ?? []));
  }
  return new Map(rows.map((row) => [row.id, row]));
}

const plan = await makePlan();
const totalBytes = plan.assets.reduce((sum, asset) => sum + asset.byteSize, 0);
if (!shouldCommit) {
  console.log(JSON.stringify({ status: "dry_run", sourceRoot, mediaRoot, imageReferences: plan.references.length, distinctAssets: plan.assets.length, bytes: totalBytes }, null, 2));
  process.exit(0);
}
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !secretKey || secretKey === "YOUR-SERVICE-ROLE-KEY") throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY before caching D3 source images.");
const supabase = createClient(supabaseUrl, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
const [existingAssets, frozenSources] = await Promise.all([
  rowsIn(supabase, "practice_media_assets", "id, storage_bucket, storage_path, cache_status", plan.assets.map((asset) => asset.id)),
  supabase.from("practice_source_imports").select("source_id, practice_sources!inner(external_id)").eq("dataset_version", datasetVersion),
]);
if (frozenSources.error) throw new Error(`Could not resolve frozen D3 source identities: ${frozenSources.error.message}`);
const sourceIdByExternalId = new Map((frozenSources.data ?? []).map((row) => [String((Array.isArray(row.practice_sources) ? row.practice_sources[0] : row.practice_sources)?.external_id), row.source_id]));
if (sourceIdByExternalId.size !== 22) throw new Error(`Expected 22 frozen D3 source identities; found ${sourceIdByExternalId.size}.`);

let uploaded = 0;
let reused = 0;
let failed = 0;
const cached = await pooled(plan.assets, async (asset) => {
  const existing = existingAssets.get(asset.id);
  if (existing?.cache_status === "cached" && existing.storage_path) {
    reused += 1;
    return { ...asset, storageBucket: existing.storage_bucket, storagePath: existing.storage_path, cacheStatus: "cached", cacheError: null };
  }
  try {
    const bytes = await readFile(asset.filePath);
    const { error } = await supabase.storage.from(bucket).upload(asset.storagePath, bytes, { contentType: asset.mimeType, cacheControl: "31536000", upsert: false });
    if (error && !/already exists|duplicate/i.test(error.message)) throw error;
    uploaded += 1;
    return { ...asset, storageBucket: bucket, cacheStatus: "cached", cacheError: null };
  } catch (error) {
    failed += 1;
    return { ...asset, storageBucket: bucket, storagePath: null, cacheStatus: "failed", cacheError: error instanceof Error ? error.message.slice(0, 500) : "Unknown media-cache failure" };
  }
});
const cachedById = new Map(cached.map((asset) => [asset.id, asset]));
for (const group of chunks(plan.references, batchSize)) {
  const payload = group.map((reference) => {
    const sourceId = sourceIdByExternalId.get(reference.externalId);
    const asset = cachedById.get(reference.assetId);
    if (!sourceId || !asset) throw new Error(`D3 image registration identity is missing.`);
    return { source_id: sourceId, source_order: reference.sourceOrder, source_url: reference.sourceUrl, storage_bucket: asset.storageBucket, storage_path: asset.storagePath, sha256: asset.sha256, mime_type: asset.mimeType, byte_size: asset.byteSize, cache_status: asset.cacheStatus, cache_error: asset.cacheError };
  });
  const { data, error } = await supabase.rpc("living_atlas_register_source_media", { p_media: payload });
  if (error || data !== payload.length) throw new Error(`Could not register D3 source images: ${error?.message ?? `registered ${data} of ${payload.length}`}`);
}
console.log(JSON.stringify({ status: failed ? "completed_with_failures" : "cached", imageReferences: plan.references.length, distinctAssets: plan.assets.length, uploaded, reused, failed, bytes: totalBytes }, null, 2));
if (failed) process.exitCode = 1;
