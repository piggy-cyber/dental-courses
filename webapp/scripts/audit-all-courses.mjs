// Run audit-course-files.mjs for every D1 course and print a summary table.
//
// Usage:  node scripts/audit-all-courses.mjs
//         node scripts/audit-all-courses.mjs --json > reports/course-audit.json
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webappRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const COURSES = [
  "DSPR 136",
  "DSPR 139",
  "HEWB 121",
  "HEWB 123",
  "HEWB 124",
  "HEWB 128",
  "HEWB 130",
  "HEWB 134",
  "HWDP 131",
  "HWDP 142",
  "LDRS 111",
  "LDRS 113",
  "LDRS 118",
  "MAHE 145",
  "REHE 120",
  "REHE 151",
  "REHE 152",
  "REHE 158",
  "REHE 162",
];

const jsonOut = process.argv.includes("--json");
const results = [];

for (const course of COURSES) {
  const run = spawnSync(
    "node",
    ["scripts/audit-course-files.mjs", "--course", course],
    { cwd: webappRoot, encoding: "utf8" }
  );
  const text = (run.stdout || "") + (run.stderr || "");
  const unlinked = text.match(/Unlinked pool \((\d+) files/)?.[1] ?? "?";
  const suggestions = text.match(/Suggested lecture matches \((\d+)\)/)?.[1] ?? "?";
  const misfiles = text.match(/Misfile suspects \((\d+)\)/)?.[1] ?? "?";
  results.push({
    course,
    unlinked: Number(unlinked),
    suggestions: Number(suggestions),
    misfiles: Number(misfiles),
  });
  if (!jsonOut) {
    process.stdout.write(`Audited ${course} — ${unlinked} unlinked, ${suggestions} suggestions\n`);
  }
}

results.sort((a, b) => b.unlinked - a.unlinked);

if (jsonOut) {
  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
} else {
  console.log("\n=== Ranked by unlinked extras ===\n");
  for (const row of results) {
    console.log(
      `${row.course.padEnd(12)} unlinked=${String(row.unlinked).padStart(2)}  suggestions=${row.suggestions}  misfile=${row.misfiles}`
    );
  }
}
