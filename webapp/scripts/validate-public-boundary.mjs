import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const publicFiles = [
  "src/app/page.tsx",
  "src/app/about/page.tsx",
  "src/app/legal/page.tsx",
  "src/app/not-found.tsx",
  "src/app/signin/page.tsx",
  "src/app/(public)/guides/page.tsx",
  "src/app/(games)/games/micp-occlusion-trainer/page.tsx",
  "src/components/LegalFooter.tsx",
  "src/components/PublicAccountBenefits.tsx",
  "src/components/PublicCourseDirectory.tsx",
  "src/components/PublicHeader.tsx",
  "src/components/SignInPanel.tsx",
  "src/components/games/GameNavigation.tsx",
  "src/components/games/MicpOcclusionTrainer.tsx",
];
const forbidden = [
  /href=["']\/(?:d1|home|library|contacts|course|resource)(?:\/|["'#?])/i,
  /student workspace/i,
  /private d1/i,
  /approved student accounts/i,
  /dental study workspace/i,
  /relationship workspace/i,
  /\b(?:recorded lectures?|lecture recordings?|transcripts?|powerpoint|canvas|groupme|course files?)\b/i,
];
for (const file of publicFiles) {
  const source = readFileSync(resolve(root, file), "utf8");
  for (const pattern of forbidden) assert(!pattern.test(source), `${file} exposes a private-workspace reference: ${pattern}`);
}

for (const file of ["src/app/page.tsx", "src/app/(public)/guides/page.tsx"]) {
  const source = readFileSync(resolve(root, file), "utf8");
  assert(!/courses\.length/.test(source), `${file} exposes a fixed course count`);
  assert(!/\b\d+\s+(?:searchable\s+)?(?:courses?|course guides?|live webpages)\b/i.test(source), `${file} contains course-count copy`);
  assert(!/\b(?:courses online|live webpages)\b/i.test(source), `${file} contains course-count copy`);
}

const robotsSource = readFileSync(resolve(root, "src/app/robots.ts"), "utf8");
for (const privateRoute of ["/admin", "/contacts", "/course", "/d1", "/home", "/library", "/resource", "/workspace-settings"]) {
  assert(!robotsSource.includes(privateRoute), `robots.ts publicly enumerates a private route: ${privateRoute}`);
}
console.log("Public access boundary validation passed.");
