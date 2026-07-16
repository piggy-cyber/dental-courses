import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const catalogPath = fileURLToPath(
  new URL("../src/data/games/tooth-data.json", import.meta.url),
);
const rootCanalCatalogPath = fileURLToPath(
  new URL("../src/data/games/root-canal-match-data.json", import.meta.url),
);

const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const rootCanalCatalog = JSON.parse(await readFile(rootCanalCatalogPath, "utf8"));

const permanentCodes = Array.from({ length: 32 }, (_, index) => String(index + 1));
const primaryCodes = [..."ABCDEFGHIJKLMNOPQRST"];

const permanentNames = [
  "Third molar",
  "Second molar",
  "First molar",
  "Second premolar",
  "First premolar",
  "Canine",
  "Lateral incisor",
  "Central incisor",
  "Central incisor",
  "Lateral incisor",
  "Canine",
  "First premolar",
  "Second premolar",
  "First molar",
  "Second molar",
  "Third molar",
  "Third molar",
  "Second molar",
  "First molar",
  "Second premolar",
  "First premolar",
  "Canine",
  "Lateral incisor",
  "Central incisor",
  "Central incisor",
  "Lateral incisor",
  "Canine",
  "First premolar",
  "Second premolar",
  "First molar",
  "Second molar",
  "Third molar",
];

const primaryNames = [
  "Second molar",
  "First molar",
  "Canine",
  "Lateral incisor",
  "Central incisor",
  "Central incisor",
  "Lateral incisor",
  "Canine",
  "First molar",
  "Second molar",
  "Second molar",
  "First molar",
  "Canine",
  "Lateral incisor",
  "Central incisor",
  "Central incisor",
  "Lateral incisor",
  "Canine",
  "First molar",
  "Second molar",
];

const permanentPositions = [
  8, 7, 6, 5, 4, 3, 2, 1,
  1, 2, 3, 4, 5, 6, 7, 8,
  8, 7, 6, 5, 4, 3, 2, 1,
  1, 2, 3, 4, 5, 6, 7, 8,
];

const primaryPositions = [
  5, 4, 3, 2, 1,
  1, 2, 3, 4, 5,
  5, 4, 3, 2, 1,
  1, 2, 3, 4, 5,
];

function expectedArch(index, quadrantSize) {
  return index < quadrantSize * 2 ? "maxillary" : "mandibular";
}

function expectedSide(index, quadrantSize) {
  const quadrantIndex = Math.floor(index / quadrantSize);
  return quadrantIndex === 0 || quadrantIndex === 3 ? "right" : "left";
}

function expectedToothType(name) {
  if (name.includes("incisor")) return "incisor";
  if (name === "Canine") return "canine";
  if (name.includes("premolar")) return "premolar";
  return "molar";
}

function expectedVariant(name) {
  if (name === "Canine") return "canine";
  return name.split(" ", 1)[0].toLowerCase();
}

function assertUnique(values, label) {
  assert.equal(new Set(values).size, values.length, `${label} must be unique`);
}

function assertText(value, label) {
  assert.equal(typeof value, "string", `${label} must be a string`);
  assert.ok(value.trim().length > 0, `${label} must not be empty`);
}

assert.equal(catalog.schemaVersion, 1, "schemaVersion must be 1");
assert.equal(catalog.notation, "ADA Universal Numbering System");
assert.equal(catalog.templateOrientation, "right");
assert.ok(Array.isArray(catalog.teeth), "teeth must be an array");
assert.ok(
  Array.isArray(catalog.morphologyTemplates),
  "morphologyTemplates must be an array",
);

const permanentTeeth = catalog.teeth.filter((tooth) => tooth.dentition === "permanent");
const primaryTeeth = catalog.teeth.filter((tooth) => tooth.dentition === "primary");

assert.equal(catalog.teeth.length, 52, "catalog must contain exactly 52 teeth");
assert.equal(permanentTeeth.length, 32, "catalog must contain 32 permanent teeth");
assert.equal(primaryTeeth.length, 20, "catalog must contain 20 primary teeth");

assert.deepEqual(
  permanentTeeth.map((tooth) => tooth.code),
  permanentCodes,
  "permanent teeth must be in Universal order 1-32",
);
assert.deepEqual(
  primaryTeeth.map((tooth) => tooth.code),
  primaryCodes,
  "primary teeth must be in Universal order A-T",
);
assert.deepEqual(
  permanentTeeth.map((tooth) => tooth.name),
  permanentNames,
  "permanent names must follow Universal order",
);
assert.deepEqual(
  primaryTeeth.map((tooth) => tooth.name),
  primaryNames,
  "primary names must follow Universal order",
);

assertUnique(catalog.teeth.map((tooth) => tooth.code), "tooth codes");
assertUnique(
  catalog.teeth.map((tooth) => tooth.supernumeraryCode),
  "supernumerary codes",
);

const templatesById = new Map(
  catalog.morphologyTemplates.map((template) => [template.id, template]),
);
assert.equal(
  templatesById.size,
  catalog.morphologyTemplates.length,
  "template ids must be unique",
);
assert.equal(
  catalog.morphologyTemplates.length,
  26,
  "catalog must define 16 permanent and 10 primary base templates",
);

const templateGroups = [
  ["permanent", "maxillary", 8],
  ["permanent", "mandibular", 8],
  ["primary", "maxillary", 5],
  ["primary", "mandibular", 5],
];

for (const [dentition, arch, expectedCount] of templateGroups) {
  const actualCount = catalog.morphologyTemplates.filter(
    (template) => template.dentition === dentition && template.arch === arch,
  ).length;
  assert.equal(
    actualCount,
    expectedCount,
    `${dentition} ${arch} must define ${expectedCount} base templates`,
  );
}

assertUnique(
  catalog.morphologyTemplates.map((template) => template.cssProfile),
  "CSS morphology profiles",
);

for (const template of catalog.morphologyTemplates) {
  assertText(template.id, "template id");
  assertText(template.displayName, `${template.id} displayName`);
  assertText(template.crownOutline, `${template.id} crownOutline`);
  assertText(template.groovePattern, `${template.id} groovePattern`);
  assertText(template.landmark, `${template.id} landmark`);
  assertText(template.cssProfile, `${template.id} cssProfile`);
  assert.ok(Number.isInteger(template.cusps.typical), `${template.id} typical cusps`);
  assert.ok(Number.isInteger(template.cusps.minimum), `${template.id} minimum cusps`);
  assert.ok(Number.isInteger(template.cusps.maximum), `${template.id} maximum cusps`);
  assert.ok(
    template.cusps.minimum <= template.cusps.typical &&
      template.cusps.typical <= template.cusps.maximum,
    `${template.id} typical cusp count must be inside its range`,
  );
  assert.ok(
    Number.isInteger(template.roots.typical) && template.roots.typical > 0,
    `${template.id} must define a positive typical root count`,
  );
  assertText(template.roots.note, `${template.id} root note`);
}

for (const [index, tooth] of permanentTeeth.entries()) {
  const arch = expectedArch(index, 8);
  const side = expectedSide(index, 8);
  assert.equal(tooth.arch, arch, `tooth ${tooth.code} arch`);
  assert.equal(tooth.side, side, `tooth ${tooth.code} side`);
  assert.equal(tooth.quadrant, `${arch}-${side}`, `tooth ${tooth.code} quadrant`);
  assert.equal(
    tooth.positionFromMidline,
    permanentPositions[index],
    `tooth ${tooth.code} positionFromMidline`,
  );
  assert.equal(tooth.toothType, expectedToothType(tooth.name), `tooth ${tooth.code} type`);
  assert.equal(
    tooth.supernumeraryCode,
    String(Number(tooth.code) + 50),
    `tooth ${tooth.code} supernumerary code`,
  );
}

for (const [index, tooth] of primaryTeeth.entries()) {
  const arch = expectedArch(index, 5);
  const side = expectedSide(index, 5);
  assert.equal(tooth.arch, arch, `tooth ${tooth.code} arch`);
  assert.equal(tooth.side, side, `tooth ${tooth.code} side`);
  assert.equal(tooth.quadrant, `${arch}-${side}`, `tooth ${tooth.code} quadrant`);
  assert.equal(
    tooth.positionFromMidline,
    primaryPositions[index],
    `tooth ${tooth.code} positionFromMidline`,
  );
  assert.equal(tooth.toothType, expectedToothType(tooth.name), `tooth ${tooth.code} type`);
  assert.equal(
    tooth.supernumeraryCode,
    `${tooth.code}S`,
    `tooth ${tooth.code} supernumerary code`,
  );
}

for (const tooth of catalog.teeth) {
  assert.ok(Array.isArray(tooth.aliases), `tooth ${tooth.code} aliases must be an array`);
  assert.equal(tooth.mirrorX, tooth.side === "left", `tooth ${tooth.code} mirrorX`);

  const template = templatesById.get(tooth.templateId);
  assert.ok(template, `tooth ${tooth.code} references a known template`);
  assert.equal(template.dentition, tooth.dentition, `tooth ${tooth.code} template dentition`);
  assert.equal(template.arch, tooth.arch, `tooth ${tooth.code} template arch`);
  assert.equal(template.toothType, tooth.toothType, `tooth ${tooth.code} template type`);
  assert.equal(template.variant, expectedVariant(tooth.name), `tooth ${tooth.code} template variant`);
}

for (const template of catalog.morphologyTemplates) {
  const teethUsingTemplate = catalog.teeth.filter(
    (tooth) => tooth.templateId === template.id,
  );
  assert.equal(teethUsingTemplate.length, 2, `${template.id} must be used by one mirrored pair`);
  assert.deepEqual(
    teethUsingTemplate.map((tooth) => tooth.side).sort(),
    ["left", "right"],
    `${template.id} must cover left and right counterparts`,
  );
}

console.log(
  `Validated ${catalog.teeth.length} teeth, ${catalog.morphologyTemplates.length} morphology templates, and ${catalog.teeth.length} supernumerary mappings.`,
);

const rootCanalFields = [
  "id",
  "toothName",
  "toothNumber",
  "difficulty",
  "commonRootPattern",
  "commonCanalPattern",
  "importantVariation",
  "clinicalNote",
  "explanation",
  "evidenceStatus",
];
const rootCanalDifficulties = ["basic", "intermediate", "clinical"];
const verifiedSourceNames = new Set([
  "da 5 Max PM1 2024.ppt",
  "da 6 Max M1 2024.ppt",
  "da 7 Maand M1 2020.ppt",
  "da 7 Maand M2 M3 2020 9 22 2020.ppt",
  "REHE 151 Dental Anatomy and Occlusion Textbook Companion.pdf",
]);
const heldPm1ConflictPhrases = [
  "Two roots are most common in the course slide (61%).",
  "One root is reported in 38%, while three roots are reported in 1%.",
];

assert.equal(rootCanalCatalog.schemaVersion, 1, "root canal schemaVersion must be 1");
assert.ok(Array.isArray(rootCanalCatalog.records), "root canal records must be an array");
assert.equal(rootCanalCatalog.records.length, 12, "root canal catalog must contain 12 records");
assertUnique(rootCanalCatalog.records.map((record) => record.id), "root canal record ids");

for (const difficulty of rootCanalDifficulties) {
  assert.equal(
    rootCanalCatalog.records.filter((record) => record.difficulty === difficulty).length,
    4,
    `${difficulty} must contain four root canal records`,
  );
  assert.equal(
    rootCanalCatalog.records.filter(
      (record) => record.difficulty === difficulty && record.evidenceStatus === "course-verified",
    ).length,
    3,
    `${difficulty} Challenge pool must contain three course-verified records`,
  );
  assert.equal(
    rootCanalCatalog.records.filter(
      (record) => record.difficulty === difficulty && record.evidenceStatus === "needs-review",
    ).length,
    1,
    `${difficulty} review queue must contain one held record`,
  );
}

for (const record of rootCanalCatalog.records) {
  for (const field of rootCanalFields) assertText(record[field], `${record.id} ${field}`);
  assert.ok(rootCanalDifficulties.includes(record.difficulty), `${record.id} difficulty is valid`);
  assert.ok(
    ["course-verified", "needs-review"].includes(record.evidenceStatus),
    `${record.id} evidenceStatus is valid`,
  );
  if (record.evidenceStatus === "needs-review") {
    assert.ok(record.id.startsWith("mx-pm1"), `${record.id} review hold must be the known PM1 conflict`);
    assert.match(record.explanation, /conflict/i, `${record.id} documents its source conflict`);
    assert.ok(
      record.sourceRefs.some((sourceRef) => sourceRef.locator.includes("held from Challenge")),
      `${record.id} must document its Challenge hold in sourceRefs`,
    );
  } else {
    const challengeSafeText = JSON.stringify(record).toLowerCase();
    for (const phrase of heldPm1ConflictPhrases) {
      assert.ok(
        !challengeSafeText.includes(phrase.toLowerCase()),
        `${record.id} Challenge-safe content must not contain held PM1 phrase: ${phrase}`,
      );
    }
  }
  assert.ok(Array.isArray(record.wrongOptions), `${record.id} wrongOptions must be an array`);
  assert.equal(record.wrongOptions.length, 3, `${record.id} must define three wrong options`);
  assertUnique(record.wrongOptions, `${record.id} wrong options`);
  record.wrongOptions.forEach((option, index) => assertText(option, `${record.id} wrong option ${index}`));

  const correctAnswer =
    record.difficulty === "basic"
      ? record.commonRootPattern
      : record.difficulty === "intermediate"
        ? record.commonCanalPattern
        : record.importantVariation;
  assert.ok(!record.wrongOptions.includes(correctAnswer), `${record.id} answer must not be a distractor`);
  assert.match(record.commonRootPattern, /\b(one|two|three|four) roots?\b/i, `${record.id} names a root count`);
  assert.match(record.commonCanalPattern, /\b(one|two|three|four) canals?\b/i, `${record.id} names a canal count`);

  assert.ok(Array.isArray(record.sourceRefs), `${record.id} sourceRefs must be an array`);
  assert.ok(record.sourceRefs.length > 0, `${record.id} must have at least one sourceRef`);
  for (const [index, sourceRef] of record.sourceRefs.entries()) {
    assert.equal(sourceRef.courseCode, "REHE 151", `${record.id} source ${index} course code`);
    assertText(sourceRef.sourceName, `${record.id} source ${index} filename`);
    assertText(sourceRef.locator, `${record.id} source ${index} locator`);
    assert.ok(
      verifiedSourceNames.has(sourceRef.sourceName),
      `${record.id} source ${index} must be in the verified source pack`,
    );
  }
}

console.log(
  `Validated ${rootCanalCatalog.records.length} Root Canal Match records: 9 course-verified Challenge records and 3 source-conflict review holds.`,
);
