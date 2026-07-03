"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PreviewCrashTest } from "@/components/PreviewCrashTest";
import { ResourcePreviewPanel } from "@/components/ResourcePreviewPanel";
import { previewStrategy, previewStrategyLabel } from "@/lib/preview-capabilities";

export type PreviewLabResource = {
  id: number;
  name: string;
  ext: string | null;
  course_code: string;
  size_mb: number | null;
};

export function PreviewLabClient({
  resources,
  defaultId,
}: {
  resources: PreviewLabResource[];
  defaultId: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramId = Number(searchParams.get("id"));
  const selectedId =
    resources.some((r) => r.id === paramId) ? paramId : defaultId;

  function onSelect(id: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("id", String(id));
    router.replace(`/preview-lab?${params.toString()}`);
  }

  const selected = resources.find((r) => r.id === selectedId);

  return (
    <div className="space-y-6">
      <PreviewCrashTest resources={resources} onPick={onSelect} />

      <div>
        <label htmlFor="preview-resource" className="text-sm font-medium text-brand-navy">
          Pick an uploaded file
        </label>
        <select
          id="preview-resource"
          value={selectedId}
          onChange={(e) => onSelect(Number(e.target.value))}
          className="app-input mt-2 w-full rounded-xl px-3 py-2 text-sm"
        >
          {resources.map((resource) => (
            <option key={resource.id} value={resource.id}>
              {resource.course_code} · {resource.name}
              {resource.size_mb != null ? ` (${resource.size_mb} MB)` : ""} ·{" "}
              {previewStrategyLabel(previewStrategy(resource.ext))}
            </option>
          ))}
        </select>
        {selected && (
          <p className="mt-1 text-xs text-brand-muted">
            Preview mode: {previewStrategyLabel(previewStrategy(selected.ext))}
          </p>
        )}
      </div>

      <ResourcePreviewPanel resourceId={selectedId} />
    </div>
  );
}
