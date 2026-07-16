import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const dataPath = fileURLToPath(
  new URL("../src/data/games/micp-occlusion-data.ts", import.meta.url),
);
const typesPath = fileURLToPath(
  new URL("../src/lib/games/micp-types.ts", import.meta.url),
);
const componentPath = fileURLToPath(
  new URL("../src/components/games/MicpOcclusionTrainer.tsx", import.meta.url),
);

const [dataSource, typeSource, componentSource] = await Promise.all([
  readFile(dataPath, "utf8"),
  readFile(typesPath, "utf8"),
  readFile(componentPath, "utf8"),
]);

for (const field of [
  "maxillaryTooth",
  "mandibularContactTooth",
  "cusp",
  "fossaOrEmbrasure",
  "contactType",
  "explanation",
  "clinicalNote",
  "sourceRefs",
  "evidenceStatus",
]) {
  assert.match(typeSource, new RegExp(`\\b${field}\\b`), `MICP schema must include ${field}`);
}

assert.match(typeSource, /type NonEmptySourceRefs\s*=\s*\[SourceRef,\s*\.\.\.SourceRef\[\]\]/);
assert.match(
  typeSource,
  /CourseVerifiedMicpRelationship[\s\S]*?sourceRefs:\s*NonEmptySourceRefs[\s\S]*?evidenceStatus:\s*"course-verified"/,
);
assert.match(typeSource, /type MicpDatasetInReview/);
assert.match(typeSource, /type MicpDatasetReady/);
assert.match(
  typeSource,
  /relationships:\s*\[CourseVerifiedMicpRelationship,\s*\.\.\.CourseVerifiedMicpRelationship\[\]\]/,
);
assert.match(dataSource, /status:\s*"clinical-map-in-review"/);
assert.match(dataSource, /evidenceStatus:\s*"needs-review"/);
assert.match(dataSource, /relationships:\s*\[\s*\]/, "placeholder relationships must stay empty");
assert.match(componentSource, /MICP relationship data will be added next/);
assert.match(componentSource, /Clinical map in review/i);
assert.match(componentSource, /moduleStateFrom\(micpOcclusionDataset\)/);
assert.match(componentSource, /tabIndex=\{tooth\.code === focusedCode \? 0 : -1\}/);
assert.match(componentSource, /<g aria-hidden="true">/);
assert.doesNotMatch(componentSource, /studyEnabled|challengeEnabled/);
assert.equal(
  componentSource.match(/<button type="button" disabled>/g)?.length,
  3,
  "Study, Challenge, and Review controls must stay disabled in the placeholder",
);
assert.doesNotMatch(componentSource, /saveGameRound|GameRoundResult|initialProgress/);

const transpiledTypes = ts.transpileModule(typeSource, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const runtimeTypes = await import(
  `data:text/javascript;base64,${Buffer.from(transpiledTypes).toString("base64")}`
);
const { isCourseVerifiedMicpRelationship } = runtimeTypes;

const validRelationship = {
  id: "runtime-fixture",
  maxillaryTooth: "3",
  mandibularContactTooth: "30",
  cusp: "fixture only",
  fossaOrEmbrasure: "fixture only",
  contactType: "fixture only",
  explanation: "Fixture validates the evidence boundary, not a clinical fact.",
  clinicalNote: "Not published.",
  evidenceStatus: "course-verified",
  sourceRefs: [
    {
      courseCode: "DENT-TEST",
      sourceName: "runtime-fixture.pdf",
      locator: "fixture page 1",
    },
  ],
};

assert.equal(isCourseVerifiedMicpRelationship(validRelationship), true);
assert.equal(
  isCourseVerifiedMicpRelationship({ ...validRelationship, sourceRefs: [] }),
  false,
  "course-verified runtime data must include at least one source reference",
);

for (const field of ["courseCode", "sourceName", "locator"]) {
  const invalidSourceRef = { ...validRelationship.sourceRefs[0], [field]: "   " };
  assert.equal(
    isCourseVerifiedMicpRelationship({
      ...validRelationship,
      sourceRefs: [invalidSourceRef],
    }),
    false,
    `course-verified runtime data must reject a blank ${field}`,
  );
}

console.log("Validated empty MICP dataset, evidence-gated schema, and disabled game state.");
