import Link from "next/link";
import { requireAdminProfile } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/server";
import { collectionVintageLabel } from "@/lib/cohorts";
import { CollectionCreateForm } from "./CollectionCreateForm";

export const dynamic = "force-dynamic";

type Collection = {
  id: string;
  label: string;
  short_label: string;
  description: string | null;
  source_tier: string | null;
  source_cohort: string | null;
  default_for_tier: boolean;
  graduation_year: number | null;
  curriculum_year: number | null;
  academic_year_start: number | null;
  cumulative_access: boolean;
  is_active: boolean;
  sort_order: number;
};

type CourseRow = {
  collection_id: string;
};

type ResourceRow = {
  resource_collection_id: string;
};

type GrantRow = {
  collection_id: string;
};

function increment(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

export default async function AdminCollectionsPage() {
  await requireAdminProfile("collections.manage");
  const supabase = await createClient();

  const [{ data: collections }, { data: courses }, { data: resources }, { data: grants }] =
    await Promise.all([
      supabase
        .from("resource_collections")
        .select(
          "id, label, short_label, description, source_tier, source_cohort, default_for_tier, graduation_year, curriculum_year, academic_year_start, cumulative_access, is_active, sort_order"
        )
        .order("sort_order")
        .order("label"),
      supabase.from("course_collection_members").select("collection_id"),
      supabase.from("resources").select("resource_collection_id"),
      supabase.from("profile_resource_collection_grants").select("collection_id"),
    ]);

  const courseCounts = new Map<string, number>();
  for (const row of ((courses as CourseRow[] | null) ?? [])) {
    increment(courseCounts, row.collection_id);
  }

  const resourceCounts = new Map<string, number>();
  for (const row of ((resources as ResourceRow[] | null) ?? [])) {
    increment(resourceCounts, row.resource_collection_id);
  }

  const grantCounts = new Map<string, number>();
  for (const row of ((grants as GrantRow[] | null) ?? [])) {
    increment(grantCounts, row.collection_id);
  }

  return (
    <div className="space-y-8">
      <header className="app-card flex flex-wrap items-start justify-between gap-3 p-6">
        <div>
          <p className="eyebrow text-brand-gold">Admin</p>
          <h1 className="mt-1 text-2xl font-bold text-brand-navy">Resource collections</h1>
          <p className="mt-1 max-w-2xl text-brand-muted">
            Every class resource set keeps a permanent class, D-year, and academic-year label.
            Cumulative sets stay available as that class advances.
          </p>
        </div>
        <Link
          href="/admin/accounts"
          className="portal-button px-4 py-2 text-sm"
        >
          Assign to accounts
        </Link>
      </header>

      <CollectionCreateForm />

      <section className="app-card overflow-hidden">
        <table className="portal-table w-full text-sm">
          <thead>
            <tr>
              <th>Collection</th>
              <th>Permanent vintage</th>
              <th>Courses</th>
              <th>Files</th>
              <th>Grants</th>
              <th>Access</th>
            </tr>
          </thead>
          <tbody>
            {((collections as Collection[] | null) ?? []).map((collection) => (
              <tr key={collection.id}>
                <td>
                  <p className="font-semibold text-brand-navy">{collection.label}</p>
                  <p className="text-xs text-brand-muted">{collection.short_label}</p>
                  <p className="font-mono text-xs text-brand-muted">{collection.id}</p>
                  {collection.description && (
                    <p className="mt-1 text-xs text-brand-muted">{collection.description}</p>
                  )}
                </td>
                <td className="text-brand-muted">
                  {collectionVintageLabel(collection)}
                </td>
                <td>{courseCounts.get(collection.id) ?? 0}</td>
                <td>{resourceCounts.get(collection.id) ?? 0}</td>
                <td>{grantCounts.get(collection.id) ?? 0}</td>
                <td>
                  {collection.cumulative_access ? (
                    <span className="border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                      Cumulative
                    </span>
                  ) : (
                    <span className="border border-brand-line bg-brand-soft px-2 py-1 text-xs font-semibold text-brand-muted">
                      Manual
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
