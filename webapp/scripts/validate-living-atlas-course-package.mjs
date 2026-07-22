import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const courseCode = "REHE 151";
const courseSlug = "d1-fall-rehe-151-dental-anatomy";
const lectureOneSourceId = "quizlet-932842633";
const lectureOneBankId = "living-atlas-dental-anatomy-lecture-1";

const localEnvironment = await readFile(resolve(process.cwd(), ".env.local"), "utf8");
for (const line of localEnvironment.split(/\r?\n/)) {
  const separator = line.indexOf("=");
  if (separator <= 0 || line.startsWith("#")) continue;
  const key = line.slice(0, separator).trim();
  const value = line.slice(separator + 1).trim().replace(/^"|"$/g, "");
  if (key && !process.env[key]) process.env[key] = value;
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const getRows = async (query, name) => {
  const { data, error } = await query;
  if (error) throw new Error(`${name} could not be loaded: ${error.message}`);
  return data ?? [];
};

const [course, courseSources, banks, sourceCards, testEligibleVersions] = await Promise.all([
  getRows(supabase.from("practice_course_catalog").select("course_code, slug, academic_year, term").eq("course_code", courseCode), "course catalog"),
  getRows(supabase.from("practice_course_sources").select("source_id").eq("course_code", courseCode), "course source catalog"),
  getRows(supabase.from("practice_banks").select("id, source_id, course_code, course_slug, bank_kind, provenance, status").eq("id", lectureOneBankId), "Lecture 1 recall bank"),
  getRows(supabase.from("practice_questions").select("id, source_order, original_question, original_answer, source_image_url").eq("source_id", lectureOneSourceId).order("source_order"), "Lecture 1 source cards"),
  getRows(supabase.from("practice_bank_versions").select("id").eq("bank_id", lectureOneBankId).neq("status", "retired"), "eligible Test Mode versions"),
]);

assert.equal(course.length, 1);
assert.equal(course[0].slug, courseSlug);
assert.equal(course[0].academic_year, "D1");
assert.equal(course[0].term, "Fall");
assert.equal(courseSources.length, 14, "All captured Dental Anatomy source sets stay registered.");
assert.equal(banks.length, 1);
assert.equal(banks[0].source_id, lectureOneSourceId);
assert.equal(banks[0].bank_kind, "recall_practice");
assert.equal(banks[0].provenance, "source_derived");
assert.equal(banks[0].status, "published");
assert.equal(sourceCards.length, 51);
assert.equal(sourceCards.filter((card) => card.source_image_url).length, 25);
assert.equal(testEligibleVersions.length, 0, "Quizlet source cards may not have an active Test Mode version.");
for (const [index, card] of sourceCards.entries()) {
  assert.equal(card.source_order, index + 1, "Recall cards must retain source order.");
  assert.ok(card.original_question?.trim(), "Each Recall card preserves its source prompt.");
  assert.ok(card.original_answer?.trim(), "Each Recall card preserves its keyed source answer.");
}
console.log(JSON.stringify({ status: "ok", course: courseSlug, sourceSets: courseSources.length, recallCards: sourceCards.length, imageCards: 25, eligibleTestVersions: testEligibleVersions.length }, null, 2));
