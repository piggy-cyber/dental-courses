import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/access";
import { canViewAllCourseData } from "@/lib/admin-permissions";
import { cohortStandingLabel } from "@/lib/cohorts";
import { getTodaysSchedule } from "@/lib/schedule";
import { getCampusWeather } from "@/lib/weather";
import {
  collectionFromRow,
  uniqueCollections,
  type ResourceCollectionSummary,
} from "@/lib/resource-collections";
import { UserAvatar } from "@/components/UserAvatar";
import { StatGauges } from "@/components/StatGauges";
import { WeatherInstrumentPanel } from "@/components/WeatherInstrumentPanel";
import { CampusMapPanel } from "@/components/CampusMapPanel";
import { QuickActionsPanel } from "@/components/QuickActionsPanel";
import { SiteReportSection } from "@/components/SiteReportSection";

export const dynamic = "force-dynamic";

type HomeCourse = {
  code: string;
  title: string;
  semester: string | null;
  area: string | null;
  library_tier: string;
  sort_order: number;
  resource_collection_id: string;
  resource_collections?: ResourceCollectionSummary | ResourceCollectionSummary[] | null;
};

type HomeCourseWithCollection = HomeCourse & {
  collection: ResourceCollectionSummary;
};

type HomeMembership = {
  collection_id: string;
  sort_order: number;
  courses: Omit<HomeCourse, "resource_collection_id" | "resource_collections"> | Omit<
    HomeCourse,
    "resource_collection_id" | "resource_collections"
  >[] | null;
  resource_collections?: ResourceCollectionSummary | ResourceCollectionSummary[] | null;
};

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
      .from("course_collection_members")
      .select(
        "collection_id, sort_order, courses(code, title, semester, area, library_tier, sort_order), resource_collections(id, label, short_label, description, source_tier, source_cohort, sort_order)"
      )
      .order("sort_order"),
    getCampusWeather(),
    getTodaysSchedule(profile?.canvas_ics_url ?? null),
  ]);

  const displayName = profile?.name ?? profile?.email?.split("@")[0] ?? "Student";
  const isAdminView = canViewAllCourseData(profile);
  const handle = profile?.username ? `@${profile.username}` : null;
  const hasCanvasFeed = Boolean(profile?.canvas_ics_url);
  const rawCourseList = ((courses as HomeMembership[] | null) ?? []).flatMap((membership) => {
    const course = Array.isArray(membership.courses) ? membership.courses[0] : membership.courses;
    if (!course) return [];
    return [
      {
        ...course,
        sort_order: membership.sort_order ?? course.sort_order,
        resource_collection_id: membership.collection_id,
        resource_collections: membership.resource_collections,
      },
    ];
  });
  const visibleCollections = uniqueCollections(rawCourseList);
  const courseList: HomeCourseWithCollection[] = rawCourseList.map((course) => ({
    ...course,
    collection: collectionFromRow(course),
  }));
  const coursesByCollection = new Map<string, HomeCourseWithCollection[]>();
  for (const course of courseList) {
    const key = course.collection.id;
    if (!coursesByCollection.has(key)) coursesByCollection.set(key, []);
    coursesByCollection.get(key)!.push(course);
  }

  return (
    <div className="space-y-6">
      {/* Identity strip + stat gauges */}
      <header className="cockpit-panel overflow-hidden">
        <div className="fc-dashboard-intro">
          <div className="fc-dashboard-identity">
            <div className="flex items-center gap-3">
              <UserAvatar
                name={profile?.name}
                email={profile?.email}
                avatarUrl={profile?.avatar_url}
                size="lg"
                className="border border-brand-line"
              />
              <div>
                <p className="eyebrow">{isAdminView ? "Admin desk" : "Student desk"}</p>
                <h1 className="portal-title text-2xl font-bold sm:text-3xl">
                  {displayName}
                </h1>
                <div className="mt-0.5 flex flex-wrap gap-1.5 text-xs">
                  {handle && <span className="font-medium text-brand-muted">{handle}</span>}
                  {visibleCollections.length > 0
                    ? visibleCollections.map((collection) => (
                        <span
                          key={collection.id}
                          className="border border-brand-line bg-brand-soft px-1.5 py-0.5 font-semibold text-brand-navy"
                        >
                          {collection.short_label}
                        </span>
                      ))
                    : profile?.graduation_year
                      ? (
                        <span
                          className="border border-brand-line bg-brand-soft px-1.5 py-0.5 font-semibold text-brand-navy"
                        >
                          {cohortStandingLabel(profile.graduation_year)}
                        </span>
                      )
                      : null}
                </div>
              </div>
            </div>
            <div>
              <p className="mt-4 max-w-xl text-sm leading-6 text-brand-muted">
                Your courses, schedule, study material, and class tools—kept in one
                place so the context that matters is never the part you miss.
              </p>
              <Link href="/profile" className="cockpit-switch mt-4 inline-flex">
                <span className="cockpit-switch-indicator cockpit-switch-indicator-blue" />
                Edit profile
              </Link>
            </div>
          </div>

          <figure className="fc-dashboard-microscopy">
            <div>
              <Image
                src="/brand/fourth-canal-hero-brand-image-v2.png"
                alt="Enamel microscopy field with four anatomical canal strands"
                fill
                priority
                sizes="(max-width: 767px) 100vw, 42vw"
              />
            </div>
            <figcaption>
              <span>Anatomical atlas · fourth trace active</span>
              <strong>04 / 04</strong>
            </figcaption>
          </figure>
        </div>
        <StatGauges
          gauges={[
            { label: "Courses", value: courseCount ?? 0 },
            { label: "Lectures", value: lectureCount ?? 0 },
            { label: "Videos", value: videoCount ?? 0 },
            { label: "Files", value: fileCount ?? 0 },
          ]}
        />
      </header>

      {/* Weather + Campus Map row */}
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <WeatherInstrumentPanel weather={weather} />
        <CampusMapPanel />
      </div>

      {/* Canvas schedule readout */}
      <section className="cockpit-panel">
        <div className="cockpit-section-bar flex items-center justify-between">
          <span>{hasCanvasFeed && schedule ? `Schedule \u00b7 ${schedule.heading}` : "Canvas Schedule"}</span>
          <Link href="/profile" className="text-[10px] font-semibold text-brand-blue hover:underline uppercase">
            {hasCanvasFeed ? "Edit feed" : "Connect"}
          </Link>
        </div>
        <div className="p-4">
          {hasCanvasFeed ? (
            schedule ? (
              schedule.events.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      {schedule.events.slice(0, 6).map((event) => (
                        <tr
                          key={`${event.dateLabel}-${event.time}-${event.title}`}
                          className="border-b border-brand-line last:border-0"
                        >
                          <td className="cockpit-gauge whitespace-nowrap py-2 pr-4 text-xs font-semibold text-brand-navy">
                            {event.dateLabel} &middot; {event.time}
                          </td>
                          <td className="py-2 text-brand-ink">{event.title}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-brand-muted">No upcoming Canvas events found.</p>
              )
            ) : (
              <p className="text-sm text-brand-muted">
                Canvas could not be read right now. Check the saved calendar feed in your profile.
              </p>
            )
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-brand-navy">Add your Canvas feed</p>
                <p className="mt-1 text-sm text-brand-muted">
                  Save your Canvas calendar feed URL in your profile to show classes and deadlines.
                </p>
              </div>
              <Link
                href="/profile"
                className="cockpit-switch"
              >
                <span className="cockpit-switch-indicator cockpit-switch-indicator-amber" />
                Open profile
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Quick actions */}
      <QuickActionsPanel isAdmin={isAdminView} />

      {/* Course collections */}
      {courseList.length > 0 && (
        <section className="space-y-4">
          <div className="cockpit-panel">
            <div className="cockpit-section-bar flex items-center justify-between">
              <span>{isAdminView ? "All Course Collections" : "Your Course Collections"}</span>
              <Link href="/library" className="text-[10px] font-semibold text-brand-blue hover:underline uppercase">
                Search library
              </Link>
            </div>
          </div>

          {visibleCollections.map((collection) => {
            const collectionCourses = coursesByCollection.get(collection.id) ?? [];

            return (
              <section
                key={collection.id}
                className="cockpit-panel overflow-hidden"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-brand-line bg-brand-soft p-3">
                  <div>
                    <p className="eyebrow">{collection.short_label}</p>
                    <h3 className="mt-1 font-bold text-brand-navy">
                      {collection.label}
                    </h3>
                    {collection.description && (
                      <p className="mt-1 text-xs text-brand-muted">{collection.description}</p>
                    )}
                  </div>
                  <span className="cockpit-gauge text-xs text-brand-muted">
                    {collectionCourses.length} course{collectionCourses.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="portal-table min-w-[720px] text-sm">
                    <thead>
                      <tr>
                        <th className="w-28">Code</th>
                        <th>Course</th>
                        <th className="w-40">Area</th>
                        <th className="w-32">Semester</th>
                        {isAdminView && <th className="w-28">Tier</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {collectionCourses.map((course) => (
                        <tr key={`${collection.id}-${course.code}`}>
                          <td className="cockpit-gauge text-xs font-bold text-brand-navy">
                            {course.code}
                          </td>
                          <td>
                            <Link
                              href={`/course/${encodeURIComponent(course.code)}?collection=${encodeURIComponent(collection.id)}`}
                              className="portal-link font-semibold"
                            >
                              {course.title}
                            </Link>
                          </td>
                          <td className="text-xs text-brand-muted">{course.area ?? "-"}</td>
                          <td className="text-xs text-brand-muted">{course.semester ?? "-"}</td>
                          {isAdminView && (
                            <td className="text-xs text-brand-muted">
                              {course.library_tier.toUpperCase()}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </section>
      )}

      {/* Site report */}
      <SiteReportSection />
    </div>
  );
}
