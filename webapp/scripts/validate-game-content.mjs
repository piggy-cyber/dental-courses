import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const catalogPath = fileURLToPath(
  new URL("../src/data/games/tooth-data.json", import.meta.url),
);
const gvBlackCatalogPath = fileURLToPath(
  new URL("../src/data/games/gv-black-data.json", import.meta.url),
);

const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
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
