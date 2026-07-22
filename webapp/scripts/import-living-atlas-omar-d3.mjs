import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

// This creates immutable Omar source cards and Recall Practice banks only.
// Test Mode remains reserved for independently authored, reviewed MCQs.

const scriptDirectory = resolve(fileURLToPath(new URL(".", import.meta.url)));
const webappRoot = resolve(scriptDirectory, "..");
const foundryRoot = process.env.ASSESSMENT_FOUNDRY_ROOT
  ? resolve(process.env.ASSESSMENT_FOUNDRY_ROOT)
  : resolve(webappRoot, "../../../../../Projects/fourth-canal-assessment-foundry");
const sourceRoot = process.env.OMAR_D3_SOURCE_ROOT
  ? resolve(process.env.OMAR_D3_SOURCE_ROOT)
  : join(foundryRoot, "00 Source Library/D3 Canonical Flashcards");
const shouldCommit = process.argv.includes("--commit");
const datasetVersion = "omar-d3-source-edition-v1";
const pageSize = 250;

const courses = {
  "clinical-pharmacology": { code: "DSRE 335", slug: "d3-summer-dsre-335-clinical-pharmacology" },
  "dental-materials-ii": { code: "REHE 358", slug: "d3-summer-rehe-358-dental-materials-ii" },
  "dentofacial-morphology": { code: "HEWB 349", slug: "d3-summer-hewb-349-dentofacial-morphology" },
  "management-of-medical-emergencies": { code: "DSPR 333", slug: "d3-summer-dspr-333-management-medical-emergencies" },
  "tmd-and-occlusion": { code: "DSRE 396", slug: "d3-summer-dsre-396-temporomandibular-disorders-occlusion" },
};

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const chunk = (values, size) => Array.from({ length: Math.ceil(values.length / size) }, (_, index) => values.slice(index * size, (index + 1) * size));
const json = async (path) => JSON.parse(await readFile(path, "utf8"));
const imagePlacement = (value) => value === "question" ? "prompt" : value === "answer" ? "answer" : null;
const slugify = (value) => String(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 96) || "source-set";

async function loadSourceEdition() {
  const folders = (await readdir(sourceRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  if (JSON.stringify(folders) !== JSON.stringify(Object.keys(courses).sort())) throw new Error(`D3 source folders do not match the approved course mapping.`);
  const banks = [];
  for (const folder of folders) {
    const course = courses[folder];
    const catalogPath = join(sourceRoot, folder, "folder.catalog.json");
    const catalog = await json(catalogPath);
    if (catalog.curriculum?.academicYear !== "D3" || !catalog.curriculum?.courseCodes?.includes(course.code)) throw new Error(`${folder} has an invalid D3 curriculum mapping.`);
    for (let index = 0; index < (catalog.sets ?? []).length; index += 1) {
      const set = catalog.sets[index];
      if (set.mirrorStatus !== "captured" || !set.sourceManifest) throw new Error(`${folder} · ${set.title} is not captured.`);
      const sourcePath = join(sourceRoot, folder, set.sourceManifest);
      const capture = await json(sourcePath);
      const cards = capture.cards;
      if (!Array.isArray(cards) || cards.length !== set.termCount || String(capture.source?.externalId) !== String(set.externalId)) throw new Error(`${folder} · ${set.title} has invalid immutable source data.`);
      for (const [cardIndex, card] of cards.entries()) {
        if (!Number.isInteger(card.order) || card.order !== cardIndex + 1 || typeof card.originalQuestion !== "string" || typeof card.originalAnswer !== "string") throw new Error(`${folder} · ${set.title} card ${cardIndex + 1} is invalid.`);
      }
      const sourceId = `quizlet-${set.externalId}`;
      banks.push({
        folder,
        course,
        setIndex: index + 1,
        sourceId,
        bankId: `living-atlas-${course.code.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/g, "")}-${set.externalId}-${slugify(set.title)}`,
        sourcePath,
        capture,
        cards,
        contentSha256: sha256(JSON.stringify({ source: capture.source, cards })),
      });
    }
  }
  return banks;
}

async function rowsIn(client, table, columns, field, values) {
  const rows = [];
  for (const valuesChunk of chunk(values, 100)) {
    const { data, error } = await client.from(table).select(columns).in(field, valuesChunk);
    if (error) throw new Error(`Could not load ${table}: ${error.message}`);
    rows.push(...(data ?? []));
  }
  return rows;
}

async function upsert(client, table, rows, onConflict) {
  for (const rowsChunk of chunk(rows, pageSize)) {
    const { error } = await client.from(table).upsert(rowsChunk, { onConflict });
    if (error) throw new Error(`Could not write ${table}: ${error.message}`);
  }
}

const banks = await loadSourceEdition();
const totals = {
  courses: new Set(banks.map((bank) => bank.course.code)).size,
  banks: banks.length,
  cards: banks.reduce((count, bank) => count + bank.cards.length, 0),
  imageCards: banks.reduce((count, bank) => count + bank.cards.filter((card) => card.sourceImageUrl).length, 0),
};
if (totals.courses !== 5 || totals.banks !== 22 || totals.cards !== 1203 || totals.imageCards !== 77) throw new Error(`D3 source baseline failed: ${JSON.stringify(totals)}`);
if (!shouldCommit) {
  console.log(JSON.stringify({ status: "dry_run", sourceRoot, ...totals }, null, 2));
  process.exit(0);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !secretKey || secretKey === "YOUR-SERVICE-ROLE-KEY") throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY before importing the D3 source edition.");
const supabase = createClient(supabaseUrl, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
const sourceIds = banks.flatMap((bank) => [bank.sourceId, `omar-d3-${bank.sourceId}`]);
const [catalogRows, sourceRows, importRows] = await Promise.all([
  rowsIn(supabase, "practice_course_catalog", "course_code, slug", "course_code", Object.values(courses).map((course) => course.code)),
  rowsIn(supabase, "practice_sources", "id, external_id, deck, source_card_count", "id", sourceIds),
  rowsIn(supabase, "practice_source_imports", "source_id, content_sha256", "source_id", sourceIds),
]);
const catalogByCode = new Map(catalogRows.map((row) => [row.course_code, row]));
for (const course of Object.values(courses)) if (catalogByCode.get(course.code)?.slug !== course.slug) throw new Error(`D3 catalog is missing or mismatched for ${course.code}. Apply the D3 catalog migration first.`);
const sourcesById = new Map(sourceRows.map((row) => [row.id, row]));
const importedHashBySource = new Map(importRows.map((row) => [row.source_id, row.content_sha256]));
let versionedIdentities = 0;

for (const bank of banks) {
  if (importedHashBySource.get(bank.sourceId) === bank.contentSha256) continue;
  const existing = sourcesById.get(bank.sourceId);
  if (existing) {
    const { data: existingCards, error } = await supabase.from("practice_questions").select("source_order, original_question, original_answer, source_image_url, image_placement").eq("source_id", bank.sourceId).order("source_order");
    if (error) throw new Error(`Could not verify existing ${bank.capture.source.title}: ${error.message}`);
    const existingHash = sha256(JSON.stringify((existingCards ?? []).map((card) => ({ order: card.source_order, originalQuestion: card.original_question, originalAnswer: card.original_answer, sourceImageUrl: card.source_image_url, imagePlacement: card.image_placement }))));
    const frozenHash = sha256(JSON.stringify(bank.cards.map((card) => ({ order: card.order, originalQuestion: card.originalQuestion, originalAnswer: card.originalAnswer, sourceImageUrl: card.sourceImageUrl || null, imagePlacement: imagePlacement(card.imagePlacement) }))));
    const metadataMatches = String(existing.external_id) === String(bank.capture.source.externalId) && existing.deck === bank.capture.source.title && Number(existing.source_card_count) === bank.cards.length;
    if (!metadataMatches || existingHash !== frozenHash) {
      bank.sourceId = `omar-d3-${bank.sourceId}`;
      versionedIdentities += 1;
    }
  }
  const frozenImportHash = importedHashBySource.get(bank.sourceId);
  if (frozenImportHash && frozenImportHash !== bank.contentSha256) throw new Error(`${bank.capture.source.title} conflicts with an existing frozen D3 source edition.`);
}

for (const bank of banks) {
  if (importedHashBySource.get(bank.sourceId) === bank.contentSha256) continue;
  const source = bank.capture.source;
  const { error: sourceError } = await supabase.from("practice_sources").upsert({
    id: bank.sourceId, edition: "omar", platform: "quizlet", external_id: String(source.externalId), author: "omar_mifalani", folder: source.folder, deck: source.title,
    source_url: source.url, folder_url: source.folderUrl, captured_at: source.capturedAt, source_card_count: bank.cards.length,
  }, { onConflict: "id" });
  if (sourceError) throw new Error(`Could not preserve ${source.title}: ${sourceError.message}`);
  await upsert(supabase, "practice_questions", bank.cards.map((card) => ({
    source_id: bank.sourceId, source_order: card.order, original_question: card.originalQuestion, original_answer: card.originalAnswer,
    source_image_url: card.sourceImageUrl || null, image_placement: imagePlacement(card.imagePlacement),
  })), "source_id,source_order");
  const { error: bankError } = await supabase.from("practice_banks").upsert({
    id: bank.bankId, source_id: bank.sourceId, course_code: bank.course.code, course_slug: bank.course.slug, title: source.title,
    description: "Omar source edition · Recall Practice only. This deck is not a reviewed exam-question bank.", default_mode: "tutor", status: "published",
    source_card_count: bank.cards.length, question_count: bank.cards.length, bank_kind: "recall_practice", provenance: "source_derived", content_contract_version: "omar-source-edition-v1",
  }, { onConflict: "id" });
  if (bankError) throw new Error(`Could not create Recall Practice bank for ${source.title}: ${bankError.message}`);
  await upsert(supabase, "practice_bank_sources", [{ bank_id: bank.bankId, source_id: bank.sourceId, source_role: "included" }], "bank_id,source_id");
  await upsert(supabase, "practice_course_sources", [{ course_code: bank.course.code, source_id: bank.sourceId, status: "released", sort_order: bank.setIndex }], "course_code,source_id");
  await upsert(supabase, "practice_source_imports", [{ source_id: bank.sourceId, dataset_version: datasetVersion, content_sha256: bank.contentSha256, source_path: bank.sourcePath }], "source_id");
}

console.log(JSON.stringify({ status: "imported", versionedIdentities, sourceRoot, ...totals }, null, 2));
