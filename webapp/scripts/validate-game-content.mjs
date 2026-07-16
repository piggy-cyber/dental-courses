import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const catalogPath = fileURLToPath(
  new URL("../src/data/games/tooth-data.json", import.meta.url),
);
const contactCatalogPath = fileURLToPath(
  new URL("../src/data/games/contact-area-data.json", import.meta.url),
);
const eruptionCatalogPath = fileURLToPath(
  new URL("../src/data/games/eruption-data.json", import.meta.url),
);
const rootCanalCatalogPath = fileURLToPath(
  new URL("../src/data/games/root-canal-match-data.json", import.meta.url),
);
const comparisonPath = fileURLToPath(
  new URL("../src/data/games/tooth-comparison-data.json", import.meta.url),
);
const gvBlackCatalogPath = fileURLToPath(
  new URL("../src/data/games/gv-black-data.json", import.meta.url),
);

const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const contactCatalog = JSON.parse(await readFile(contactCatalogPath, "utf8"));
const eruptionCatalog = JSON.parse(await readFile(eruptionCatalogPath, "utf8"));
const rootCanalCatalog = JSON.parse(await readFile(rootCanalCatalogPath, "utf8"));
const comparisonDataset = JSON.parse(await readFile(comparisonPath, "utf8"));
const gvBlackCatalog = JSON.parse(await readFile(gvBlackCatalogPath, "utf8"));

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

const contactRecordFields = [
  "id",
  "toothNumber",
  "toothName",
  "arch",
  "view",
  "mesialContactTooth",
  "distalContactTooth",
  "mesialContactLocation",
  "distalContactLocation",
  "buccolingualContactPosition",
  "acceptedTargetRegion",
  "explanation",
  "commonTrap",
  "sourceRefs",
  "evidenceStatus",
];
const contactLocations = new Set([
  "incisal-third",
  "incisal-middle-junction",
  "occlusal-third",
  "occlusal-middle-junction",
  "middle-third",
]);
const buccolingualLocations = new Set([
  "facial-third",
  "facial-aspect-middle-third",
  "facial-to-central-groove",
  "middle-third",
]);
const incisoZones = new Set([
  "mesial-incisal-occlusal",
  "mesial-incisal-occlusal-middle-junction",
  "mesial-middle",
  "mesial-cervical",
  "distal-incisal-occlusal",
  "distal-incisal-occlusal-middle-junction",
  "distal-middle",
  "distal-cervical",
]);
const faciolingualZones = new Set([
  "facial-third",
  "facial-aspect-middle-third",
  "facial-to-central-groove",
  "middle-third",
  "lingual-third",
]);
const targetRegionFields = [
  "mesialIncisocervical",
  "distalIncisocervical",
  "mesialFaciolingual",
  "distalFaciolingual",
];

assert.equal(contactCatalog.schemaVersion, 1, "contact-area schemaVersion must be 1");
assert.equal(contactCatalog.courseCode, "REHE 151", "contact-area course must be REHE 151");
assert.ok(Array.isArray(contactCatalog.records), "contact-area records must be an array");
assert.equal(contactCatalog.records.length, 32, "contact-area catalog must cover all 32 permanent teeth");
assertUnique(contactCatalog.records.map((record) => record.id), "contact-area record ids");
assertUnique(contactCatalog.records.map((record) => record.toothNumber), "contact-area tooth numbers");
assert.deepEqual(
  contactCatalog.records.map((record) => record.toothNumber).sort((a, b) => Number(a) - Number(b)),
  permanentCodes,
  "contact-area catalog must represent permanent teeth 1-32",
);

function expectedPermanentNeighbors(toothNumber) {
  const number = Number(toothNumber);
  const isMaxillary = number <= 16;
  const isRight = isMaxillary ? number <= 8 : number >= 25;
  const mesialStep = isMaxillary ? (isRight ? 1 : -1) : isRight ? -1 : 1;
  const terminal = [1, 16, 17, 32].includes(number);
  return {
    mesial: String(number + mesialStep),
    distal: terminal ? null : String(number - mesialStep),
  };
}

for (const record of contactCatalog.records) {
  for (const field of contactRecordFields) {
    assert.ok(Object.hasOwn(record, field), `${record.id} must include editable field ${field}`);
  }
  assertText(record.id, "contact-area id");
  assert.ok(permanentCodes.includes(record.toothNumber), `${record.id} must use a permanent Universal number`);
  assertText(record.toothName, `${record.id} toothName`);
  assert.ok(["maxillary", "mandibular"].includes(record.arch), `${record.id} arch`);
  assert.ok(["facial", "occlusal"].includes(record.view), `${record.id} view`);
  assert.ok(["course-verified", "needs-review"].includes(record.evidenceStatus), `${record.id} evidenceStatus`);
  assertText(record.explanation, `${record.id} explanation`);
  assertText(record.commonTrap, `${record.id} commonTrap`);

  const catalogTooth = permanentTeeth.find((tooth) => tooth.code === record.toothNumber);
  assert.equal(record.arch, catalogTooth.arch, `${record.id} arch must match the permanent catalog`);
  const expectedNeighbors = expectedPermanentNeighbors(record.toothNumber);
  assert.equal(record.mesialContactTooth, expectedNeighbors.mesial, `${record.id} mesial neighbor`);
  assert.equal(record.distalContactTooth, expectedNeighbors.distal, `${record.id} distal neighbor`);

  for (const [surface, neighbor] of [
    ["mesial", record.mesialContactTooth],
    ["distal", record.distalContactTooth],
  ]) {
    assert.ok(
      neighbor === null || permanentCodes.includes(neighbor),
      `${record.id} ${surface} neighbor must be a permanent Universal number or null`,
    );
    assert.notEqual(neighbor, record.toothNumber, `${record.id} cannot contact itself`);
  }

  for (const [surface, location] of [
    ["mesial", record.mesialContactLocation],
    ["distal", record.distalContactLocation],
  ]) {
    assert.ok(
      location === null || contactLocations.has(location),
      `${record.id} ${surface} contact location`,
    );
  }

  assert.ok(
    record.buccolingualContactPosition &&
      typeof record.buccolingualContactPosition === "object" &&
      !Array.isArray(record.buccolingualContactPosition),
    `${record.id} buccolingualContactPosition must be an object`,
  );
  for (const surface of ["mesial", "distal"]) {
    const location = record.buccolingualContactPosition[surface];
    assert.ok(
      location === null || buccolingualLocations.has(location),
      `${record.id} ${surface} buccolingual location`,
    );
  }

  assert.ok(
    record.acceptedTargetRegion &&
      typeof record.acceptedTargetRegion === "object" &&
      !Array.isArray(record.acceptedTargetRegion),
    `${record.id} acceptedTargetRegion must be an object`,
  );
  for (const field of targetRegionFields) {
    const zones = record.acceptedTargetRegion[field];
    assert.ok(Array.isArray(zones), `${record.id} ${field} must be an array`);
    assertUnique(zones, `${record.id} ${field} zones`);
    const allowed = field.endsWith("Incisocervical") ? incisoZones : faciolingualZones;
    for (const zone of zones) {
      assert.ok(allowed.has(zone), `${record.id} ${field} contains unknown zone ${zone}`);
    }
  }

  assert.ok(Array.isArray(record.sourceRefs) && record.sourceRefs.length > 0, `${record.id} needs sourceRefs`);
  for (const sourceRef of record.sourceRefs) {
    assert.equal(sourceRef.courseCode, "REHE 151", `${record.id} source courseCode`);
    assertText(sourceRef.sourceName, `${record.id} sourceName`);
    assertText(sourceRef.locator, `${record.id} source locator`);
    assert.ok(!sourceRef.sourceName.includes("/"), `${record.id} sourceName must not expose a local path`);
  }

  if (record.evidenceStatus === "course-verified") {
    for (const surface of ["mesial", "distal"]) {
      const location = record[`${surface}ContactLocation`];
      const zones = record.acceptedTargetRegion[`${surface}Incisocervical`];
      assert.equal(Boolean(location), zones.length > 0, `${record.id} ${surface} location and target regions must agree`);
      if (location?.endsWith("middle-junction")) {
        assert.deepEqual(
          zones,
          [`${surface}-incisal-occlusal-middle-junction`],
          `${record.id} ${surface} junction must use only the narrow boundary target`,
        );
      }
    }
  }

  const number = Number(record.toothNumber);
  if (number >= 9 && number <= 24) {
    assert.ok(
      record.sourceRefs.some(
        (sourceRef) =>
          sourceRef.sourceName === "REHE 151 Dental Anatomy Course Mastery Guide.docx" &&
          sourceRef.locator.includes("permanent arch sequence"),
      ),
      `${record.id} left-side adjacency must cite the Course Mastery Guide sequence`,
    );
  }
}

const challengeRecords = contactCatalog.records.filter(
  (record) => record.evidenceStatus === "course-verified",
);
assert.equal(
  challengeRecords.length,
  contactCatalog.records.length,
  "only course-verified records may enter the current Challenge catalog",
);
assert.equal(
  challengeRecords.filter((record) => record.distalContactTooth === null).length,
  4,
  "Challenge must include verified terminal molars #1, #16, #17, and #32",
);
assert.deepEqual(
  challengeRecords
    .filter((record) => record.distalContactTooth === null)
    .map((record) => record.toothNumber)
    .sort((a, b) => Number(a) - Number(b)),
  ["1", "16", "17", "32"],
  "only the four terminal third molars may lack a distal contact",
);
const tooth20 = challengeRecords.find((record) => record.toothNumber === "20");
assert.equal(tooth20.distalContactTooth, "19", "tooth #20 must contact #19 distally");
for (const toothNumber of ["18", "19", "30", "31"]) {
  const record = challengeRecords.find((item) => item.toothNumber === toothNumber);
  for (const surface of ["mesial", "distal"]) {
    if (record.buccolingualContactPosition[surface] === "facial-aspect-middle-third") {
      assert.deepEqual(
        record.acceptedTargetRegion[`${surface}Faciolingual`],
        ["facial-aspect-middle-third"],
        `${record.id} ${surface} FM target must stay inside the facial aspect of the middle third`,
      );
    }
  }
}
for (const toothNumber of ["3", "14"]) {
  const record = challengeRecords.find((item) => item.toothNumber === toothNumber);
  assert.equal(
    record.buccolingualContactPosition.mesial,
    "facial-to-central-groove",
    `${record.id} mesial contact must extend from facial toward the central groove`,
  );
  assert.deepEqual(record.acceptedTargetRegion.mesialFaciolingual, ["facial-to-central-groove"]);
  assert.match(record.explanation, /central groove/i, `${record.id} explanation must preserve contact breadth`);
}
assert.ok(
  challengeRecords.some(
    (record) =>
      record.mesialContactLocation &&
      record.distalContactLocation &&
      record.mesialContactLocation !== record.distalContactLocation,
  ),
  "Challenge must support cervical contact comparisons",
);
assert.ok(
  challengeRecords.some((record) => record.arch === "maxillary") &&
    challengeRecords.some((record) => record.arch === "mandibular"),
  "Challenge must cover both arches",
);

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
const needsReviewComparisonIds = comparisonDataset.questions
  .filter((question) => question.evidenceStatus === "needs-review")
  .map((question) => question.id)
  .sort();
assert.equal(verifiedComparisonCount, 13, "Challenge mode should contain exactly 13 verified cards");
assert.deepEqual(
  needsReviewComparisonIds,
  ["max-premolars-groove-pattern"],
  "The disputed maxillary second-premolar groove card must remain study-only",
);

console.log(
  `Validated ${catalog.teeth.length} teeth, ${catalog.morphologyTemplates.length} morphology templates, ${catalog.teeth.length} supernumerary mappings, ${verifiedComparisonCount} course-verified comparison cards, and ${needsReviewComparisonIds.length} study-only comparison card.`,
);
console.log(
  `Validated all ${contactCatalog.records.length} permanent contact-area records with source locators and anatomically bounded target regions.`,
);

assert.equal(eruptionCatalog.schemaVersion, 1, "eruption schemaVersion must be 1");
assert.ok(Array.isArray(eruptionCatalog.records), "eruption records must be an array");
assert.equal(eruptionCatalog.records.length, 35, "eruption catalog must contain 35 records");
assertUnique(eruptionCatalog.records.map((record) => record.id), "eruption record ids");

const validDentitions = new Set(["permanent", "primary", "mixed"]);
const validArches = new Set(["maxillary", "mandibular"]);
const validAgeUnits = new Set(["months", "years"]);
const validToothTypes = new Set(["incisor", "canine", "premolar", "molar"]);
const validSequenceBands = new Set([
  "early",
  "middle",
  "late",
  "third-molar",
  "early-mixed",
  "transitional-mixed",
  "late-mixed",
]);
const validTimelineSets = new Set(["permanent", "primary", "mixed"]);
const validEvidenceStatuses = new Set(["course-verified", "needs-review"]);

for (const record of eruptionCatalog.records) {
  assertText(record.id, "eruption id");
  assertText(record.toothName, `${record.id} toothName`);
  assertText(record.toothNumber, `${record.id} toothNumber`);
  assert.ok(validToothTypes.has(record.toothType), `${record.id} toothType`);
  assert.ok(validDentitions.has(record.dentitionType), `${record.id} dentitionType`);
  assert.ok(validArches.has(record.arch), `${record.id} arch`);
  assert.ok(validAgeUnits.has(record.ageUnit), `${record.id} ageUnit`);
  assert.ok(validSequenceBands.has(record.sequenceBand), `${record.id} sequenceBand`);
  assert.ok(validTimelineSets.has(record.timelineSet), `${record.id} timelineSet`);
  assert.ok(validEvidenceStatuses.has(record.evidenceStatus), `${record.id} evidenceStatus`);
  assert.ok(
    record.eruptionRange &&
      Number.isFinite(record.eruptionRange.min) &&
      Number.isFinite(record.eruptionRange.max) &&
      record.eruptionRange.min > 0 &&
      record.eruptionRange.max >= record.eruptionRange.min,
    `${record.id} eruptionRange`,
  );
  if (record.typicalRange) {
    assert.ok(
      Number.isFinite(record.typicalRange.min) &&
        Number.isFinite(record.typicalRange.max) &&
        record.typicalRange.min >= record.eruptionRange.min &&
        record.typicalRange.max <= record.eruptionRange.max,
      `${record.id} typicalRange must sit inside the accepted eruptionRange`,
    );
  }
  assert.ok(
    Number.isInteger(record.sequenceRank) && record.sequenceRank > 0,
    `${record.id} sequenceRank`,
  );
  assertText(record.explanation, `${record.id} explanation`);
  assertText(record.commonConfusion, `${record.id} commonConfusion`);
  assert.ok(Array.isArray(record.sourceRefs) && record.sourceRefs.length > 0, `${record.id} sourceRefs`);
  for (const [index, sourceRef] of record.sourceRefs.entries()) {
    assertText(sourceRef.courseCode, `${record.id} sourceRefs[${index}].courseCode`);
    assertText(sourceRef.sourceName, `${record.id} sourceRefs[${index}].sourceName`);
    assertText(sourceRef.locator, `${record.id} sourceRefs[${index}].locator`);
    assert.ok(
      !sourceRef.sourceName.includes("/Users/") && !sourceRef.sourceName.includes("library/"),
      `${record.id} sourceRefs must not expose private paths`,
    );
  }
  assert.ok(
    record.sourceRefs.some(
      (sourceRef) =>
        sourceRef.sourceName === "REHE 151 Dental Anatomy Course Mastery Guide.pdf" &&
        sourceRef.locator === "pages 4-5, Universal permanent and primary tooth designations",
    ),
    `${record.id} toothNumber requires Course Mastery Guide provenance`,
  );
}

const challengeRecords = eruptionCatalog.records.filter(
  (record) => record.evidenceStatus === "course-verified",
);
const needsReviewRecords = eruptionCatalog.records.filter(
  (record) => record.evidenceStatus === "needs-review",
);
const mixedRecords = eruptionCatalog.records.filter((record) => record.timelineSet === "mixed");
assert.ok(challengeRecords.length > 0, "Challenge mode requires course-verified records");
assert.equal(needsReviewRecords.length, 7, "seven conflicted records must remain in review");
assert.ok(
  challengeRecords.every((record) => record.evidenceStatus === "course-verified"),
  "Challenge selection must exclude needs-review records",
);
assert.equal(mixedRecords.length, 9, "mixed mode must use nine dedicated timeline records");
assert.ok(
  mixedRecords.every(
    (record) => record.dentitionType === "mixed" && record.evidenceStatus === "course-verified",
  ),
  "mixed timeline records must be course-verified and explicitly typed",
);
for (const record of eruptionCatalog.records.filter((item) => item.sequenceBand === "third-molar")) {
  assert.deepEqual(record.typicalRange, { min: 17, max: 21 }, `${record.id} typical third-molar range`);
  assert.deepEqual(record.eruptionRange, { min: 17, max: 25 }, `${record.id} extended third-molar range`);
}

console.log(
  `Validated ${eruptionCatalog.records.length} eruption records: ${challengeRecords.length} Challenge-safe, ${needsReviewRecords.length} held for review, and ${mixedRecords.length} mixed-stage records.`,
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

const gvBlackClassIds = ["I", "II", "III", "IV", "V", "VI"];
const gvBlackLocators = {
  I: "page 20",
  II: "pages 21-22",
  III: "pages 23-24",
  IV: "page 25",
  V: "page 26",
  VI: "pages 27-28",
};
const allowedLesionsByClass = {
  I: new Set(["occlusal-pit-fissure", "buccal-pit", "lingual-pit"]),
  II: new Set(["posterior-proximal"]),
  III: new Set(["anterior-proximal-no-incisal"]),
  IV: new Set(["anterior-proximal-incisal"]),
  V: new Set(["cervical-third"]),
  VI: new Set(["posterior-cusp-tip", "anterior-incisal-only"]),
};

function validateSourceRefs(sourceRefs, label) {
  assert.ok(Array.isArray(sourceRefs) && sourceRefs.length > 0, `${label} needs sourceRefs`);
  for (const [index, sourceRef] of sourceRefs.entries()) {
    assertText(sourceRef.courseCode, `${label} sourceRefs[${index}].courseCode`);
    assertText(sourceRef.sourceName, `${label} sourceRefs[${index}].sourceName`);
    assertText(sourceRef.locator, `${label} sourceRefs[${index}].locator`);
    assert.equal(sourceRef.courseCode, "REHE 162", `${label} must use the controlling course`);
    assert.equal(
      sourceRef.sourceName,
      "Intro+to+BP+Restorative+I+2026.pdf",
      `${label} must use the controlling source`,
    );
  }
}

assert.equal(gvBlackCatalog.schemaVersion, 1, "G.V. Black schemaVersion must be 1");
assert.equal(gvBlackCatalog.gameId, "gv-black-sorter");
assert.deepEqual(
  gvBlackCatalog.classes.map((classification) => classification.id),
  gvBlackClassIds,
  "G.V. Black classes must cover I-VI in order",
);
assertUnique(
  gvBlackCatalog.classes.map((classification) => classification.masteryKey),
  "G.V. Black mastery keys",
);
assert.equal(gvBlackCatalog.cases.length, 18, "G.V. Black catalog must contain 18 cases");
assertUnique(gvBlackCatalog.cases.map((item) => item.id), "G.V. Black case ids");

for (const classification of gvBlackCatalog.classes) {
  assertText(classification.title, `${classification.id} title`);
  assertText(classification.rule, `${classification.id} rule`);
  assertText(classification.contrast, `${classification.id} contrast`);
  validateSourceRefs(classification.sourceRefs, `Class ${classification.id}`);
  assert.ok(
    classification.sourceRefs.some((sourceRef) =>
      sourceRef.locator.includes(gvBlackLocators[classification.id]),
    ),
    `Class ${classification.id} must cite ${gvBlackLocators[classification.id]}`,
  );

  const casesForClass = gvBlackCatalog.cases.filter(
    (item) => item.classId === classification.id,
  );
  assert.equal(casesForClass.length, 3, `Class ${classification.id} must have three cases`);
}

for (const item of gvBlackCatalog.cases) {
  assert.ok(gvBlackClassIds.includes(item.classId), `${item.id} references a known class`);
  assertText(item.prompt, `${item.id} prompt`);
  assertText(item.clinicalCue, `${item.id} clinicalCue`);
  assertText(item.explanation, `${item.id} explanation`);
  assert.deepEqual(item.modes, ["study", "challenge"], `${item.id} must support both modes`);
  assert.equal(item.evidenceStatus, "course-verified", `${item.id} must be course verified`);
  assert.ok(
    allowedLesionsByClass[item.classId].has(item.diagram.lesion),
    `${item.id} lesion does not match Class ${item.classId}`,
  );
  validateSourceRefs(item.sourceRefs, item.id);
  assert.ok(
    item.sourceRefs.some((sourceRef) =>
      sourceRef.locator.includes(gvBlackLocators[item.classId]),
    ),
    `${item.id} must cite ${gvBlackLocators[item.classId]}`,
  );

  if (item.classId === "III") {
    assert.match(item.prompt, /incisal edge/i, `${item.id} must mention the incisal edge`);
    assert.match(
      `${item.prompt} ${item.clinicalCue}`,
      /(not involved|uninvolved|intact)/i,
      `${item.id} must explicitly spare the incisal edge`,
    );
  }
  if (item.classId === "IV") {
    assert.match(item.prompt, /incisal edge/i, `${item.id} must state incisal-edge involvement`);
  }
  if (item.classId === "VI" && item.diagram.lesion === "anterior-incisal-only") {
    assert.match(
      `${item.prompt} ${item.clinicalCue}`,
      /(confined|only)/i,
      `${item.id} must remain confined to the incisal edge`,
    );
    assert.match(
      `${item.prompt} ${item.clinicalCue}`,
      /(not involve|not involved)/i,
      `${item.id} must explicitly spare proximal surfaces`,
    );
  }
}

console.log(
  `Validated ${catalog.teeth.length} teeth, ${catalog.morphologyTemplates.length} morphology templates, ${catalog.teeth.length} supernumerary mappings, and ${gvBlackCatalog.cases.length} G.V. Black cases.`,
);
