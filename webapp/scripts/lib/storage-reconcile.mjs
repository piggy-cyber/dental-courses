import { existsSync, readdirSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export const DEFAULT_COURSE_FILES_DIR = path.join(
  os.homedir(),
  "Downloads",
  "Case Western D1 Assets"
);

export function readFlagValue(argv, name) {
  const flag = `--${name}`;
  const inline = `${flag}=`;
  const inlineValue = argv.find((arg) => arg.startsWith(inline));
  if (inlineValue) return inlineValue.slice(inline.length);
  const index = argv.indexOf(flag);
  if (index >= 0) return argv[index + 1];
  return null;
}

/** Normalize filename for fuzzy matching (unicode dashes, spacing, case). */
export function normalizeBasename(name) {
  return String(name || "")
    .normalize("NFC")
    .replace(/[''´`]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function sanitizePathSegment(segment) {
  return segment
    .normalize("NFC")
    .replace(/[''´`']/g, "_")
    .replace(/[\[\]#?*]/g, "_")
    .replace(/[^\x00-\x7F]/g, (char) => {
      const map = { "–": "-", "—": "-", "'": "_", "'": "_", "'": "_" };
      return map[char] ?? "_";
    });
}

export function canvasStorageKeyFromRelPath(relPath) {
  return `library/${relPath.split(path.sep).map(sanitizePathSegment).join("/")}`;
}

export async function fetchAllResources(supabase) {
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("resources")
      .select("id, course_code, name, kind, section, storage_path")
      .range(from, from + pageSize - 1);
    if (error) return { data: null, error };
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  return { data: rows, error: null };
}

export async function listStorageKeys(supabase, prefix) {
  const keys = [];
  const { data, error } = await supabase.storage.from("course-files").list(prefix, {
    limit: 1000,
    sortBy: { column: "name", order: "asc" },
  });
  if (error) throw new Error(`storage list ${prefix}: ${error.message}`);
  if (!data?.length) return keys;

  for (const item of data) {
    const full = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id === null) {
      keys.push(...(await listStorageKeys(supabase, full)));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

export async function listAllStorageKeys(supabase) {
  const keys = [];
  for (const root of ["library", "pillars"]) {
    keys.push(...(await listStorageKeys(supabase, root)));
  }
  return keys;
}

export function indexStorageByBasename(storageKeys) {
  const byName = new Map();
  const byNormalized = new Map();
  for (const key of storageKeys) {
    const base = key.split("/").pop();
    const list = byName.get(base) ?? [];
    list.push(key);
    byName.set(base, list);

    const norm = normalizeBasename(base);
    const normList = byNormalized.get(norm) ?? [];
    normList.push({ key, base });
    byNormalized.set(norm, normList);
  }
  return { byName, byNormalized };
}

export function pickStorageKey(resource, candidates) {
  if (!candidates?.length) return null;
  if (candidates.length === 1) return candidates[0];
  const code = resource.course_code.toLowerCase();
  const match = candidates.find((key) => key.toLowerCase().includes(code));
  return match ?? candidates[0];
}

export function walkLocalFiles(dir, rootDir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkLocalFiles(full, rootDir, out);
      continue;
    }
    const relPath = path.relative(rootDir, full);
    const courseFolder = relPath.split(path.sep)[0] ?? "";
    out.push({
      name: entry.name,
      localPath: full,
      relPath,
      courseFolder,
      sizeBytes: statSync(full).size,
    });
  }
  return out;
}

export function scoreLocalCandidate(resource, entry) {
  let score = 0;
  const code = resource.course_code.toLowerCase();
  const folder = entry.courseFolder.toLowerCase();
  if (folder.startsWith(code)) score += 100;
  else if (entry.relPath.toLowerCase().includes(code)) score += 15;

  const section = resource.section;
  if (section && section !== "Course Root" && entry.relPath.toLowerCase().includes(section.toLowerCase())) {
    score += 25;
  }
  score -= entry.relPath.split(path.sep).length * 0.5;
  return score;
}

/** Index local files by exact and normalized basename. */
export function indexLocalFiles(filesRoot, { includeShared = true } = {}) {
  const exact = new Map();
  const normalized = new Map();

  if (!existsSync(filesRoot)) {
    return { exact, normalized, filesRoot };
  }

  const entries = [];

  for (const entry of readdirSync(filesRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith("00 - Organization")) continue;
    if (!includeShared && entry.name.startsWith("00 - Shared")) continue;
    walkLocalFiles(path.join(filesRoot, entry.name), filesRoot, entries);
  }

  for (const file of entries) {
    const exactList = exact.get(file.name) ?? [];
    exactList.push(file);
    exact.set(file.name, exactList);

    const norm = normalizeBasename(file.name);
    const normList = normalized.get(norm) ?? [];
    normList.push(file);
    normalized.set(norm, normList);
  }

  return { exact, normalized, filesRoot };
}

export function resolveLocalFile(resource, index, { searchShared = true } = {}) {
  const { exact, normalized, filesRoot } = index;

  let candidates = exact.get(resource.name);
  if (!candidates?.length) {
    candidates = normalized.get(normalizeBasename(resource.name));
  }

  if (!candidates?.length && searchShared) {
    const sharedRoot = path.join(filesRoot, "00 - Shared Assets");
    if (existsSync(sharedRoot)) {
      const shared = walkLocalFiles(sharedRoot, filesRoot);
      const norm = normalizeBasename(resource.name);
      candidates = shared.filter(
        (f) => f.name === resource.name || normalizeBasename(f.name) === norm
      );
    }
  }

  if (!candidates?.length) return null;
  if (candidates.length === 1) return candidates[0];
  return candidates
    .slice()
    .sort((a, b) => scoreLocalCandidate(resource, b) - scoreLocalCandidate(resource, a))[0];
}

export async function linkExistingStorage(supabase, resources, options = {}) {
  const { courseFilter = null, dryRun = false } = options;

  console.log("Scanning Supabase storage for existing files...");
  const storageKeys = await listAllStorageKeys(supabase);
  console.log(`Found ${storageKeys.length} objects in course-files bucket`);

  const { byName, byNormalized } = indexStorageByBasename(storageKeys);

  let linked = 0;
  let alreadyLinked = 0;
  let notInStorage = 0;

  for (const resource of resources) {
    if (courseFilter && resource.course_code !== courseFilter) continue;
    if (resource.kind === "Local Media Source" || resource.kind === "Transcript") continue;
    if (resource.storage_path) {
      alreadyLinked += 1;
      continue;
    }

    let key = pickStorageKey(resource, byName.get(resource.name));
    if (!key) {
      key = pickStorageKey(resource, byNormalized.get(normalizeBasename(resource.name))?.map((e) => e.key));
    }
    if (!key) {
      notInStorage += 1;
      continue;
    }

    if (dryRun) {
      console.log(`[dry] link ${resource.course_code} · ${resource.name} -> ${key}`);
      linked += 1;
      continue;
    }

    const { data: updated, error: updateError } = await supabase
      .from("resources")
      .update({ storage_path: key })
      .eq("course_code", resource.course_code)
      .eq("name", resource.name)
      .is("storage_path", null)
      .select("id");
    if (updateError) {
      console.warn(`Could not link ${resource.name}: ${updateError.message}`);
      continue;
    }
    linked += updated?.length ?? 0;
    process.stdout.write(`Linked ${linked} files...\r`);
  }

  console.log("");
  console.log(
    `Done. Linked ${linked}, already linked ${alreadyLinked}, not in storage ${notInStorage}` +
      (courseFilter ? ` (course: ${courseFilter})` : "") +
      "."
  );

  return { linked, alreadyLinked, notInStorage };
}

export function findDuplicateResources(resources) {
  const groups = new Map();
  for (const r of resources) {
    if (r.kind === "Local Media Source" || r.kind === "Transcript") continue;
    const key = `${r.course_code}\0${r.name}`;
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([key, list]) => ({
      courseCode: key.split("\0")[0],
      name: key.split("\0")[1],
      rows: list,
    }));
}

export function buildReconcileReport(resources, storageKeys, localIndex, options = {}) {
  const { courseFilter = null, maxMb = Number(process.env.UPLOAD_MAX_MB || 50) } = options;
  const { byName: storageByName } = indexStorageByBasename(storageKeys);

  const duplicates = findDuplicateResources(resources);
  const byCourse = new Map();
  const needsUpload = [];
  const notFound = [];
  const oversized = [];
  const bucketUnlinked = [];

  for (const resource of resources) {
    if (courseFilter && resource.course_code !== courseFilter) continue;
    if (resource.kind === "Local Media Source" || resource.kind === "Transcript") continue;

    const summary = byCourse.get(resource.course_code) ?? {
      linked: 0,
      needsUpload: 0,
      notFound: 0,
      bucketUnlinked: 0,
    };

    if (resource.storage_path) {
      summary.linked += 1;
      byCourse.set(resource.course_code, summary);
      continue;
    }

    const bucketKey = pickStorageKey(resource, storageByName.get(resource.name));
    if (bucketKey) {
      summary.bucketUnlinked += 1;
      bucketUnlinked.push({
        courseCode: resource.course_code,
        name: resource.name,
        storageKey: bucketKey,
        resourceId: resource.id,
      });
      byCourse.set(resource.course_code, summary);
      continue;
    }

    const local = resolveLocalFile(resource, localIndex, { searchShared: true });
    if (local) {
      const sizeMb = local.sizeBytes / (1024 * 1024);
      const proposedKey = canvasStorageKeyFromRelPath(local.relPath);
      const entry = {
        courseCode: resource.course_code,
        name: resource.name,
        localPath: local.localPath,
        relPath: local.relPath,
        sizeMb: Math.round(sizeMb * 100) / 100,
        proposedStorageKey: proposedKey,
        resourceId: resource.id,
        oversized: sizeMb > maxMb,
      };
      if (entry.oversized) oversized.push(entry);
      else needsUpload.push(entry);
      summary.needsUpload += 1;
      byCourse.set(resource.course_code, summary);
      continue;
    }

    notFound.push({
      courseCode: resource.course_code,
      name: resource.name,
      resourceId: resource.id,
    });
    summary.notFound += 1;
    byCourse.set(resource.course_code, summary);
  }

  return {
    generatedAt: new Date().toISOString(),
    courseFilter,
    filesRoot: localIndex.filesRoot,
    byCourse: Object.fromEntries([...byCourse.entries()].sort()),
    totals: {
      linked: [...byCourse.values()].reduce((s, c) => s + c.linked, 0),
      bucketUnlinked: bucketUnlinked.length,
      needsUpload: needsUpload.length,
      notFound: notFound.length,
      oversized: oversized.length,
      duplicates: duplicates.length,
    },
    bucketUnlinked,
    needsUpload,
    notFound,
    oversized,
    duplicates: duplicates.map((d) => ({
      courseCode: d.courseCode,
      name: d.name,
      rowCount: d.rows.length,
      rowIds: d.rows.map((r) => r.id),
      linkedCount: d.rows.filter((r) => r.storage_path).length,
    })),
  };
}

export function formatReportMarkdown(report) {
  const lines = [];
  lines.push(`# Storage reconcile report`);
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Local root: \`${report.filesRoot}\``);
  if (report.courseFilter) lines.push(`Course filter: ${report.courseFilter}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`| Status | Count |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Linked in DB | ${report.totals.linked} |`);
  lines.push(`| In bucket, not linked (run --link) | ${report.totals.bucketUnlinked} |`);
  lines.push(`| Ready to upload (local file found) | ${report.totals.needsUpload} |`);
  lines.push(`| Oversized (over ${process.env.UPLOAD_MAX_MB || 50} MB) | ${report.totals.oversized} |`);
  lines.push(`| Not found on disk | ${report.totals.notFound} |`);
  lines.push(`| Duplicate DB rows | ${report.totals.duplicates} |`);
  lines.push("");
  lines.push("## Per course");
  lines.push("");
  lines.push("| Course | Linked | Needs upload | Not found | Bucket unlinked |");
  lines.push("|--------|--------|--------------|-----------|-----------------|");
  for (const [code, s] of Object.entries(report.byCourse).sort()) {
    lines.push(`| ${code} | ${s.linked} | ${s.needsUpload} | ${s.notFound} | ${s.bucketUnlinked} |`);
  }

  if (report.duplicates.length) {
    lines.push("");
    lines.push("## Duplicate resource rows");
    lines.push("");
    for (const d of report.duplicates) {
      lines.push(`- **${d.courseCode}** · ${d.name} (${d.rowCount} rows, ${d.linkedCount} linked)`);
    }
  }

  if (report.needsUpload.length) {
    lines.push("");
    lines.push("## Ready to upload");
    lines.push("");
    lines.push("| Course | File | Size (MB) | Local path | Proposed storage key |");
    lines.push("|--------|------|-----------|------------|----------------------|");
    for (const row of report.needsUpload) {
      lines.push(
        `| ${row.courseCode} | ${row.name.replace(/\|/g, "\\|")} | ${row.sizeMb} | \`${row.localPath}\` | \`${row.proposedStorageKey}\` |`
      );
    }
  }

  if (report.oversized.length) {
    lines.push("");
    lines.push("## Oversized (blocked until UPLOAD_MAX_MB raised)");
    lines.push("");
    for (const row of report.oversized) {
      lines.push(`- **${row.courseCode}** · ${row.name} (${row.sizeMb} MB) — \`${row.localPath}\``);
    }
  }

  if (report.notFound.length) {
    lines.push("");
    lines.push("## Not found on disk");
    lines.push("");
    for (const row of report.notFound) {
      lines.push(`- **${row.courseCode}** · ${row.name}`);
    }
  }

  if (report.bucketUnlinked.length) {
    lines.push("");
    lines.push("## In bucket but not linked (run \`--link\`)");
    lines.push("");
    for (const row of report.bucketUnlinked.slice(0, 50)) {
      lines.push(`- **${row.courseCode}** · ${row.name}`);
    }
    if (report.bucketUnlinked.length > 50) {
      lines.push(`- … and ${report.bucketUnlinked.length - 50} more`);
    }
  }

  lines.push("");
  return lines.join("\n");
}
