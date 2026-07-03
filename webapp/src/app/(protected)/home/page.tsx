import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/access";
import { UserAvatar } from "@/components/UserAvatar";

export const dynamic = "force-dynamic";

export default async function HomeDashboardPage() {
  const { profile } = await getSessionProfile();
  const supabase = await createClient();

  const [
    { count: courseCount },
    { count: lectureCount },
    { count: videoCount },
    { count: fileCount },
    { data: courses },
  ] = await Promise.all([
    supabase.from("courses").select("*", { count: "exact", head: true }),
    supabase.from("lectures").select("*", { count: "exact", head: true }),
    supabase
      .from("lectures")
      .select("*", { count: "exact", head: true })
      .not("youtube_id", "is", null)
      .neq("youtube_visibility", "private"),
    supabase
      .from("resources")
      .select("*", { count: "exact", head: true })
      .not("storage_path", "is", null),
    supabase
      .from("courses")
      .select("code, title, semester, area")
      .order("sort_order")
      .limit(6),
  ]);

  const displayName = profile?.name ?? profile?.email?.split("@")[0] ?? "Student";
  const handle = profile?.username ? `@${profile.username}` : null;

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <UserAvatar
            name={profile?.name}
            email={profile?.email}
            avatarUrl={profile?.avatar_url}
            size="lg"
          />
          <div>
            <p className="eyebrow">Welcome back</p>
            <h1 className="text-2xl font-bold text-brand-navy">{displayName}</h1>
            {handle && <p className="text-sm text-brand-teal">{handle}</p>}
            {profile?.bio && (
              <p className="mt-2 max-w-lg text-sm text-brand-muted">{profile.bio}</p>
            )}
          </div>
        </div>
        <Link
          href="/profile"
          className="rounded-lg border border-brand-line bg-brand-panel px-4 py-2 text-sm font-medium text-brand-navy hover:bg-brand-soft"
        >
          Edit profile
        </Link>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Courses", value: courseCount ?? 0 },
          { label: "Lectures", value: lectureCount ?? 0 },
          { label: "Videos", value: videoCount ?? 0 },
          { label: "Files online", value: fileCount ?? 0 },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-brand-line bg-brand-panel p-5 shadow-sm"
          >
            <p className="text-2xl font-bold text-brand-navy">{stat.value}</p>
            <p className="text-sm text-brand-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <Link
          href="/library"
          className="rounded-xl border border-brand-line bg-brand-panel p-6 shadow-sm transition hover:border-brand-teal hover:shadow-md"
        >
          <p className="eyebrow">Study</p>
          <h2 className="mt-1 text-lg font-bold text-brand-navy">Open course library</h2>
          <p className="mt-2 text-sm text-brand-muted">
            Lectures, YouTube embeds, transcripts, mastery guides, and course files.
          </p>
        </Link>
        <Link
          href="/about"
          className="rounded-xl border border-brand-line bg-brand-panel p-6 shadow-sm transition hover:border-brand-teal hover:shadow-md"
        >
          <p className="eyebrow">About</p>
          <h2 className="mt-1 text-lg font-bold text-brand-navy">Who built this</h2>
          <p className="mt-2 text-sm text-brand-muted">
            Story, disclaimer, and what&apos;s inside the library.
          </p>
        </Link>
      </section>

      {courses && courses.length > 0 && (
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold text-brand-navy">Jump to a course</h2>
            <Link href="/library" className="text-sm text-brand-blue hover:underline">
              View all
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Link
                key={course.code}
                href={`/course/${encodeURIComponent(course.code)}`}
                className="rounded-xl border border-brand-line bg-brand-panel p-4 transition hover:border-brand-blue"
              >
                <p className="text-xs font-semibold uppercase text-brand-blue">
                  {course.code}
                </p>
                <p className="mt-1 font-medium text-brand-ink">{course.title}</p>
                {course.semester && (
                  <p className="mt-1 text-xs text-brand-muted">{course.semester}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
