import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const catalogPath = fileURLToPath(
  new URL("../src/data/games/tooth-data.json", import.meta.url),
);
const comparisonPath = fileURLToPath(
  new URL("../src/data/games/tooth-comparison-data.json", import.meta.url),
);

const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const comparisonDataset = JSON.parse(await readFile(comparisonPath, "utf8"));

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

const comparisonRowLabels = [
  "Crown shape",
  "Lingual anatomy",
  "Root pattern",
  "Ridge/groove clue",
  "Arch clue",
  "Clinical identification clue",
];
const comparisonFeatureTypes = [
  "crown-shape",
  "symmetry",
  "lingual-anatomy",
  "root-pattern",
  "ridge-groove",
  "arch-clue",
  "clinical-identification",
];
const expectedComparisonPairs = [
  "max-central-incisor::max-lateral-incisor",
  "mand-central-incisor::mand-lateral-incisor",
  "max-canine::mand-canine",
  "max-first-premolar::max-second-premolar",
  "mand-first-premolar::mand-second-premolar",
  "max-first-molar::max-second-molar",
  "mand-first-molar::mand-second-molar",
];

assert.equal(comparisonDataset.schemaVersion, 1, "comparison schemaVersion must be 1");
assert.ok(Array.isArray(comparisonDataset.questions), "comparison questions must be an array");
assert.ok(comparisonDataset.questions.length >= 14, "comparison dataset needs at least 14 cards");
assertUnique(comparisonDataset.questions.map((question) => question.id), "comparison question ids");

for (const question of comparisonDataset.questions) {
  assertText(question.id, "comparison question id");
  assert.ok(comparisonFeatureTypes.includes(question.featureType), `${question.id} featureType`);
  assert.equal(question.toothA.family, question.toothB.family, `${question.id} tooth family`);
  for (const [side, tooth] of [["A", question.toothA], ["B", question.toothB]]) {
    assert.ok(tooth && typeof tooth === "object", `${question.id} tooth${side}`);
    assertText(tooth.id, `${question.id} tooth${side} id`);
    assertText(tooth.label, `${question.id} tooth${side} label`);
    assertText(tooth.universal, `${question.id} tooth${side} universal`);
    assertText(tooth.family, `${question.id} tooth${side} family`);
    assertText(tooth.visualId, `${question.id} tooth${side} visualId`);
  }
  assertText(question.prompt, `${question.id} prompt`);
  assert.ok(question.prompt.length <= 220, `${question.id} prompt must stay concise`);
  assert.deepEqual(question.choices.map((choice) => choice.id).sort(), ["A", "B"]);
  assert.ok(["A", "B"].includes(question.correctChoice), `${question.id} correctChoice`);
  assert.ok(
    question.choices.some((choice) => choice.id === question.correctChoice),
    `${question.id} correctChoice must exist in choices`,
  );
  for (const choice of question.choices) assertText(choice.label, `${question.id} choice ${choice.id}`);
  assertText(question.explanation, `${question.id} explanation`);
  assertText(question.distractorExplanation, `${question.id} distractorExplanation`);
  assertText(question.commonTrap, `${question.id} commonTrap`);
  assert.ok(question.explanation.length <= 500, `${question.id} explanation must be original and concise`);
  assert.ok(
    question.distractorExplanation.length <= 500,
    `${question.id} distractorExplanation must be original and concise`,
  );
  assert.deepEqual(
    question.comparisonRows.map((row) => row.label),
    comparisonRowLabels,
    `${question.id} comparison row order`,
  );
  for (const row of question.comparisonRows) {
    assertText(row.toothA, `${question.id} ${row.label} toothA`);
    assertText(row.toothB, `${question.id} ${row.label} toothB`);
    assert.ok(row.toothA.length <= 190, `${question.id} ${row.label} toothA must stay concise`);
    assert.ok(row.toothB.length <= 190, `${question.id} ${row.label} toothB must stay concise`);
  }
  assert.ok(Array.isArray(question.sourceRefs) && question.sourceRefs.length > 0, `${question.id} sourceRefs`);
  for (const sourceRef of question.sourceRefs) {
    assert.equal(sourceRef.courseCode, "REHE 151", `${question.id} courseCode`);
    assertText(sourceRef.sourceName, `${question.id} sourceName`);
    assertText(sourceRef.locator, `${question.id} locator`);
    assert.match(
      sourceRef.locator,
      /(page|slide|transcript)/i,
      `${question.id} locator must name a page, slide, or transcript range`,
    );
  }
  assert.ok(
    ["course-verified", "needs-review"].includes(question.evidenceStatus),
    `${question.id} evidenceStatus`,
  );
}

const actualPairs = [
  ...new Set(
    comparisonDataset.questions.map(
      (question) => `${question.toothA.id}::${question.toothB.id}`,
    ),
  ),
].sort();
assert.deepEqual(actualPairs, [...expectedComparisonPairs].sort(), "comparison pair coverage");
for (const pair of expectedComparisonPairs) {
  assert.ok(
    comparisonDataset.questions.filter(
      (question) => `${question.toothA.id}::${question.toothB.id}` === pair,
    ).length >= 2,
    `${pair} needs at least two cards`,
  );
}
assert.deepEqual(
  [...new Set(comparisonDataset.questions.map((question) => question.featureType))].sort(),
  [...comparisonFeatureTypes].sort(),
  "comparison feature coverage",
);
const verifiedComparisonCount = comparisonDataset.questions.filter(
  (question) => question.evidenceStatus === "course-verified",
).length;
assert.ok(verifiedComparisonCount >= 10, "Challenge mode needs at least 10 verified cards");

console.log(
  `Validated ${catalog.teeth.length} teeth, ${catalog.morphologyTemplates.length} morphology templates, ${catalog.teeth.length} supernumerary mappings, and ${verifiedComparisonCount} course-verified comparison cards.`,
);
