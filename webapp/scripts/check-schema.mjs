import { loadEnv } from "./lib/data.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const webappRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnv(webappRoot);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const tables = [
  "profiles",
  "courses",
  "lectures",
  "transcripts",
  "resources",
  "resource_collections",
  "profile_resource_collection_grants",
];
for (const table of tables) {
  const { error } = await supabase.from(table).select("*").limit(0);
  console.log(`${table}: ${error ? error.message : "ok"}`);
}

const { error: profileFieldsError } = await supabase
  .from("profiles")
  .select("username, bio, avatar_url, updated_at, canvas_ics_url")
  .limit(0);
console.log(`profile fields: ${profileFieldsError ? profileFieldsError.message : "ok"}`);

const { error: accessFieldsError } = await supabase
  .from("profiles")
  .select("access_note, approved_by")
  .limit(0);
console.log(`access fields: ${accessFieldsError ? accessFieldsError.message : "ok"}`);

const { error: collectionCourseError } = await supabase
  .from("courses")
  .select("resource_collection_id")
  .limit(0);
console.log(
  `course collection field: ${collectionCourseError ? collectionCourseError.message : "ok"}`
);

const { error: collectionContentError } = await supabase
  .from("resources")
  .select("resource_collection_id")
  .limit(0);
console.log(
  `resource collection field: ${collectionContentError ? collectionContentError.message : "ok"}`
);

const { error: collectionFieldsError } = await supabase
  .from("resource_collections")
  .select("id, label, short_label, source_tier, source_cohort, default_for_tier")
  .limit(0);
console.log(
  `resource collection fields: ${collectionFieldsError ? collectionFieldsError.message : "ok"}`
);

const { data: buckets } = await supabase.storage.listBuckets();
const bucketNames = new Set((buckets ?? []).map((b) => b.name));
for (const name of ["course-files", "avatars"]) {
  console.log(`bucket ${name}: ${bucketNames.has(name) ? "ok" : "missing"}`);
}
