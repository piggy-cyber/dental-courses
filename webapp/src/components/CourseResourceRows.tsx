"use client";

import { ResourceFileActions } from "@/components/ResourceFileActions";
import type { CourseEssentials, CourseResource } from "@/lib/course-organize";

function extLabel(resource: CourseResource) {
  return String(resource.ext ?? resource.kind ?? "File").toUpperCase();
}

export function ResourceFileRow({ resource }: { resource: CourseResource }) {
  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-brand-ink">{resource.name}</p>
        <p className="text-xs text-brand-muted">
          {resource.kind}
          {resource.ext ? ` · ${resource.ext}` : ""}
        </p>
      </div>
      <ResourceFileActions resource={resource} />
    </li>
  );
}

const ESSENTIAL_ACCENTS = {
  Syllabus: "border-l-brand-blue",
  "Cheat sheet": "border-l-brand-gold",
  "Textbook version": "border-l-brand-teal",
} as const;

export function CourseEssentialsPanel({
  essentials,
}: {
  essentials: CourseEssentials;
}) {
  const items = [
    {
      label: "Syllabus" as const,
      description: "Schedule, requirements, and exam dates.",
      resources: essentials.syllabus,
    },
    {
      label: "Cheat sheet" as const,
      description: "Condensed mastery guide for quick review.",
      resources: essentials.masteryGuide,
    },
    {
      label: "Textbook version" as const,
      description: "Long-form companion for deeper study.",
      resources: essentials.textbookCompanion,
    },
  ].filter((item) => item.resources.length > 0);

  if (!items.length) return null;

  return (
    <section className="space-y-4">
      <div>
        <p className="eyebrow text-brand-gold">Start here</p>
        <h2 className="mt-1 text-xl font-bold text-brand-navy">Course essentials</h2>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {items.map(({ label, description, resources }) => {
          const accent = ESSENTIAL_ACCENTS[label];

          return (
            <article key={label} className={`app-card border-l-4 p-5 ${accent}`}>
              <div>
                <h3 className="font-semibold text-brand-navy">{label}</h3>
                <p className="mt-1 text-sm text-brand-muted">{description}</p>
              </div>
              <ul className="mt-4 space-y-3">
                {resources.map((resource) => (
                  <li
                    key={resource.id}
                    className="border-t border-brand-line/70 pt-3 first:border-t-0 first:pt-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-brand-ink">
                        {resource.name}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-brand-muted">
                        {extLabel(resource)}
                      </p>
                    </div>
                    <div className="mt-2">
                      <ResourceFileActions resource={resource} />
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}
