"use client";

import { useEffect } from "react";
import { ResourcePreviewPanel } from "@/components/ResourcePreviewPanel";

export function ResourcePreviewDrawer({
  resourceId,
  resourceName,
  open,
  onClose,
}: {
  resourceId: number;
  resourceName: string;
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close preview"
        className="absolute inset-0 bg-brand-navy/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-drawer-title"
        className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden border border-brand-line bg-brand-paper"
      >
        <div className="flex items-center justify-between gap-3 border-b border-brand-line bg-brand-panel px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-teal">
              Preview
            </p>
            <h2 id="preview-drawer-title" className="truncate text-sm font-semibold text-brand-navy">
              {resourceName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="portal-button shrink-0 px-3 py-1.5 text-sm"
          >
            Close
          </button>
        </div>
        <div className="overflow-y-auto p-4">
          <ResourcePreviewPanel resourceId={resourceId} />
        </div>
      </div>
    </div>
  );
}
