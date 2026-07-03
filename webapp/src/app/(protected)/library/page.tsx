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
    .from("courses")
    .select(
      "code, title, semester, area, sort_order, library_tier, resource_collection_id, resource_collections(id, label, short_label, description, source_tier, source_cohort, sort_order)"
    )
    .order("sort_order");

  const { data: courses } = await query;

  if (!courses?.length) {
    return (
      <div className="rounded-xl border border-brand-line bg-brand-panel p-8 text-center text-brand-muted">
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

  const courseCards: CourseCard[] = ((courses as RawCourse[] | null) ?? []).map((course) => {
    const collection = collectionFromRow(course);
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
      <header>
        <h1 className="text-2xl font-bold text-brand-navy">Courses</h1>
        <p className="mt-1 text-brand-muted">
          Pick a granted collection, then open its courses, lectures, videos, transcripts, and files.
        </p>
      </header>

      <LibrarySearch courses={courseCards} />
    </div>
  );
}
