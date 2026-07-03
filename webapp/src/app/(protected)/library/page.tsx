import { createClient } from "@/lib/supabase/server";
import { LibrarySearch } from "@/components/LibrarySearch";
import { getSessionProfile } from "@/lib/access";
import { isAdmin } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const { profile } = await getSessionProfile();
  const supabase = await createClient();
  let query = supabase
    .from("courses")
    .select("code, title, semester, area, sort_order, library_tier")
    .order("sort_order");

  if (!isAdmin(profile)) {
    const tiers = profile?.access_tiers ?? [];
    if (tiers.length === 0) {
      return (
        <div className="rounded-xl border border-brand-line bg-brand-panel p-8 text-center text-brand-muted">
          No course tiers are assigned to your account yet.
        </div>
      );
    }
    query = query.in("library_tier", tiers);
  }

  const { data: courses } = await query;

  if (!courses?.length) {
    return (
      <div className="rounded-xl border border-brand-line bg-brand-panel p-8 text-center text-brand-muted">
        No courses loaded yet. Run the seed script to import the course library.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-brand-navy">Courses</h1>
        <p className="mt-1 text-brand-muted">
          Pick a course to see its lectures, videos, transcripts, and files.
        </p>
      </header>

      <LibrarySearch courses={courses} />
    </div>
  );
}
