import { ReportProblemButton } from "@/components/ReportProblemButton";
import type { CourseResource } from "@/lib/course-organize";

export function ResourceFileRow({ resource }: { resource: CourseResource }) {
  return (
    <li className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm text-slate-800">{resource.name}</p>
        <p className="text-xs text-slate-400">
          {resource.kind}
          {resource.ext ? ` · ${resource.ext}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {resource.storage_path ? (
          <a
            href={`/api/resource/${resource.id}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-brand-line px-3 py-1 text-xs font-medium text-brand-blue hover:bg-brand-soft"
          >
            Open
          </a>
        ) : (
          <span className="text-xs text-slate-400">Not uploaded</span>
        )}
        <ReportProblemButton resourceId={resource.id} resourceName={resource.name} />
      </div>
    </li>
  );
}

export function CourseEssentialsPanel({
  essentials,
}: {
  essentials: {
    syllabus: CourseResource | null;
    masteryGuide: CourseResource | null;
    textbookCompanion: CourseResource | null;
  };
}) {
  const items = [
    { label: "Syllabus", resource: essentials.syllabus },
    { label: "Course cheatsheet", resource: essentials.masteryGuide },
    { label: "Textbook companion", resource: essentials.textbookCompanion },
  ].filter((item) => item.resource);

  if (!items.length) return null;

  return (
    <section className="rounded-xl border border-brand-teal/30 bg-brand-soft p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-teal">
        Start here
      </h2>
      <ul className="mt-3 divide-y divide-brand-line/60">
        {items.map(({ label, resource }) => (
          <li key={resource!.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <div>
              <p className="text-xs font-semibold uppercase text-brand-muted">{label}</p>
              <p className="mt-0.5 text-sm font-medium text-brand-ink">{resource!.name}</p>
            </div>
            {resource!.storage_path ? (
              <a
                href={`/api/resource/${resource!.id}`}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 rounded-full border border-brand-teal px-4 py-1.5 text-sm font-medium text-brand-teal hover:bg-white"
              >
                Open
              </a>
            ) : (
              <span className="text-xs text-slate-400">Not uploaded</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
