import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const localEnvironment = await readFile(join(repositoryRoot, ".env.local"), "utf8");
for (const line of localEnvironment.split(/\r?\n/)) {
  const separator = line.indexOf("=");
  if (separator <= 0 || line.startsWith("#")) continue;
  const key = line.slice(0, separator).trim();
  const value = line.slice(separator + 1).trim().replace(/^"|"$/g, "");
  if (key && !process.env[key]) process.env[key] = value;
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const count = async (table, configure = (query) => query) => {
  const result = await configure(supabase.from(table).select("*", { count: "exact", head: true }));
  if (result.error) throw new Error(`${table}: ${result.error.message}`);
  return result.count ?? 0;
};

const [sourceBanks, learnerEligibleSourceDerivedBanks, founderReviewPracticeProblemBanks, staleVariants, legacySessions] = await Promise.all([
  count("practice_banks", (query) => query.eq("provenance", "source_derived").eq("bank_kind", "recall_practice").eq("status", "published")),
  count("practice_banks", (query) => query.eq("provenance", "source_derived").neq("bank_kind", "recall_practice").eq("status", "published")),
  count("practice_banks", (query) => query.eq("provenance", "source_derived").eq("bank_kind", "practice_problem").eq("status", "review")),
  count("practice_variants", (query) => query.eq("review_status", "stale").eq("status", "stale")),
  count("practice_sessions", (query) => query.eq("metric_scope", "legacy")),
]);

assert.equal(sourceBanks, 191, "Every imported source bank must be delivered as Recall Practice.");
assert.equal(learnerEligibleSourceDerivedBanks, 0, "No source-derived bank may be learner eligible before founder release.");
assert.equal(founderReviewPracticeProblemBanks, 1, "The 25-item Omar-derived pilot must remain a single Founder Review Draft bank.");
assert.equal(staleVariants, 16212, "Retired automatic variants must remain auditable but unavailable.");
console.log(JSON.stringify({ status: "ok", sourceBanks, learnerEligibleSourceDerivedBanks, founderReviewPracticeProblemBanks, staleVariants, legacySessions }, null, 2));
