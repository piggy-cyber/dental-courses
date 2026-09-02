import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const roots = [
  "src/app/(commercial)",
  "src/app/support/page.tsx",
  "src/components/commercial",
];
const sourceExtensions = new Set([".css", ".ts", ".tsx"]);

function sourceFiles(path) {
  const absolute = resolve(root, path);
  if (sourceExtensions.has(extname(absolute))) return [absolute];
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() || sourceExtensions.has(extname(entry.name))
      ? sourceFiles(join(path, entry.name))
      : [],
  );
}

const prohibited = [
  ["absolute user path", /\/Users\/[A-Za-z0-9._-]+\//],
  ["personal project identifier", /\b(?:rick\s+ahn|rickahn\w*)\b/i],
  ["private Notion link", /https?:\/\/(?:www\.)?notion\.so\/[^\s"']*[a-f0-9]{32}/i],
  ["JWT-like token", /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/],
  ["service secret", /\b(?:sk_live|sk_test|ntn_|secret_)[A-Za-z0-9_-]{12,}\b/],
  ["local file URL", /\bfile:\/\//i],
  ["school-specific hostname", /\b(?!example\.)[A-Za-z0-9.-]+\.edu\b/i],
];

for (const file of roots.flatMap(sourceFiles)) {
  const source = readFileSync(file, "utf8");
  for (const [label, pattern] of prohibited) {
    assert(!pattern.test(source), `${relative(root, file)} contains a prohibited ${label}`);
  }
}

console.log("Commercial privacy scan passed.");
