"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createCourseSection,
  deleteCourseSection,
  reorderCourseSections,
  updateCourseSection,
} from "@/app/admin/course-actions";
import type { CourseEditorData } from "@/app/admin/course-actions";

type Props = {
  data: CourseEditorData;
  onMessage?: (msg: string | null) => void;
  onError?: (err: string | null) => void;
};

export function CourseSectionEditor({ data, onMessage, onError }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [newLabel, setNewLabel] = useState("");

  const sections = [...data.sections].sort((a, b) => a.sort_order - b.sort_order);

  function run(action: () => Promise<void>, success: string) {
    onMessage?.(null);
    onError?.(null);
    startTransition(async () => {
      try {
        await action();
        onMessage?.(success);
        router.refresh();
      } catch (err) {
        onError?.(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  function moveSection(index: number, direction: -1 | 1) {
    const ids = sections.map((s) => s.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    run(
      () => reorderCourseSections(data.course.code, data.collection.id, ids),
      "Section order updated."
    );
  }

  return (
    <section className="app-card overflow-hidden">
      <div className="portal-bar border-0 border-b border-brand-line px-3 py-2">
        <h2 className="text-sm font-bold uppercase text-brand-navy">Course sections</h2>
      </div>
      <div className="space-y-4 p-4">
        <p className="text-sm text-brand-muted">
          Sections group supplemental files on the student page. Lectures are managed separately.
        </p>

        <ul className="divide-y divide-brand-line border border-brand-line">
          {sections.map((section, index) => (
            <li key={section.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
              <form
                className="flex flex-1 flex-wrap items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = new FormData(e.currentTarget);
                  const label = String(form.get("label")).trim();
                  if (!label) return;
                  run(
                    () =>
                      updateCourseSection(data.course.code, data.collection.id, section.id, {
                        label,
                      }),
                    "Section renamed."
                  );
                }}
              >
                <input
                  name="label"
                  defaultValue={section.label}
                  className="app-input min-w-[12rem] flex-1 text-sm"
                  disabled={pending || section.section_type === "lectures"}
                />
                {section.section_type !== "lectures" && (
                  <button type="submit" className="portal-button px-3 py-1.5 text-sm" disabled={pending}>
                    Save
                  </button>
                )}
              </form>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="portal-button px-2 py-1 text-xs"
                  disabled={pending || index === 0}
                  onClick={() => moveSection(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="portal-button px-2 py-1 text-xs"
                  disabled={pending || index === sections.length - 1}
                  onClick={() => moveSection(index, 1)}
                >
                  ↓
                </button>
                {section.section_type === "custom" && (
                  <button
                    type="button"
                    className="text-xs text-red-700 underline"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () => deleteCourseSection(data.course.code, data.collection.id, section.id),
                        "Section removed."
                      )
                    }
                  >
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>

        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const label = newLabel.trim();
            if (!label) return;
            run(async () => {
              await createCourseSection(data.course.code, data.collection.id, label);
              setNewLabel("");
            }, "Section added.");
          }}
        >
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="New section name (e.g. Lab 2 materials)"
            className="app-input min-w-[14rem] flex-1 text-sm"
            disabled={pending}
          />
          <button type="submit" className="portal-button px-3 py-1.5 text-sm" disabled={pending || !newLabel.trim()}>
            Add section
          </button>
        </form>
      </div>
    </section>
  );
}
