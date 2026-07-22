import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

// D2 source edition importer. This deliberately creates only immutable Omar
// source cards and Recall Practice banks. Test Mode requires separately
// authored, reviewed Fourth Canal MCQs.

const scriptDirectory = resolve(fileURLToPath(new URL(".", import.meta.url)));
const webappRoot = resolve(scriptDirectory, "..");
const foundryRoot = process.env.ASSESSMENT_FOUNDRY_ROOT
  ? resolve(process.env.ASSESSMENT_FOUNDRY_ROOT)
  : resolve(webappRoot, "../../../../../Projects/fourth-canal-assessment-foundry");
const sourceRoot = process.env.OMAR_D2_SOURCE_ROOT
  ? resolve(process.env.OMAR_D2_SOURCE_ROOT)
  : join(foundryRoot, "00 Source Library/D2 Canonical Flashcards");
const commit = process.argv.includes("--commit");
const pageSize = 250;

const D2_COURSES = {
  "basic-procedures-in-esthetics": { code: "REHE 253", slug: "d2-spring-rehe-253-basic-procedures-esthetics" },
  "basic-procedures-in-fixed-prostho-ii": { code: "REHE 259", slug: "d2-fall-rehe-259-basic-procedures-fixed-prosthodontics-ii" },
  "basic-procedures-in-fixed-prostho-iii": { code: "REHE 260", slug: "d2-spring-rehe-260-basic-procedures-fixed-prosthodontics-iii" },
  "basics-procedures-in-resto-ii": { code: "REHE 262", slug: "d2-fall-rehe-262-basic-procedures-restorative-dentistry-ii" },
  "endocrine-reproductive-system": { code: "HWDP 243", slug: "d2-fall-hwdp-243-endocrine-and-reproductive-systems" },
  endodontics: { code: "REHE 264", slug: "d2-fall-rehe-264-endodontics" },
  "intro-to-med": { code: "INQU 202", slug: "d2-spring-inqu-202-introduction-to-medicine" },
  "musculoskeletal-system": { code: "HWDP 245", slug: "d2-fall-hwdp-245-musculoskeletal-system" },
  neuroscience: { code: "HWDP 246", slug: "d2-fall-hwdp-246-neuroscience" },
  "oral-pathology": { code: "DSPR 234", slug: "d2-spring-dspr-234-oral-and-maxillofacial-pathology" },
  "pain-control": { code: "REHE 252", slug: "d2-spring-rehe-252-pain-control" },
  "partial-denture-design": { code: "REHE 266", slug: "d2-spring-rehe-266-partial-denture-design" },
  periodontics: { code: "DSPR 232", slug: "d2-spring-dspr-232-periodontics" },
  pharmacology: { code: "REHE 254", slug: "d2-spring-rehe-254-pharmacology" },
  "preventative-periodontics": { code: "MAHE 241", slug: "d2-fall-mahe-241-preventive-periodontics" },
  "prostho-tech": { code: "REHE 257", slug: "d2-fall-rehe-257-prosthodontic-technology" },
  "renal-hematology": { code: "HWDP 232", slug: "d2-fall-hwdp-232-renal-and-hematologic-systems" },
};

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function databaseImagePlacement(value) {
  // Quizlet's captured "question" side maps to the runtime's prompt side.
  // The immutable source JSON retains the original vocabulary unchanged.
  return value === "question" ? "prompt" : value === "answer" ? "answer" : null;
}

function slugify(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96) || "source-set";
}

function chunk(values, size) {
  return Array.from({ length: Math.ceil(values.length / size) }, (_, index) => values.slice(index * size, (index + 1) * size));
}

async function loadJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function sourceEdition() {
  const entries = await readdir(sourceRoot, { withFileTypes: true });
  const folders = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  const expectedFolders = Object.keys(D2_COURSES).sort();
  if (JSON.stringify(folders) !== JSON.stringify(expectedFolders)) {
    throw new Error(`D2 source folders do not match the approved course mapping. Found ${folders.length}; expected ${expectedFolders.length}.`);
  }

  const banks = [];
  for (const folder of folders) {
    const course = D2_COURSES[folder];
    const catalogPath = join(sourceRoot, folder, "folder.catalog.json");
    const catalog = await loadJson(catalogPath);
    if (catalog.curriculum?.academicYear !== "D2") throw new Error(`${folder} is not labeled D2.`);
    if (!catalog.curriculum?.courseCodes?.includes(course.code)) throw new Error(`${folder} does not authorize primary course ${course.code}.`);
    if (!Array.isArray(catalog.sets) || !catalog.sets.length) throw new Error(`${folder} has no captured source sets.`);

    for (let index = 0; index < catalog.sets.length; index += 1) {
      const set = catalog.sets[index];
      if (set.mirrorStatus !== "captured" || !set.sourceManifest) throw new Error(`${folder} · ${set.title} is not captured.`);
      const sourcePath = join(sourceRoot, folder, set.sourceManifest);
      const capture = await loadJson(sourcePath);
      const cards = capture.cards;
      if (!Array.isArray(cards) || cards.length !== set.termCount) throw new Error(`${folder} · ${set.title} source-card count does not match its catalog.`);
      if (String(capture.source?.externalId) !== String(set.externalId)) throw new Error(`${folder} · ${set.title} external ID mismatch.`);
      for (const [cardIndex, card] of cards.entries()) {
        if (!Number.isInteger(card.order) || card.order !== cardIndex + 1 || typeof card.originalQuestion !== "string" || typeof card.originalAnswer !== "string") {
          throw new Error(`${folder} · ${set.title} card ${cardIndex + 1} is not a valid immutable source card.`);
        }
      }
      const sourceId = `quizlet-${set.externalId}`;
      const titleSlug = slugify(set.title);
      const bankId = `living-atlas-${course.code.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/g, "")}-${set.externalId}-${titleSlug}`;
      const contentSha256 = sha256(JSON.stringify({ source: capture.source, cards }));
      banks.push({
        course,
        folder,
        setIndex: index + 1,
        sourceId,
        bankId,
        sourcePath,
        contentSha256,
        catalog,
        capture,
        cards,
      });
    }
  }
  return banks;
}

function summary(banks) {
  return {
    courses: new Set(banks.map((bank) => bank.course.code)).size,
    banks: banks.length,
    cards: banks.reduce((count, bank) => count + bank.cards.length, 0),
    imageCards: banks.reduce((count, bank) => count + bank.cards.filter((card) => card.sourceImageUrl).length, 0),
  };
}

async function pagedIn(client, table, columns, field, values) {
  const rows = [];
  for (const valuesChunk of chunk(values, 100)) {
    const { data, error } = await client.from(table).select(columns).in(field, valuesChunk);
    if (error) throw new Error(`Could not load ${table}: ${error.message}`);
    rows.push(...(data ?? []));
  }
  return rows;
}

async function upsertBatches(client, table, rows, onConflict) {
  for (const rowsChunk of chunk(rows, pageSize)) {
    const { error } = await client.from(table).upsert(rowsChunk, { onConflict });
    if (error) throw new Error(`Could not write ${table}: ${error.message}`);
  }
}

const banks = await sourceEdition();
const totals = summary(banks);
if (totals.courses !== 17 || totals.banks !== 168 || totals.cards !== 12900 || totals.imageCards !== 5255) {
  throw new Error(`D2 source baseline failed: ${JSON.stringify(totals)}`);
}

if (!commit) {
  console.log(JSON.stringify({ status: "dry_run", sourceRoot, ...totals }, null, 2));
  process.exit(0);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !secretKey || secretKey === "YOUR-SERVICE-ROLE-KEY") {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY before importing the D2 source edition.");
}
const supabase = createClient(supabaseUrl, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

const [catalogRows, sourceRows, importRows] = await Promise.all([
  pagedIn(supabase, "practice_course_catalog", "course_code, slug", "course_code", [...new Set(banks.map((bank) => bank.course.code))]),
  pagedIn(supabase, "practice_sources", "id, external_id, deck, source_card_count", "id", banks.map((bank) => bank.sourceId)),
  pagedIn(supabase, "practice_source_imports", "source_id, content_sha256", "source_id", banks.map((bank) => bank.sourceId)),
]);
const catalogByCode = new Map(catalogRows.map((row) => [row.course_code, row]));
for (const course of Object.values(D2_COURSES)) {
  const catalog = catalogByCode.get(course.code);
  if (!catalog || catalog.slug !== course.slug) throw new Error(`D2 course catalog is missing or mismatched for ${course.code}. Apply the D2 catalog migration first.`);
}
const existingSourceIds = new Set(sourceRows.map((row) => row.id));
const existingSourcesById = new Map(sourceRows.map((row) => [row.id, row]));
const importedBySource = new Map(importRows.map((row) => [row.source_id, row.content_sha256]));
const adoptedSourceIds = new Set();
for (const bank of banks) {
  const existingHash = importedBySource.get(bank.sourceId);
  if (existingHash && existingHash !== bank.contentSha256) throw new Error(`${bank.capture.source.title} changed after its immutable D2 source import. Capture a new source version instead of overwriting it.`);
  if (existingSourceIds.has(bank.sourceId) && !existingHash) {
    const existing = existingSourcesById.get(bank.sourceId);
    if (String(existing?.external_id) !== String(bank.capture.source.externalId) || existing?.deck !== bank.capture.source.title || Number(existing?.source_card_count) !== bank.cards.length) {
      throw new Error(`${bank.capture.source.title} already exists with incompatible source metadata. Capture a new source version instead of overwriting it.`);
    }
    const { data: existingCards, error: existingCardsError } = await supabase
      .from("practice_questions")
      .select("source_order, original_question, original_answer, source_image_url, image_placement")
      .eq("source_id", bank.sourceId)
      .order("source_order");
    if (existingCardsError) throw new Error(`Could not verify existing ${bank.capture.source.title}: ${existingCardsError.message}`);
    const existingCardHash = sha256(JSON.stringify((existingCards ?? []).map((card) => ({
      order: card.source_order,
      originalQuestion: card.original_question,
      originalAnswer: card.original_answer,
      sourceImageUrl: card.source_image_url,
      imagePlacement: card.image_placement,
    }))));
    const frozenCardHash = sha256(JSON.stringify(bank.cards.map((card) => ({
      order: card.order,
      originalQuestion: card.originalQuestion,
      originalAnswer: card.originalAnswer,
      sourceImageUrl: card.sourceImageUrl || null,
      imagePlacement: databaseImagePlacement(card.imagePlacement),
    }))));
    if (existingCardHash !== frozenCardHash) {
      // A prior capture with the same Quizlet ID is immutable too. Give the
      // approved D2 capture its own source identity instead of replacing or
      // silently reclassifying that older source.
      const legacySourceId = bank.sourceId;
      bank.sourceId = `omar-d2-${legacySourceId}`;
      if (existingSourceIds.has(bank.sourceId)) {
        throw new Error(`${bank.capture.source.title} needs a new D2 source identity, but ${bank.sourceId} is already occupied.`);
      }
      continue;
    }
    adoptedSourceIds.add(bank.sourceId);
  }
}

for (const bank of banks) {
  if (importedBySource.get(bank.sourceId) === bank.contentSha256) continue;
  const source = bank.capture.source;
  const { error: sourceError } = await supabase.from("practice_sources").upsert({
    id: bank.sourceId,
    edition: "omar",
    platform: "quizlet",
    external_id: String(source.externalId),
    author: "omar_mifalani",
    folder: source.folder,
    deck: source.title,
    source_url: source.url,
    folder_url: source.folderUrl,
    captured_at: source.capturedAt,
    source_card_count: bank.cards.length,
  }, { onConflict: "id" });
  if (sourceError) throw new Error(`Could not preserve ${source.title}: ${sourceError.message}`);

  await upsertBatches(supabase, "practice_questions", bank.cards.map((card) => ({
    source_id: bank.sourceId,
    source_order: card.order,
    original_question: card.originalQuestion,
    original_answer: card.originalAnswer,
    source_image_url: card.sourceImageUrl || null,
    image_placement: databaseImagePlacement(card.imagePlacement),
  })), "source_id,source_order");

  const { error: bankError } = await supabase.from("practice_banks").upsert({
    id: bank.bankId,
    source_id: bank.sourceId,
    course_code: bank.course.code,
    course_slug: bank.course.slug,
    title: source.title,
    description: "Omar source edition · Recall Practice only. This deck is not a reviewed exam-question bank.",
    default_mode: "tutor",
    status: "published",
    source_card_count: bank.cards.length,
    question_count: bank.cards.length,
    bank_kind: "recall_practice",
    provenance: "source_derived",
    content_contract_version: "omar-source-edition-v1",
  }, { onConflict: "id" });
  if (bankError) throw new Error(`Could not create Recall Practice bank for ${source.title}: ${bankError.message}`);

  await upsertBatches(supabase, "practice_bank_sources", [{ bank_id: bank.bankId, source_id: bank.sourceId, source_role: "included" }], "bank_id,source_id");
  await upsertBatches(supabase, "practice_course_sources", [{ course_code: bank.course.code, source_id: bank.sourceId, status: "released", sort_order: bank.setIndex }], "course_code,source_id");
  await upsertBatches(supabase, "practice_source_imports", [{
    source_id: bank.sourceId,
    dataset_version: "omar-d2-source-edition-v1",
    content_sha256: bank.contentSha256,
    source_path: bank.sourcePath,
  }], "source_id");
}

console.log(JSON.stringify({ status: "imported", adoptedExistingSources: adoptedSourceIds.size, sourceRoot, ...totals }, null, 2));
