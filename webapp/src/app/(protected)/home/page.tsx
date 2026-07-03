import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/access";
import { isAdmin } from "@/lib/roles";
import { getTodaysSchedule } from "@/lib/schedule";
import { tierLabel } from "@/lib/tiers";
import { getCampusWeather } from "@/lib/weather";
import { UserAvatar } from "@/components/UserAvatar";
import { SiteReportSection } from "@/components/SiteReportSection";

export const dynamic = "force-dynamic";

type HomeCourse = {
  code: string;
  title: string;
  semester: string | null;
  area: string | null;
  library_tier: string;
  sort_order: number;
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-brand-line bg-brand-panel p-4 shadow-sm">
      <p className="text-2xl font-bold text-brand-navy">{value}</p>
      <p className="text-sm text-brand-muted">{label}</p>
    </div>
  );
}

export default async function HomeDashboardPage() {
  const { profile } = await getSessionProfile();
  const supabase = await createClient();

  const [
    { count: courseCount },
    { count: lectureCount },
    { count: videoCount },
    { count: fileCount },
    { data: courses },
    weather,
    schedule,
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
      .select("code, title, semester, area, library_tier, sort_order")
      .order("sort_order"),
    getCampusWeather(),
    getTodaysSchedule(profile?.canvas_ics_url ?? undefined),
  ]);

  const displayName = profile?.name ?? profile?.email?.split("@")[0] ?? "Student";
  const handle = profile?.username ? `@${profile.username}` : null;
  const courseList = (courses as HomeCourse[] | null) ?? [];
  const coursesBySemester = new Map<string, HomeCourse[]>();
  for (const course of courseList) {
    const key = course.semester ?? "Other";
    if (!coursesBySemester.has(key)) coursesBySemester.set(key, []);
    coursesBySemester.get(key)!.push(course);
  }

  return (
    <div className="space-y-8">
      <header className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <section className="rounded-xl border border-brand-line bg-brand-panel p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <UserAvatar
                name={profile?.name}
                email={profile?.email}
                avatarUrl={profile?.avatar_url}
                size="lg"
              />
              <div>
                <p className="eyebrow">Home</p>
                <h1 className="text-2xl font-bold text-brand-navy">{displayName}</h1>
                <div className="mt-1 flex flex-wrap gap-2 text-xs">
                  {handle && <span className="font-medium text-brand-teal">{handle}</span>}
                  {profile?.access_tiers?.map((tier) => (
                    <span
                      key={tier}
                      className="rounded-full bg-brand-soft px-2 py-0.5 font-semibold text-brand-navy"
                    >
                      {tierLabel(tier)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <Link
              href="/profile"
              className="rounded-lg border border-brand-line px-4 py-2 text-sm font-medium text-brand-navy hover:bg-brand-soft"
            >
              Edit profile
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Courses" value={courseCount ?? 0} />
            <StatCard label="Lectures" value={lectureCount ?? 0} />
            <StatCard label="Videos" value={videoCount ?? 0} />
            <StatCard label="Files online" value={fileCount ?? 0} />
          </div>
        </section>

        <section className="rounded-xl border border-brand-line bg-brand-panel p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Cleveland 44106</p>
              <h2 className="mt-1 text-lg font-bold text-brand-navy">Campus weather</h2>
            </div>
            {weather && (
              <div className="text-right">
                <p className="text-3xl font-bold text-brand-navy">{weather.temperature}°</p>
                <p className="text-xs text-brand-muted">Feels {weather.feelsLike}°</p>
              </div>
            )}
          </div>
          {weather ? (
            <>
              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-lg bg-brand-soft p-3">
                  <p className="font-semibold text-brand-navy">{weather.label}</p>
                  <p className="text-xs text-brand-muted">Current</p>
                </div>
                <div className="rounded-lg bg-brand-soft p-3">
                  <p className="font-semibold text-brand-navy">
                    {weather.high}° / {weather.low}°
                  </p>
                  <p className="text-xs text-brand-muted">High / low</p>
                </div>
                <div className="rounded-lg bg-brand-soft p-3">
                  <p className="font-semibold text-brand-navy">{weather.precipChancePct}%</p>
                  <p className="text-xs text-brand-muted">Rain</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-7 gap-1.5">
                {weather.weekly.map((day) => (
                  <div key={day.date} className="rounded-lg border border-brand-line p-2 text-center">
                    <p className="text-xs font-semibold text-brand-navy">{day.weekday}</p>
                    <p className="mt-1 text-sm font-bold text-brand-ink">{day.high}°</p>
                    <p className="text-xs text-brand-muted">{day.low}°</p>
                    <p className="mt-1 text-[11px] text-brand-muted">{day.precipChancePct}%</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-brand-muted">Weather is temporarily unavailable.</p>
          )}
        </section>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Link
          href="/library"
          className="rounded-xl border border-brand-line bg-brand-panel p-5 shadow-sm transition hover:border-brand-teal"
        >
          <p className="eyebrow">Study</p>
          <h2 className="mt-1 font-bold text-brand-navy">Open all courses</h2>
          <p className="mt-2 text-sm text-brand-muted">Search the full library.</p>
        </Link>
        <Link
          href="/profile"
          className="rounded-xl border border-brand-line bg-brand-panel p-5 shadow-sm transition hover:border-brand-teal"
        >
          <p className="eyebrow">Account</p>
          <h2 className="mt-1 font-bold text-brand-navy">Profile and access</h2>
          <p className="mt-2 text-sm text-brand-muted">Name, avatar, notes, and account info.</p>
        </Link>
        {isAdmin(profile) ? (
          <Link
            href="/admin"
            className="rounded-xl border border-brand-line bg-brand-panel p-5 shadow-sm transition hover:border-brand-gold"
          >
            <p className="eyebrow text-brand-gold">Admin</p>
            <h2 className="mt-1 font-bold text-brand-navy">Control center</h2>
            <p className="mt-2 text-sm text-brand-muted">Accounts, roster, and operations.</p>
          </Link>
        ) : (
          <Link
            href="/about"
            className="rounded-xl border border-brand-line bg-brand-panel p-5 shadow-sm transition hover:border-brand-teal"
          >
            <p className="eyebrow">About</p>
            <h2 className="mt-1 font-bold text-brand-navy">What is this?</h2>
            <p className="mt-2 text-sm text-brand-muted">How the library is organized.</p>
          </Link>
        )}
      </section>

      {schedule && (
        <section className="rounded-xl border border-brand-line bg-brand-panel p-5 shadow-sm">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <div>
              <p className="eyebrow">{schedule.heading}</p>
              <h2 className="mt-1 text-lg font-bold text-brand-navy">Canvas schedule</h2>
            </div>
          </div>
          {schedule.events.length > 0 ? (
            <ul className="divide-y divide-brand-line">
              {schedule.events.slice(0, 6).map((event) => (
                <li
                  key={`${event.dateLabel}-${event.time}-${event.title}`}
                  className="flex gap-4 py-3 text-sm"
                >
                  <span className="w-32 shrink-0 font-semibold text-brand-navy">
                    {event.dateLabel} · {event.time}
                  </span>
                  <span className="text-brand-ink">{event.title}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-brand-muted">No upcoming Canvas events found.</p>
          )}
        </section>
      )}

      {courseList.length > 0 && (
        <section className="space-y-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="eyebrow">Courses</p>
              <h2 className="mt-1 text-xl font-bold text-brand-navy">Quick course navigation</h2>
            </div>
            <Link href="/library" className="text-sm font-medium text-brand-blue hover:underline">
              Search library
            </Link>
          </div>

          {[...coursesBySemester.entries()].map(([semester, semesterCourses]) => (
            <div key={semester}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-muted">
                {semester}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {semesterCourses.map((course) => (
                  <Link
                    key={course.code}
                    href={`/course/${encodeURIComponent(course.code)}`}
                    className="rounded-lg border border-brand-line bg-brand-panel p-4 transition hover:border-brand-blue hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs font-semibold uppercase text-brand-blue">
                        {course.code}
                      </p>
                      {isAdmin(profile) && (
                        <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand-navy">
                          {tierLabel(course.library_tier)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-medium text-brand-ink">{course.title}</p>
                    {course.area && <p className="mt-1 text-xs text-brand-muted">{course.area}</p>}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      <section>
        <div className="mb-4">
          <p className="eyebrow">Useful links</p>
          <h2 className="mt-1 text-lg font-bold text-brand-navy">Common tasks</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/library", label: "Find a course", detail: "Browse or search" },
            { href: "/profile", label: "Update profile", detail: "Avatar and bio" },
            { href: "/about", label: "About the site", detail: "What is included" },
            ...(isAdmin(profile)
              ? [{ href: "/admin/roster", label: "Roster", detail: "Check sign-ins" }]
              : []),
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border border-brand-line bg-brand-panel p-4 transition hover:border-brand-teal"
            >
              <p className="font-semibold text-brand-navy">{item.label}</p>
              <p className="mt-1 text-sm text-brand-muted">{item.detail}</p>
            </Link>
          ))}
        </div>
      </section>

      <SiteReportSection />
    </div>
  );
}
