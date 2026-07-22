import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = resolve(fileURLToPath(new URL(".", import.meta.url)));
const staticRoot = resolve(scriptDirectory, "../.next/static/chunks");

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(path) : [path];
  }));
  return nested.flat();
}

const files = (await collectFiles(staticRoot)).filter((path) => path.endsWith(".js"));
const browserBundle = (await Promise.all(files.map((path) => readFile(path, "utf8")))).join("\n");

// The browser legitimately knows the feedback field names because feedback is
// returned after a committed Study answer or a submitted Mock. It must never
// contain the private candidate catalog, its source IDs, or original URLs.
const prohibited = [
  "https://o.quizlet.com/",
  "la-omar-da-l1-001",
  "omar-dental-anatomy-lecture-1-001",
  "Which term pertains to chewing?",
  "What field studies the jaws and masticatory system, including related diagnostic, therapeutic, and rehabilitative procedures?",
  "Which calcified connective tissue covers a tooth root and helps attach it to the supporting apparatus?",
];

for (const marker of prohibited) {
  assert.equal(browserBundle.includes(marker), false, `private draft marker leaked to a browser bundle: ${marker}`);
}

console.log(JSON.stringify({ status: "ok", scannedChunks: files.length, checkedMarkers: prohibited.length }, null, 2));
