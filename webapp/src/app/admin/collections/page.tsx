import Link from "next/link";
import { requireAdminProfile } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/server";
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
  await requireAdminProfile();
  const supabase = await createClient();

  const [{ data: collections }, { data: courses }, { data: resources }, { data: grants }] =
    await Promise.all([
      supabase
        .from("resource_collections")
        .select(
          "id, label, short_label, description, source_tier, source_cohort, default_for_tier, is_active, sort_order"
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
            Collections are the bundles students see on their homepage and library. A student can
            receive multiple collections, such as their D1 year plus prior D2 resources.
          </p>
        </div>
        <Link
          href="/admin/accounts"
          className="rounded-full border border-brand-line bg-white/70 px-4 py-2 text-sm font-semibold text-brand-navy hover:border-brand-blue hover:bg-white"
        >
          Assign to accounts
        </Link>
      </header>

      <CollectionCreateForm />

      <section className="app-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-line bg-brand-soft text-brand-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Collection</th>
              <th className="px-4 py-3 font-semibold">Source</th>
              <th className="px-4 py-3 font-semibold">Courses</th>
              <th className="px-4 py-3 font-semibold">Files</th>
              <th className="px-4 py-3 font-semibold">Grants</th>
              <th className="px-4 py-3 font-semibold">Default</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-line">
            {((collections as Collection[] | null) ?? []).map((collection) => (
              <tr key={collection.id}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-brand-navy">{collection.label}</p>
                  <p className="text-xs text-brand-muted">{collection.short_label}</p>
                  {collection.description && (
                    <p className="mt-1 text-xs text-brand-muted">{collection.description}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-brand-muted">
                  {[collection.source_tier?.toUpperCase(), collection.source_cohort]
                    .filter(Boolean)
                    .join(" · ") || "Manual"}
                </td>
                <td className="px-4 py-3">{courseCounts.get(collection.id) ?? 0}</td>
                <td className="px-4 py-3">{resourceCounts.get(collection.id) ?? 0}</td>
                <td className="px-4 py-3">{grantCounts.get(collection.id) ?? 0}</td>
                <td className="px-4 py-3">
                  {collection.default_for_tier ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                      Auto
                    </span>
                  ) : (
                    <span className="rounded-full bg-brand-soft px-2 py-1 text-xs font-semibold text-brand-muted">
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
