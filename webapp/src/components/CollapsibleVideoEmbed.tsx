"use client";

import { useState } from "react";

export function CollapsibleVideoEmbed({
  youtubeId,
  title,
}: {
  youtubeId: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-line bg-brand-soft/60 px-4 py-3">
        <p className="min-w-0 truncate text-sm text-brand-ink">{title}</p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 rounded-full border border-brand-teal bg-brand-teal/10 px-3 py-1.5 text-xs font-medium text-brand-teal hover:bg-brand-teal/15"
        >
          Watch video
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="aspect-video w-full overflow-hidden rounded-lg border border-brand-line bg-brand-soft">
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs font-medium text-brand-muted hover:text-brand-navy hover:underline"
      >
        Hide video
      </button>
    </div>
  );
}
