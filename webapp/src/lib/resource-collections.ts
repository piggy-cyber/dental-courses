export type ResourceCollectionSummary = {
  id: string;
  label: string;
  short_label: string;
  description: string | null;
  source_tier: string | null;
  source_cohort: string | null;
  sort_order: number;
};

type ResourceCollectionRelation = ResourceCollectionSummary | ResourceCollectionSummary[] | null;

export type RowWithResourceCollection = {
  resource_collection_id: string;
  resource_collections?: ResourceCollectionRelation;
};

export function collectionFromRow(row: RowWithResourceCollection): ResourceCollectionSummary {
  const relation = Array.isArray(row.resource_collections)
    ? row.resource_collections[0]
    : row.resource_collections;

  return (
    relation ?? {
      id: row.resource_collection_id,
      label: "Course Resources",
      short_label: "Course Resources",
      description: null,
      source_tier: null,
      source_cohort: null,
      sort_order: 999,
    }
  );
}

export function uniqueCollections<T extends RowWithResourceCollection>(
  rows: T[]
): ResourceCollectionSummary[] {
  const byId = new Map<string, ResourceCollectionSummary>();
  for (const row of rows) {
    const collection = collectionFromRow(row);
    if (!byId.has(collection.id)) byId.set(collection.id, collection);
  }
  return [...byId.values()].sort(
    (a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label)
  );
}
