import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

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
assert.match(componentSource, /disabled=\{!moduleState\.challengeEnabled\}/);
assert.doesNotMatch(componentSource, /saveGameRound|GameRoundResult|initialProgress/);

console.log("Validated empty MICP dataset, evidence-gated schema, and disabled game state.");
