import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CourseBreadcrumb } from "@/components/CourseBreadcrumb";
import { CourseReportSection } from "@/components/CourseReportSection";
import {
  CourseEssentialsPanel,
  ResourceFileRow,
} from "@/components/CourseResourceRows";
import { CourseLectureSection } from "@/components/CourseLectureSection";
import {
  getSourceLectureRows,
  organizeCourseResources,
  relatedResourcesForLecture,
  type CourseResource,
} from "@/lib/course-organize";
import { groupLecturesForDisplay } from "@/lib/lecture-groups";
import {
  isEmbeddable,
  matchFilenameToYoutube,
} from "@/lib/youtube-catalog";
import { CollapsibleVideoEmbed } from "@/components/CollapsibleVideoEmbed";

export const dynamic = "force-dynamic";

type Lecture = {
  id: string;
  title: string;
  lecture_date: string | null;
  transcript_source: string | null;
  youtube_id: string | null;
  youtube_visibility: string | null;
  synthetic: boolean;
  sort_order: number;
};

type Course = {
  code: string;
  title: string;
  semester: string | null;
  resource_collection_id: string;
  resource_collections:
    | {
        id: string;
        label: string;
        short_label: string;
      }
    | {
        id: string;
        label: string;
        short_label: string;
      }[]
    | null;
};

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-line bg-white px-3 py-1 text-xs">
      <span className="font-semibold text-brand-navy">{value}</span>
      <span className="text-brand-muted">{label}</span>
    </span>
  );
}

export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ collection?: string }>;
}) {
  const { code } = await params;
  const { collection: requestedCollectionId } = await searchParams;
  const courseCode = decodeURIComponent(code);
  const supabase = await createClient();

  let membershipQuery = supabase
    .from("course_collection_members")
    .select(
      "collection_id, courses(code, title, semester, resource_collection_id), resource_collections(id, label, short_label)"
    )
    .eq("course_code", courseCode)
    .order("sort_order")
    .limit(1);

  if (requestedCollectionId) {
    membershipQuery = membershipQuery.eq("collection_id", requestedCollectionId);
  }

  const { data: membershipRows } = await membershipQuery;
  const membership = membershipRows?.[0] as
    | {
        collection_id: string;
        courses: Course | Course[] | null;
        resource_collections:
          | {
              id: string;
              label: string;
              short_label: string;
            }
          | {
              id: string;
              label: string;
              short_label: string;
            }[]
          | null;
      }
    | undefined;

  if (!membership) notFound();

  const course = Array.isArray(membership.courses) ? membership.courses[0] : membership.courses;
  if (!course) notFound();

  const collection = Array.isArray(membership.resource_collections)
    ? membership.resource_collections[0]
    : membership.resource_collections;
  const resourceCollectionId = membership.collection_id;

  const [{ data: lectures }, { data: resources }, { data: transcriptRows }] =
    await Promise.all([
      supabase
        .from("lectures")
        .select(
          "id, title, lecture_date, transcript_source, youtube_id, youtube_visibility, synthetic, sort_order"
        )
        .eq("course_code", courseCode)
        .eq("resource_collection_id", resourceCollectionId)
        .order("sort_order"),
      supabase
        .from("resources")
        .select("id, name, kind, ext, section, use_label, size_mb, storage_path, is_canonical_syllabus")
        .eq("course_code", courseCode)
        .eq("resource_collection_id", resourceCollectionId)
        .order("name"),
      supabase.from("transcripts").select("lecture_id"),
    ]);

  const hasTranscript = new Set(
    (transcriptRows ?? []).map((row: { lecture_id: string }) => row.lecture_id)
  );

  const resourceList = (resources as CourseResource[]) ?? [];
  const { essentials, pool, archive, sourceResources } = organizeCourseResources(
    courseCode,
    course.title,
    resourceList
  );

  const sourceRows = getSourceLectureRows(courseCode);
  const sourceById = new Map(sourceRows.map((row) => [row.id, row]));
  const lectureIndexById = new Map<string, number>();
  sourceRows
    .filter((row) => row.date)
    .slice()
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .forEach((row, index) => lectureIndexById.set(row.id, index + 1));

  const lectureList = (lectures as Lecture[]) ?? [];
  const linkedNames = new Set<string>();

  const lecturesWithFiles = lectureList.map((lecture) => {
    const source = sourceById.get(lecture.id);
    const files = relatedResourcesForLecture(
      courseCode,
      lecture.title,
      source?.lectureFiles ?? [],
      pool,
      sourceResources,
      { lectureIndex: lectureIndexById.get(lecture.id) }
    );
    for (const file of files) linkedNames.add(file.name);
    return { lecture, files };
  });

  const supplemental = pool.filter((r) => !linkedNames.has(r.name));
  const supplementalByKind = new Map<string, CourseResource[]>();
  for (const resource of supplemental) {
    const kind = resource.kind ?? "Other";
    if (!supplementalByKind.has(kind)) supplementalByKind.set(kind, []);
    supplementalByKind.get(kind)!.push(resource);
  }

  const mediaResources = resourceList.filter((r) => r.kind === "Local Media Source");

  const videoCount = lectureList.filter(
    (lecture) => lecture.youtube_id && lecture.youtube_visibility !== "private"
  ).length;
  const supplementalVideoCount = mediaResources.filter((resource) => {
    const video = matchFilenameToYoutube(resource.name);
    return video && isEmbeddable(video);
  }).length;

  const transcriptCount = lectureList.filter((l) => hasTranscript.has(l.id)).length;
  const uploadedFileCount = resourceList.filter(
    (resource) => resource.storage_path && resource.kind !== "Local Media Source"
  ).length;
  const activeFileCount = resourceList.filter(
    (resource) => resource.kind !== "Local Media Source" && !archive.some((item) => item.id === resource.id)
  ).length;

  const reportableResources = resourceList.filter(
    (resource) =>
      resource.kind !== "Local Media Source" &&
      !archive.some((item) => item.id === resource.id)
  );

  const organized = groupLecturesForDisplay(lecturesWithFiles);
  const hasModules = organized.moduleGroups.length > 0;
  const hasClass = organized.classGroups.length > 0;
  const hasSessions = organized.classGroups.some((group) => group.kind === "session");
  const lectureBlurb =
    hasModules && hasClass
      ? "Video modules first (YouTube + parts), then in-class Echo360 sessions — everything for this course in one place."
      : hasModules
        ? "Numbered video modules with transcript and shared slides per topic."
        : hasSessions
          ? "Each class session covers several topics in one recording and transcript."
          : "Each lecture links its video, transcript, slide deck, and related files.";

  return (
    <div className="space-y-10">
      <header className="overflow-hidden rounded-2xl border border-brand-line bg-gradient-to-br from-brand-navy via-[#1e4a72] to-brand-teal p-6 text-white shadow-[var(--brand-shadow)] sm:p-8">
        <CourseBreadcrumb courseCode={course.code} courseTitle={course.title} />
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white/70">
              {[collection?.short_label, course.semester].filter(Boolean).join(" · ")}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              {course.code}
              <span className="font-normal text-white/90"> · {course.title}</span>
            </h1>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <StatChip label="lectures" value={lectureList.length} />
          <StatChip label="transcripts" value={transcriptCount} />
          <StatChip label="videos" value={videoCount + supplementalVideoCount} />
          <StatChip label="files online" value={`${uploadedFileCount}/${activeFileCount}`} />
        </div>
      </header>

      <CourseEssentialsPanel essentials={essentials} />

      <section className="space-y-5">
        <div>
          <p className="eyebrow">Lecture path</p>
          <h2 className="mt-1 text-xl font-bold text-brand-navy">Lectures</h2>
          <p className="mt-1 text-sm text-brand-muted">{lectureBlurb}</p>
        </div>
        <CourseLectureSection
          lecturesWithFiles={lecturesWithFiles}
          hasTranscript={hasTranscript}
        />
      </section>

      {mediaResources.length > 0 && (
        <section className="space-y-4">
          <div>
            <p className="eyebrow">Watch</p>
            <h2 className="mt-1 text-xl font-bold text-brand-navy">Supplemental videos</h2>
          </div>
          <ul className="divide-y divide-brand-line overflow-hidden rounded-xl border border-brand-line bg-brand-panel">
            {mediaResources.map((resource) => {
              const video = matchFilenameToYoutube(resource.name);
              const embeddable = video && isEmbeddable(video);
              return (
                <li key={resource.id} className="px-4 py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-brand-ink">{resource.name}</p>
                    {!video && (
                      <span className="text-xs text-brand-muted">Not on YouTube yet</span>
                    )}
                  </div>
                  {embeddable && video && (
                    <div className="mt-3">
                      <CollapsibleVideoEmbed
                        youtubeId={video.id}
                        title={video.title || resource.name}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {supplemental.length > 0 && (
        <section className="space-y-4">
          <div>
            <p className="eyebrow">Beyond lectures</p>
            <h2 className="mt-1 text-xl font-bold text-brand-navy">Labs, flashcards & extras</h2>
            <p className="mt-1 text-sm text-brand-muted">
              {supplemental.length} files not tied to a specific lecture — lab guides, Anki decks,
              and reference material.
            </p>
          </div>
          {[...supplementalByKind.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([kind, items]) => (
              <div key={kind}>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-brand-muted">
                  {kind} ({items.length})
                </h3>
                <ul className="divide-y divide-brand-line overflow-hidden rounded-xl border border-brand-line bg-brand-panel">
                  {items.map((resource) => (
                    <ResourceFileRow key={resource.id} resource={resource} />
                  ))}
                </ul>
              </div>
            ))}
        </section>
      )}

      {archive.length > 0 && (
        <details className="rounded-xl border border-dashed border-brand-line bg-brand-soft/50 p-4">
          <summary className="cursor-pointer text-sm font-medium text-brand-muted">
            Archived / survival-guide copies ({archive.length}) — likely duplicates from other
            courses or old class folders
          </summary>
          <ul className="mt-3 divide-y divide-brand-line overflow-hidden rounded-lg border border-brand-line bg-white">
            {archive.map((resource) => (
              <ResourceFileRow key={resource.id} resource={resource} />
            ))}
          </ul>
        </details>
      )}

      <CourseReportSection courseCode={courseCode} resources={reportableResources} />
    </div>
  );
}
