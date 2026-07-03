import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TranscriptButton } from "@/components/TranscriptButton";
import {
  CourseEssentialsPanel,
  ResourceFileRow,
} from "@/components/CourseResourceRows";
import {
  getSourceLectureRows,
  organizeCourseResources,
  relatedResourcesForLecture,
  type CourseResource,
} from "@/lib/course-organize";
import {
  isEmbeddable,
  matchFilenameToYoutube,
} from "@/lib/youtube-catalog";

export const dynamic = "force-dynamic";

type Lecture = {
  id: string;
  title: string;
  lecture_date: string | null;
  transcript_source: string | null;
  youtube_id: string | null;
  youtube_visibility: string | null;
  synthetic: boolean;
};

export default async function CoursePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const courseCode = decodeURIComponent(code);
  const supabase = await createClient();

  const [{ data: course }, { data: lectures }, { data: resources }, { data: transcriptRows }] =
    await Promise.all([
      supabase.from("courses").select("code, title, semester").eq("code", courseCode).single(),
      supabase
        .from("lectures")
        .select(
          "id, title, lecture_date, transcript_source, youtube_id, youtube_visibility, synthetic"
        )
        .eq("course_code", courseCode)
        .order("sort_order"),
      supabase
        .from("resources")
        .select("id, name, kind, ext, section, size_mb, storage_path, is_canonical_syllabus")
        .eq("course_code", courseCode)
        .order("name"),
      supabase.from("transcripts").select("lecture_id"),
    ]);

  if (!course) notFound();

  const hasTranscript = new Set(
    (transcriptRows ?? []).map((row: { lecture_id: string }) => row.lecture_id)
  );

  const resourceList = (resources as CourseResource[]) ?? [];
  const { essentials, pool, archive, sourceResources } = organizeCourseResources(
    courseCode,
    course.title,
    resourceList
  );

  const sourceById = new Map(getSourceLectureRows(courseCode).map((row) => [row.id, row]));

  const lectureList = ((lectures as Lecture[]) ?? []).filter((l) => !l.synthetic);
  const linkedNames = new Set<string>();

  const lecturesWithFiles = lectureList.map((lecture) => {
    const source = sourceById.get(lecture.id);
    const files = relatedResourcesForLecture(
      courseCode,
      lecture.title,
      source?.lectureFiles ?? [],
      pool,
      sourceResources
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

  return (
    <div className="space-y-10">
      <header>
        <Link href="/library" className="text-sm text-brand-blue hover:underline">
          &larr; All courses
        </Link>
        <h1 className="mt-2 text-2xl font-bold">
          {course.code} &middot; {course.title}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {course.semester} &middot; {lectureList.length} lectures &middot; {transcriptCount}{" "}
          transcripts &middot; {videoCount + supplementalVideoCount} videos
        </p>
      </header>

      <CourseEssentialsPanel essentials={essentials} />

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Lectures</h2>
          <p className="mt-1 text-sm text-slate-500">
            Each lecture links its slide deck, study guide, and related files.
          </p>
        </div>
        {lecturesWithFiles.length === 0 && (
          <p className="text-slate-500">No lectures imported for this course yet.</p>
        )}
        {lecturesWithFiles.map(({ lecture, files }, index) => {
          const embeddable =
            lecture.youtube_id && lecture.youtube_visibility !== "private";
          return (
            <article
              key={lecture.id}
              className="rounded-xl border border-brand-line bg-brand-panel p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold text-slate-900">
                  <span className="mr-2 text-slate-400">{index + 1}.</span>
                  {lecture.title}
                </h3>
                <p className="text-xs text-slate-400">
                  {lecture.lecture_date ?? ""}
                  {lecture.transcript_source
                    ? ` \u00b7 ${lecture.transcript_source}`
                    : ""}
                </p>
              </div>

              {embeddable && (
                <div className="mt-4 aspect-video w-full max-w-2xl overflow-hidden rounded-lg bg-slate-100">
                  <iframe
                    src={`https://www.youtube.com/embed/${lecture.youtube_id}`}
                    title={lecture.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full"
                    loading="lazy"
                  />
                </div>
              )}
              {lecture.youtube_id && !embeddable && (
                <p className="mt-3 text-sm text-amber-600">
                  Video exists but is still set to private on YouTube.
                </p>
              )}

              {hasTranscript.has(lecture.id) && (
                <div className="mt-4">
                  <TranscriptButton lectureId={lecture.id} title={lecture.title} />
                </div>
              )}

              {files.length > 0 ? (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Lecture files
                  </p>
                  <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
                    {files.map((resource) => (
                      <ResourceFileRow key={resource.id} resource={resource} />
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-400">No matched files for this lecture yet.</p>
              )}
            </article>
          );
        })}
      </section>

      {mediaResources.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Supplemental videos</h2>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {mediaResources.map((resource) => {
              const video = matchFilenameToYoutube(resource.name);
              const embeddable = video && isEmbeddable(video);
              return (
                <li key={resource.id} className="px-4 py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-slate-800">{resource.name}</p>
                    {!video && (
                      <span className="text-xs text-slate-400">Not on YouTube yet</span>
                    )}
                  </div>
                  {embeddable && video && (
                    <div className="mt-3 aspect-video w-full max-w-2xl overflow-hidden rounded-lg bg-slate-100">
                      <iframe
                        src={`https://www.youtube.com/embed/${video.id}`}
                        title={video.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="h-full w-full"
                        loading="lazy"
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
            <h2 className="text-lg font-semibold">Labs, flashcards & extras</h2>
            <p className="mt-1 text-sm text-slate-500">
              {supplemental.length} files not tied to a specific lecture — lab guides, Anki decks,
              and reference material.
            </p>
          </div>
          {[...supplementalByKind.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([kind, items]) => (
              <div key={kind}>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
                  {kind} ({items.length})
                </h3>
                <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  {items.map((resource) => (
                    <ResourceFileRow key={resource.id} resource={resource} />
                  ))}
                </ul>
              </div>
            ))}
        </section>
      )}

      {archive.length > 0 && (
        <details className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
          <summary className="cursor-pointer text-sm font-medium text-slate-600">
            Archived / survival-guide copies ({archive.length}) — likely duplicates from other
            courses or old class folders
          </summary>
          <ul className="mt-3 divide-y divide-slate-200">
            {archive.map((resource) => (
              <li key={resource.id} className="py-2 text-xs text-slate-500">
                {resource.name}
                {resource.section ? ` · ${resource.section}` : ""}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
