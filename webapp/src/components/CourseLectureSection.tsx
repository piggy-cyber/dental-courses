import { TranscriptButton } from "@/components/TranscriptButton";
import { CollapsibleVideoEmbed } from "@/components/CollapsibleVideoEmbed";
import { ResourceFileRow } from "@/components/CourseResourceRows";
import type { CourseResource } from "@/lib/course-organize";
import {
  groupLecturesForDisplay,
  lectureEmbeddable,
  type DisplayLectureGroup,
  type LectureRow,
  type LectureWithFiles,
} from "@/lib/lecture-groups";

function FileList({ files, label = "Lecture files" }: { files: CourseResource[]; label?: string }) {
  if (!files.length) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-muted">
        {label}
      </p>
      <ul className="divide-y divide-brand-line overflow-hidden rounded-lg border border-brand-line bg-white">
        {files.map((resource) => (
          <ResourceFileRow key={resource.id} resource={resource} />
        ))}
      </ul>
    </div>
  );
}

function VideoEmbed({ lecture }: { lecture: LectureRow }) {
  const embeddable = lectureEmbeddable(lecture);
  if (embeddable && lecture.youtube_id) {
    return (
      <CollapsibleVideoEmbed youtubeId={lecture.youtube_id} title={lecture.title} />
    );
  }
  if (lecture.youtube_id) {
    return (
      <p className="text-sm text-amber-700">
        Video exists but is still set to private on YouTube.
      </p>
    );
  }
  return null;
}

function LectureMeta({
  lecture,
  showVideoBadge = false,
}: {
  lecture: LectureRow;
  showVideoBadge?: boolean;
}) {
  const embeddable = lectureEmbeddable(lecture);
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-brand-muted">
      {lecture.synthetic && (
        <span className="rounded-full bg-brand-teal/10 px-2 py-0.5 font-medium text-brand-teal">
          Slide-based
        </span>
      )}
      {showVideoBadge && embeddable && (
        <span className="rounded-full bg-red-500/10 px-2 py-0.5 font-medium text-red-700">
          Video
        </span>
      )}
      {(lecture.lecture_date || lecture.transcript_source) && (
        <span>
          {lecture.lecture_date ?? ""}
          {lecture.transcript_source ? ` · ${lecture.transcript_source}` : ""}
        </span>
      )}
    </div>
  );
}

function PartBlock({
  partLabel,
  lecture,
  files,
  hasTranscript,
  compact = false,
}: {
  partLabel: string;
  lecture: LectureRow;
  files: CourseResource[];
  hasTranscript: Set<string>;
  compact?: boolean;
}) {
  const embeddable = lectureEmbeddable(lecture);
  return (
    <div
      className={
        compact
          ? "rounded-lg border border-brand-line bg-white p-4"
          : "rounded-lg border border-brand-line bg-white p-4"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-brand-navy">{partLabel}</h4>
        {embeddable && (
          <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-700">
            Video
          </span>
        )}
      </div>
      <div className="mt-3 space-y-4">
        <VideoEmbed lecture={lecture} />
        {hasTranscript.has(lecture.id) && (
          <TranscriptButton lectureId={lecture.id} title={lecture.title} />
        )}
        <FileList files={files} label="Part-specific files" />
      </div>
    </div>
  );
}

function SeriesGroupCard({
  group,
  index,
  hasTranscript,
}: {
  group: Extract<DisplayLectureGroup, { kind: "series" }>;
  index: number;
  hasTranscript: Set<string>;
}) {
  const [leadPart, ...moreParts] = group.parts;

  return (
    <article className="overflow-hidden rounded-xl border border-brand-line bg-brand-panel shadow-sm">
      <div className="border-b border-brand-line bg-gradient-to-r from-brand-gold/10 to-white px-5 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold text-brand-navy">
            <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-gold/15 text-sm font-bold text-brand-gold">
              {index + 1}
            </span>
            {group.title}
          </h3>
          <span className="rounded-full bg-brand-gold/10 px-2.5 py-0.5 text-xs font-medium text-brand-gold">
            {group.parts.length} parts · shared slides
          </span>
        </div>
        <p className="mt-2 text-sm text-brand-muted">
          Start with {leadPart.partLabel} — each part has its own video and transcript below.
        </p>
      </div>
      <div className="space-y-4 p-5">
        <div className="rounded-xl border-2 border-brand-gold/30 bg-brand-gold/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-gold">
            Watch first · {leadPart.partLabel}
          </p>
          <div className="mt-3 space-y-4">
            <VideoEmbed lecture={leadPart.lecture} />
            {hasTranscript.has(leadPart.lecture.id) && (
              <TranscriptButton
                lectureId={leadPart.lecture.id}
                title={leadPart.lecture.title}
              />
            )}
          </div>
        </div>

        {moreParts.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
              More parts
            </p>
            {moreParts.map((part) => (
              <PartBlock
                key={part.lecture.id}
                partLabel={part.partLabel}
                lecture={part.lecture}
                files={part.files}
                hasTranscript={hasTranscript}
                compact
              />
            ))}
          </div>
        )}

        <FileList files={group.sharedFiles} label="Shared slides for this topic" />
      </div>
    </article>
  );
}

function SessionGroupCard({
  group,
  index,
  hasTranscript,
}: {
  group: Extract<DisplayLectureGroup, { kind: "session" }>;
  index: number;
  hasTranscript: Set<string>;
}) {
  const { lecture } = group;
  const embeddable = lectureEmbeddable(lecture);
  return (
    <article className="overflow-hidden rounded-xl border border-brand-line bg-brand-panel shadow-sm">
      <div className="border-b border-brand-line bg-gradient-to-r from-brand-blue/10 to-white px-5 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold text-brand-navy">
            <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-blue/15 text-sm font-bold text-brand-blue">
              {index + 1}
            </span>
            {lecture.lecture_date ? `${lecture.lecture_date} · Class session` : "Class session"}
          </h3>
          <LectureMeta lecture={lecture} showVideoBadge />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {group.topics.map((topic) => (
            <span
              key={topic}
              className="rounded-full border border-brand-line bg-white px-2.5 py-1 text-xs font-medium text-brand-navy"
            >
              {topic}
            </span>
          ))}
        </div>
        <p className="mt-2 text-sm text-brand-muted">
          One recording covers every topic listed above — use the single transcript for the full
          class.
        </p>
      </div>
      <div className="space-y-4 p-5">
        <VideoEmbed lecture={lecture} />
        {hasTranscript.has(lecture.id) && (
          <TranscriptButton lectureId={lecture.id} title={lecture.title} />
        )}
        <FileList files={group.files} />
        {!embeddable && !group.files.length && !hasTranscript.has(lecture.id) && (
          <p className="text-sm text-brand-muted">Materials for this session are still being linked.</p>
        )}
      </div>
    </article>
  );
}

function SingleGroupCard({
  group,
  index,
  hasTranscript,
}: {
  group: Extract<DisplayLectureGroup, { kind: "single" }>;
  index: number;
  hasTranscript: Set<string>;
}) {
  const { lecture } = group;
  const embeddable = lectureEmbeddable(lecture);
  return (
    <article className="overflow-hidden rounded-xl border border-brand-line bg-brand-panel shadow-sm">
      <div className="border-b border-brand-line bg-gradient-to-r from-brand-soft/80 to-white px-5 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold text-brand-navy">
            <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-teal/10 text-sm font-bold text-brand-teal">
              {index + 1}
            </span>
            {lecture.title}
          </h3>
          <LectureMeta lecture={lecture} showVideoBadge />
        </div>
      </div>
      <div className="space-y-4 p-5">
        <VideoEmbed lecture={lecture} />
        {hasTranscript.has(lecture.id) && (
          <TranscriptButton lectureId={lecture.id} title={lecture.title} />
        )}
        {group.files.length > 0 ? (
          <FileList files={group.files} />
        ) : (
          <p className="text-sm text-brand-muted">No matched files for this lecture yet.</p>
        )}
      </div>
    </article>
  );
}

function GroupCard({
  group,
  index,
  hasTranscript,
}: {
  group: DisplayLectureGroup;
  index: number;
  hasTranscript: Set<string>;
}) {
  if (group.kind === "series") {
    return (
      <SeriesGroupCard group={group} index={index} hasTranscript={hasTranscript} />
    );
  }
  if (group.kind === "session") {
    return (
      <SessionGroupCard group={group} index={index} hasTranscript={hasTranscript} />
    );
  }
  return (
    <SingleGroupCard group={group} index={index} hasTranscript={hasTranscript} />
  );
}

function TrackSection({
  title,
  eyebrow,
  description,
  groups,
  hasTranscript,
}: {
  title: string;
  eyebrow: string;
  description: string;
  groups: DisplayLectureGroup[];
  hasTranscript: Set<string>;
}) {
  if (!groups.length) return null;
  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h3 className="mt-1 text-lg font-bold text-brand-navy">{title}</h3>
        <p className="mt-1 text-sm text-brand-muted">{description}</p>
      </div>
      <div className="space-y-5">
        {groups.map((group, index) => (
          <GroupCard
            key={
              group.kind === "series"
                ? `series-${group.title}`
                : group.lecture.id
            }
            group={group}
            index={index}
            hasTranscript={hasTranscript}
          />
        ))}
      </div>
    </div>
  );
}

export function CourseLectureSection({
  lecturesWithFiles,
  hasTranscript,
}: {
  lecturesWithFiles: LectureWithFiles[];
  hasTranscript: Set<string>;
}) {
  const { moduleGroups, classGroups, meta } = groupLecturesForDisplay(lecturesWithFiles);

  if (!moduleGroups.length && !classGroups.length && !meta.length) {
    return <p className="text-brand-muted">No lectures imported for this course yet.</p>;
  }

  return (
    <>
      <div className="space-y-10">
        <TrackSection
          eyebrow="Watch & review"
          title="Video modules"
          description="Numbered parts with YouTube video and transcript. Slides are shared across parts of the same topic."
          groups={moduleGroups}
          hasTranscript={hasTranscript}
        />
        <TrackSection
          eyebrow="In class"
          title="Class sessions"
          description="Echo360 recordings from lecture hall — one transcript per session, often covering several topics."
          groups={classGroups}
          hasTranscript={hasTranscript}
        />
      </div>

      {meta.length > 0 && (
        <details className="mt-5 rounded-xl border border-dashed border-brand-line bg-brand-soft/50 p-4">
          <summary className="cursor-pointer text-sm font-medium text-brand-muted">
            Transcript bundles ({meta.length}) — combined exports, not separate lectures
          </summary>
          <ul className="mt-3 space-y-2">
            {meta.map(({ lecture }) => (
              <li key={lecture.id} className="flex flex-wrap items-center gap-3 text-sm">
                <span className="text-brand-ink">{lecture.title}</span>
                {hasTranscript.has(lecture.id) && (
                  <TranscriptButton lectureId={lecture.id} title={lecture.title} />
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
