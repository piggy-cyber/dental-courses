import { createClient } from "@/lib/supabase/server";
import { LibrarySearch, type CourseCard } from "@/components/LibrarySearch";
import { getSessionProfile } from "@/lib/access";
import {
  collectionFromRow,
  type ResourceCollectionSummary,
} from "@/lib/resource-collections";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const { profile } = await getSessionProfile();
  const supabase = await createClient();
  const query = supabase
    .from("course_collection_members")
    .select(
      "collection_id, sort_order, courses(code, title, semester, area, sort_order, library_tier), resource_collections(id, label, short_label, description, source_tier, source_cohort, sort_order)"
    )
    .order("sort_order");

  const { data: memberships } = await query;

  if (!memberships?.length) {
    return (
      <div className="app-card p-8 text-center text-brand-muted">
        {profile?.role === "owner"
          ? "No courses loaded yet. Run the seed script to import the course library."
          : "No resource collections are assigned to your account yet."}
      </div>
    );
  }

  type RawCourse = {
    code: string;
    title: string;
    semester: string | null;
    area: string | null;
    sort_order: number;
    library_tier: string;
    resource_collection_id: string;
    resource_collections?: ResourceCollectionSummary | ResourceCollectionSummary[] | null;
  };

  type RawMembership = {
    collection_id: string;
    sort_order: number;
    courses: Omit<RawCourse, "resource_collection_id" | "resource_collections"> | Omit<
      RawCourse,
      "resource_collection_id" | "resource_collections"
    >[] | null;
    resource_collections?: ResourceCollectionSummary | ResourceCollectionSummary[] | null;
  };

  const courseCards: CourseCard[] = ((memberships as RawMembership[] | null) ?? []).flatMap((membership) => {
    const course = Array.isArray(membership.courses) ? membership.courses[0] : membership.courses;
    if (!course) return [];
    const collection = collectionFromRow({
      resource_collection_id: membership.collection_id,
      resource_collections: membership.resource_collections,
    });
    return {
      code: course.code,
      title: course.title,
      semester: course.semester,
      area: course.area,
      collectionId: collection.id,
      collectionLabel: collection.label,
      collectionShortLabel: collection.short_label,
      collectionDescription: collection.description,
      collectionSortOrder: collection.sort_order,
    };
  });

  return (
    <div className="space-y-8">
      <header className="app-card p-6">
        <p className="eyebrow">Library</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-brand-navy">
          Courses by collection
        </h1>
        <p className="mt-2 max-w-2xl text-brand-muted">
          Pick a granted collection, then open the matching course set with its lectures,
          videos, transcripts, and files.
        </p>
      </header>

      <LibrarySearch courses={courseCards} />
    </div>
  );
}
