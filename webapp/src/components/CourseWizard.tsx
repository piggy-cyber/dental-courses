"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCourseFromTemplate } from "@/app/admin/course-actions";
import { COURSE_TEMPLATES, STANDARD_D1_TEMPLATE } from "@/lib/course-templates";
import type { AccessTier } from "@/lib/tiers";
import { ACCESS_TIERS } from "@/lib/tiers";

type Collection = { id: string; label: string; short_label: string };

export function CourseWizard({ collections }: { collections: Collection[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const template = STANDARD_D1_TEMPLATE;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const result = await createCourseFromTemplate({
          collectionId: String(form.get("collectionId")),
          templateId: String(form.get("templateId") || template.id),
          code: String(form.get("code")),
          title: String(form.get("title")),
          semester: String(form.get("semester") || ""),
          area: String(form.get("area") || ""),
          libraryTier: String(form.get("libraryTier")) as AccessTier,
          lectureCount: Number(form.get("lectureCount") || template.defaultLectureCount),
          includeCompanion: form.get("includeCompanion") === "on",
        });
        router.push(
          `/admin/courses/${encodeURIComponent(result.courseCode)}?collection=${encodeURIComponent(result.collectionId)}`
        );
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create course.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="app-card space-y-6 p-6">
      {error && (
        <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase text-brand-navy">1. Collection</h2>
        <p className="text-sm text-brand-muted">Which resource set should include this course?</p>
        <select name="collectionId" required className="app-input w-full max-w-md">
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.short_label} · {c.label}
            </option>
          ))}
        </select>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase text-brand-navy">2. Course basics</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold text-brand-muted">Course code</span>
            <input name="code" required placeholder="HEWB 130" className="app-input mt-1 w-full" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-brand-muted">Title</span>
            <input name="title" required placeholder="Head and Neck Anatomy" className="app-input mt-1 w-full" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-brand-muted">Semester</span>
            <input name="semester" placeholder="Fall 2025" className="app-input mt-1 w-full" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-brand-muted">Area</span>
            <input name="area" placeholder="Anatomy" className="app-input mt-1 w-full" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-brand-muted">Library tier</span>
            <select name="libraryTier" defaultValue="d1" className="app-input mt-1 w-full">
              {ACCESS_TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {tier.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase text-brand-navy">3. Template</h2>
        <select name="templateId" defaultValue={template.id} className="app-input w-full max-w-md">
          {COURSE_TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <p className="text-sm text-brand-muted">{template.description}</p>
        <label className="block max-w-xs">
          <span className="text-xs font-semibold text-brand-muted">Number of lecture slots</span>
          <input
            name="lectureCount"
            type="number"
            min={template.minLectureCount}
            max={template.maxLectureCount}
            defaultValue={template.defaultLectureCount}
            className="app-input mt-1 w-full"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-brand-ink">
          <input name="includeCompanion" type="checkbox" />
          Include textbook companion upload slot
        </label>
      </section>

      <button type="submit" disabled={pending} className="portal-button-primary px-5 py-2.5">
        {pending ? "Creating course…" : "Create course and open organizer"}
      </button>
    </form>
  );
}
