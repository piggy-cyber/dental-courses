import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const catalogPath = fileURLToPath(
  new URL("../src/data/games/tooth-data.json", import.meta.url),
);
const contactCatalogPath = fileURLToPath(
  new URL("../src/data/games/contact-area-data.json", import.meta.url),
);

const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const contactCatalog = JSON.parse(await readFile(contactCatalogPath, "utf8"));

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
  "facial-middle-junction",
  "middle-third",
]);
const incisoZones = new Set([
  "mesial-incisal-occlusal",
  "mesial-middle",
  "mesial-cervical",
  "distal-incisal-occlusal",
  "distal-middle",
  "distal-cervical",
]);
const faciolingualZones = new Set(["facial-third", "middle-third", "lingual-third"]);
const targetRegionFields = [
  "mesialIncisocervical",
  "distalIncisocervical",
  "mesialFaciolingual",
  "distalFaciolingual",
];

assert.equal(contactCatalog.schemaVersion, 1, "contact-area schemaVersion must be 1");
assert.equal(contactCatalog.courseCode, "REHE 151", "contact-area course must be REHE 151");
assert.ok(Array.isArray(contactCatalog.records), "contact-area records must be an array");
assert.ok(contactCatalog.records.length >= 16, "contact-area catalog must cover both arches and terminal molars");
assertUnique(contactCatalog.records.map((record) => record.id), "contact-area record ids");
assertUnique(contactCatalog.records.map((record) => record.toothNumber), "contact-area tooth numbers");

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
    }
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
  2,
  "Challenge must include verified maxillary and mandibular terminal molars",
);
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

console.log(
  `Validated ${catalog.teeth.length} teeth, ${catalog.morphologyTemplates.length} morphology templates, and ${catalog.teeth.length} supernumerary mappings.`,
);
console.log(
  `Validated ${contactCatalog.records.length} course-verified contact-area records with source locators and generous target regions.`,
);
