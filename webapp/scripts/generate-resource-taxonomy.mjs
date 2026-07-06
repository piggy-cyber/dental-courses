// Parses webapp/data/resource-taxonomy.md → webapp/src/lib/resource-taxonomy.ts
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mdPath = path.join(root, "data/resource-taxonomy.md");
const outPath = path.join(root, "src/lib/resource-taxonomy.ts");

const md = readFileSync(mdPath, "utf8");

const groupTypeByHeading = {
  Essentials: "essential",
  "Lecture files": "lecture",
  "Labs and extras": "supplemental",
  Inbox: "inbox",
};

const roles = [];
let currentGroup = "supplemental";

for (const line of md.split("\n")) {
  const heading = line.match(/^## (.+)$/);
  if (heading) {
    currentGroup = groupTypeByHeading[heading[1]] ?? "supplemental";
    continue;
  }

  const idMatch = line.match(/^### (.+)$/);
  if (idMatch) {
    roles.push({ id: idMatch[1], group_type: currentGroup, fields: {} });
    continue;
  }

  const kv = line.match(/^(\w+):\s*(.+)$/);
  if (kv && roles.length) {
    const key = kv[1];
    let value = kv[2].trim();
    if (value === "yes") value = true;
    if (value === "no") value = false;
    if (key === "sort") value = Number(value);
    roles[roles.length - 1].fields[key] = value;
  }
}

for (const role of roles) {
  const f = role.fields;
  if (!f.label || !f.kind) {
    console.error(`Role ${role.id} missing label or kind`);
    process.exit(1);
  }
}

const ts = `// AUTO-GENERATED from data/resource-taxonomy.md — do not edit by hand.
// Run: node webapp/scripts/generate-resource-taxonomy.mjs

export type TaxonomyGroupType = "essential" | "lecture" | "supplemental" | "inbox" | "archive";

export type ResourceRoleDef = {
  id: string;
  group_type: TaxonomyGroupType;
  label: string;
  kind: string;
  section: string;
  canonical?: boolean;
  optional?: boolean;
  sort: number;
};

export const RESOURCE_ROLES: ResourceRoleDef[] = ${JSON.stringify(
  roles.map((r) => ({
    id: r.id,
    group_type: r.group_type,
    label: r.fields.label,
    kind: r.fields.kind,
    section: r.fields.section ?? r.fields.label,
    ...(r.fields.canonical ? { canonical: true } : {}),
    ...(r.fields.optional ? { optional: true } : {}),
    sort: r.fields.sort ?? 999,
  })),
  null,
  2
)};

export const RESOURCE_ROLE_BY_ID = Object.fromEntries(
  RESOURCE_ROLES.map((role) => [role.id, role])
) as Record<string, ResourceRoleDef>;

export const ESSENTIAL_ROLES = RESOURCE_ROLES.filter((r) => r.group_type === "essential");
export const LECTURE_ROLES = RESOURCE_ROLES.filter((r) => r.group_type === "lecture");
export const SUPPLEMENTAL_ROLES = RESOURCE_ROLES.filter((r) => r.group_type === "supplemental");
`;

writeFileSync(outPath, ts);
console.log(`Wrote ${outPath} (${roles.length} roles)`);
