"use client";

import { useState, useTransition } from "react";
import { updateReportStatus } from "@/app/admin/actions";

export function ReportStatusControls({
  reportId,
  currentStatus,
}: {
  reportId: number;
  currentStatus: "open" | "resolved" | "dismissed";
}) {
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function update(nextStatus: "open" | "resolved" | "dismissed") {
    setError(null);
    startTransition(async () => {
      try {
        await updateReportStatus(reportId, nextStatus, note);
        setStatus(nextStatus);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Update failed");
      }
    });
  }

  return (
    <div className="mt-3 space-y-2">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Optional admin note"
        className="app-input w-full rounded-xl px-3 py-2 text-xs"
      />
      <div className="flex flex-wrap items-center gap-2">
        {status !== "resolved" && (
          <button
            type="button"
            onClick={() => update("resolved")}
            disabled={isPending}
            className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            Mark resolved
          </button>
        )}
        {status !== "dismissed" && (
          <button
            type="button"
            onClick={() => update("dismissed")}
            disabled={isPending}
            className="rounded-full border border-brand-line bg-white/70 px-3 py-1.5 text-xs font-semibold text-brand-muted disabled:opacity-60"
          >
            Dismiss
          </button>
        )}
        {status !== "open" && (
          <button
            type="button"
            onClick={() => update("open")}
            disabled={isPending}
            className="rounded-full border border-amber-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-amber-700 disabled:opacity-60"
          >
            Reopen
          </button>
        )}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  );
}
