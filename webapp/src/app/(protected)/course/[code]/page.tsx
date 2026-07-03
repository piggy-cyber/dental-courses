import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TranscriptButton } from "@/components/TranscriptButton";

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

type Resource = {
  id: number;
  name: string;
  kind: string | null;
  ext: string | null;
  section: string | null;
  size_mb: number | null;
  storage_path: string | null;
  is_canonical_syllabus: boolean;
};

const KIND_ORDER = [
  "Syllabus",
  "Slides",
  "Document",
  "Study Guide",
  "Flashcards",
  "Image",
  "Other",
];

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

  const lectureList = (lectures as Lecture[]) ?? [];
  const resourceList = (resources as Resource[]) ?? [];

  const shelf = new Map<string, Resource[]>();
  for (const resource of resourceList) {
    if (resource.kind === "Transcript") continue; // transcripts live on lecture rows
    const kind = resource.kind ?? "Other";
    if (!shelf.has(kind)) shelf.set(kind, []);
    shelf.get(kind)!.push(resource);
  }
  const shelfSections = [...shelf.entries()].sort(
    (a, b) => KIND_ORDER.indexOf(a[0]) - KIND_ORDER.indexOf(b[0])
  );

  const videoCount = lectureList.filter(
    (lecture) => lecture.youtube_id && lecture.youtube_visibility !== "private"
  ).length;

  return (
    <div className="space-y-10">
      <header>
        <Link href="/library" className="text-sm text-blue-700 hover:underline">
          &larr; All courses
        </Link>
        <h1 className="mt-2 text-2xl font-bold">
          {course.code} &middot; {course.title}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {course.semester} &middot; {lectureList.length} lectures &middot;{" "}
          {videoCount} videos &middot; {resourceList.length} files
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Lectures</h2>
        {lectureList.length === 0 && (
          <p className="text-slate-500">No lectures imported for this course yet.</p>
        )}
        {lectureList.map((lecture, index) => {
          const embeddable =
            lecture.youtube_id && lecture.youtube_visibility !== "private";
          return (
            <article
              key={lecture.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
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
            </article>
          );
        })}
      </section>

      {shelfSections.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-lg font-semibold">Course files</h2>
          {shelfSections.map(([kind, items]) => (
            <div key={kind}>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
                {kind} ({items.length})
              </h3>
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
                {items.map((resource) => (
                  <li
                    key={resource.id}
                    className="flex items-center justify-between gap-4 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {resource.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {resource.ext}
                        {resource.size_mb ? ` \u00b7 ${resource.size_mb} MB` : ""}
                        {resource.section ? ` \u00b7 ${resource.section}` : ""}
                      </p>
                    </div>
                    {resource.storage_path ? (
                      <a
                        href={`/api/resource/${resource.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 rounded-full border border-blue-200 px-4 py-1.5 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
                      >
                        Open
                      </a>
                    ) : (
                      <span className="shrink-0 text-xs text-slate-400">
                        Not uploaded yet
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
