"use client";

import { useState } from "react";
import { ResourcePreviewDrawer } from "@/components/ResourcePreviewDrawer";
import { previewStrategy } from "@/lib/preview-capabilities";
import type { CourseResource } from "@/lib/course-organize";

export function ResourceFileActions({
  resource,
}: {
  resource: CourseResource;
  includeReport?: boolean;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const strategy = previewStrategy(resource.ext);
  const canPreview = resource.storage_path && strategy !== "download";

  if (!resource.storage_path) {
    return <span className="text-xs text-amber-700">Not uploaded yet</span>;
  }

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {canPreview && (
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="portal-button px-3 py-1 text-xs"
          >
            Preview
          </button>
        )}
        <a
          href={`/api/resource/${resource.id}`}
          target="_blank"
          rel="noreferrer"
          className="portal-button px-3 py-1 text-xs"
        >
          Download
        </a>
      </div>
      <ResourcePreviewDrawer
        resourceId={resource.id}
        resourceName={resource.name}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </>
  );
}
