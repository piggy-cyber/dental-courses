import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

// Uploads founder-authorized local D2 media to private Storage. It never
// hotlinks Quizlet; each question receives only a hash-deduplicated private
// storage reference through the server-only media registration RPC.

const scriptDirectory = resolve(fileURLToPath(new URL(".", import.meta.url)));
const webappRoot = resolve(scriptDirectory, "..");
const foundryRoot = process.env.ASSESSMENT_FOUNDRY_ROOT
  ? resolve(process.env.ASSESSMENT_FOUNDRY_ROOT)
  : resolve(webappRoot, "../../../../../Projects/fourth-canal-assessment-foundry");
const sourceRoot = process.env.OMAR_D2_SOURCE_ROOT
  ? resolve(process.env.OMAR_D2_SOURCE_ROOT)
  : join(foundryRoot, "00 Source Library/D2 Canonical Flashcards");
const mediaRoot = process.env.OMAR_D2_MEDIA_ROOT
  ? resolve(process.env.OMAR_D2_MEDIA_ROOT)
  : "/Users/rickahn/Downloads/Fourth Canal Quizlet Library/D2";
const bucket = "living-atlas-review-assets";
const commit = process.argv.includes("--commit");
const concurrency = 4;
const batchSize = 500;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function chunks(values, size) {
  return Array.from({ length: Math.ceil(values.length / size) }, (_, index) => values.slice(index * size, (index + 1) * size));
}

function mimeType(path) {
  switch (extname(path).toLowerCase()) {
    case ".png": return "image/png";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".webp": return "image/webp";
    case ".gif": return "image/gif";
    default: throw new Error(`Unsupported cached source-image type: ${path}`);
  }
}

async function json(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function walk(directory, results = []) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path, results);
    else if (entry.name.endsWith(".extracted.json")) results.push(path);
  }
  return results;
}

async function loadSourceSets() {
  const result = [];
  const folders = (await readdir(sourceRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  for (const folder of folders) {
    const catalog = await json(join(sourceRoot, folder, "folder.catalog.json"));
    for (const set of catalog.sets ?? []) {
      const capture = await json(join(sourceRoot, folder, set.sourceManifest));
      result.push({ folder, set, capture, sourceId: `quizlet-${set.externalId}` });
    }
  }
  if (result.length !== 168) throw new Error(`Expected 168 D2 source sets; found ${result.length}.`);
  return result;
}

async function localMediaDirectories() {
  const extractedPaths = await walk(mediaRoot);
  const byExternalId = new Map();
  for (const extractedPath of extractedPaths) {
    const extracted = await json(extractedPath);
    const externalId = String(extracted.source?.externalId ?? "");
    if (!externalId) throw new Error(`No external ID in ${extractedPath}.`);
    if (byExternalId.has(externalId)) throw new Error(`Duplicate local D2 media directory for Quizlet ${externalId}.`);
    byExternalId.set(externalId, dirname(extractedPath));
  }
  if (byExternalId.size !== 168) throw new Error(`Expected 168 local D2 media directories; found ${byExternalId.size}.`);
  return byExternalId;
}

async function mediaPlan() {
  const [sets, directories] = await Promise.all([loadSourceSets(), localMediaDirectories()]);
  const assets = new Map();
  const references = [];
  for (const sourceSet of sets) {
    const externalId = String(sourceSet.set.externalId);
    const directory = directories.get(externalId);
    if (!directory) throw new Error(`Local D2 media is missing for ${sourceSet.capture.source.title}.`);
    const audit = await json(join(directory, "image-audit.json"));
    const auditByCard = new Map(audit.map((entry) => [entry.cardNumber, entry]));
    for (const card of sourceSet.capture.cards) {
      if (!card.sourceImageUrl) continue;
      const sourceImage = auditByCard.get(card.order);
      if (!sourceImage || sourceImage.sourceImageUrl !== card.sourceImageUrl || !sourceImage.embeddedFilename || !sourceImage.embeddedSha256) {
        throw new Error(`${sourceSet.capture.source.title} card ${card.order} has incomplete local image evidence.`);
      }
      const filePath = join(directory, "images", sourceImage.embeddedFilename);
      const bytes = await readFile(filePath);
      const fileHash = sha256(bytes);
      if (fileHash !== sourceImage.embeddedSha256) throw new Error(`${sourceSet.capture.source.title} card ${card.order} failed its image hash check.`);
      const fileStat = await stat(filePath);
      const assetId = `media:${fileHash}`;
      if (!assets.has(assetId)) {
        const extension = extname(sourceImage.embeddedFilename).toLowerCase();
        assets.set(assetId, {
          id: assetId,
          sha256: fileHash,
          sourceUrl: card.sourceImageUrl,
          filePath,
          extension,
          mimeType: mimeType(filePath),
          byteSize: fileStat.size,
          storagePath: `omar-d2/${fileHash.slice(0, 2)}/${fileHash}${extension}`,
        });
      }
      references.push({
        sourceId: sourceSet.sourceId,
        externalId,
        sourceOrder: card.order,
        sourceUrl: card.sourceImageUrl,
        assetId,
      });
    }
  }
  if (references.length !== 5255 || assets.size !== 4348) {
    throw new Error(`D2 media baseline failed: ${references.length} references and ${assets.size} distinct assets.`);
  }
  return { assets: [...assets.values()], references };
}

async function pooled(items, worker) {
  let cursor = 0;
  const output = [];
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      output[index] = await worker(items[index]);
    }
  }));
  return output;
}

async function existingAssets(client, ids) {
  const rows = [];
  for (const idChunk of chunks(ids, 100)) {
    const { data, error } = await client
      .from("practice_media_assets")
      .select("id, storage_bucket, storage_path, cache_status, mime_type, byte_size")
      .in("id", idChunk);
    if (error) throw new Error(`Could not inspect cached Living Atlas media: ${error.message}`);
    rows.push(...(data ?? []));
  }
  return new Map(rows.map((row) => [row.id, row]));
}

async function existingStoragePaths(client, assets) {
  const paths = new Set();
  const prefixes = [...new Set(assets.map((asset) => dirname(asset.storagePath)))];
  for (const prefix of prefixes) {
    const { data, error } = await client.storage.from(bucket).list(prefix, { limit: 1000 });
    if (error) throw new Error(`Could not inspect private D2 media storage: ${error.message}`);
    for (const object of data ?? []) paths.add(`${prefix}/${object.name}`);
  }
  return paths;
}

const plan = await mediaPlan();
const totalBytes = plan.assets.reduce((sum, asset) => sum + asset.byteSize, 0);
if (!commit) {
  console.log(JSON.stringify({
    status: "dry_run",
    mediaRoot,
    sourceRoot,
    imageReferences: plan.references.length,
    distinctAssets: plan.assets.length,
    bytes: totalBytes,
  }, null, 2));
  process.exit(0);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !secretKey || secretKey === "YOUR-SERVICE-ROLE-KEY") {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY before caching D2 source images.");
}
const supabase = createClient(supabaseUrl, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
const [existing, storedPaths, importedSourcesResult] = await Promise.all([
  existingAssets(supabase, plan.assets.map((asset) => asset.id)),
  existingStoragePaths(supabase, plan.assets),
  supabase
    .from("practice_source_imports")
    .select("source_id, practice_sources!inner(external_id)")
    .eq("dataset_version", "omar-d2-source-edition-v1"),
]);
if (importedSourcesResult.error) throw new Error(`Could not resolve frozen D2 source identities: ${importedSourcesResult.error.message}`);
const sourceIdByExternalId = new Map((importedSourcesResult.data ?? []).map((row) => {
  const source = Array.isArray(row.practice_sources) ? row.practice_sources[0] : row.practice_sources;
  return [String(source?.external_id), row.source_id];
}));
if (sourceIdByExternalId.size !== 168) throw new Error(`Expected 168 frozen D2 source identities; found ${sourceIdByExternalId.size}.`);
const registeredReferences = plan.references.map((reference) => {
  const sourceId = sourceIdByExternalId.get(reference.externalId);
  if (!sourceId) throw new Error(`No frozen D2 source identity is registered for Quizlet ${reference.externalId}.`);
  return { ...reference, sourceId };
});
let uploaded = 0;
let reused = 0;
let failed = 0;

const cachedAssets = await pooled(plan.assets, async (asset) => {
  const prior = existing.get(asset.id);
  if (prior?.cache_status === "cached" && prior.storage_path) {
    reused += 1;
    return { ...asset, storagePath: prior.storage_path, storageBucket: prior.storage_bucket, cacheStatus: "cached", cacheError: null };
  }
  if (storedPaths.has(asset.storagePath)) {
    reused += 1;
    return { ...asset, storageBucket: bucket, cacheStatus: "cached", cacheError: null };
  }
  try {
    const bytes = await readFile(asset.filePath);
    const { error } = await supabase.storage.from(bucket).upload(asset.storagePath, bytes, {
      contentType: asset.mimeType,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error && !/already exists|duplicate/i.test(error.message)) throw error;
    uploaded += 1;
    return { ...asset, storageBucket: bucket, cacheStatus: "cached", cacheError: null };
  } catch (error) {
    failed += 1;
    return { ...asset, storageBucket: bucket, storagePath: null, cacheStatus: "failed", cacheError: error instanceof Error ? error.message.slice(0, 500) : "Unknown media-cache failure" };
  }
});
const byAsset = new Map(cachedAssets.map((asset) => [asset.id, asset]));
for (const referenceChunk of chunks(registeredReferences, batchSize)) {
  const payload = referenceChunk.map((reference) => {
    const asset = byAsset.get(reference.assetId);
    if (!asset) throw new Error(`Cached asset is missing for ${reference.sourceId} card ${reference.sourceOrder}.`);
    return {
      source_id: reference.sourceId,
      source_order: reference.sourceOrder,
      source_url: reference.sourceUrl,
      storage_bucket: asset.storageBucket,
      storage_path: asset.storagePath,
      sha256: asset.sha256,
      mime_type: asset.mimeType,
      byte_size: asset.byteSize,
      cache_status: asset.cacheStatus,
      cache_error: asset.cacheError,
    };
  });
  const { data, error } = await supabase.rpc("living_atlas_register_source_media", { p_media: payload });
  if (error || data !== payload.length) throw new Error(`Could not register D2 source images: ${error?.message ?? `registered ${data} of ${payload.length}`}`);
}

console.log(JSON.stringify({
  status: failed ? "completed_with_failures" : "cached",
  imageReferences: plan.references.length,
  distinctAssets: plan.assets.length,
  uploaded,
  reused,
  failed,
  bytes: totalBytes,
}, null, 2));
if (failed) process.exitCode = 1;
