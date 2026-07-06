"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignResourceToSlot } from "@/app/admin/course-actions";
import { FileCategoryPicker } from "@/components/FileCategoryPicker";
import type { CourseEditorData } from "@/app/admin/course-actions";
import { isInboxResource } from "@/lib/resource-kinds";
import type { AssignTarget } from "@/lib/resource-kinds";

type Props = {
  data: CourseEditorData;
  onMessage?: (msg: string | null) => void;
  onError?: (err: string | null) => void;
};

export function CourseInboxPanel({ data, onMessage, onError }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [assigning, setAssigning] = useState<Record<number, string>>({});

  const inbox = data.resources.filter(isInboxResource);
  const lectures = data.lectures.map((l) => ({ id: l.id, title: l.title }));

  function assign(resourceId: number, target: AssignTarget) {
    startTransition(async () => {
      onError?.(null);
      try {
        await assignResourceToSlot(
          data.course.code,
          data.collection.id,
          resourceId,
          target
        );
        onMessage?.("File assigned.");
        router.refresh();
      } catch (err) {
        onError?.(err instanceof Error ? err.message : "Assign failed.");
      }
    });
  }

  if (inbox.length === 0) return null;

  return (
    <section className="app-card overflow-hidden">
      <div className="portal-bar border-0 border-b border-brand-line px-3 py-2">
        <h2 className="text-sm font-bold uppercase text-brand-navy">Inbox</h2>
      </div>
      <div className="space-y-4 p-4">
        <p className="text-sm text-brand-muted">
          {inbox.length} unassigned file{inbox.length === 1 ? "" : "s"} — pick where each one belongs.
        </p>

        <ul className="divide-y divide-brand-line border border-brand-line">
          {inbox.map((resource) => (
            <li
              key={resource.id}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-brand-ink">{resource.name}</p>
                <p className="text-xs text-brand-muted">
                  {resource.storage_path ? "Ready to assign" : "Uploading…"}
                </p>
              </div>
              <FileCategoryPicker
                value={assigning[resource.id] ?? ""}
                lectures={lectures}
                sections={data.sections}
                disabled={pending}
                onChange={(target) => {
                  setAssigning((prev) => ({ ...prev, [resource.id]: "..." }));
                  assign(resource.id, target);
                }}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
