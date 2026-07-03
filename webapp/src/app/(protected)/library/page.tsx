import { createClient } from "@/lib/supabase/server";
import { LibrarySearch } from "@/components/LibrarySearch";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("code, title, semester, area, sort_order")
    .order("sort_order");

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
