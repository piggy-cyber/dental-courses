"use client";

import { useState } from "react";
import { reportResourceProblem } from "@/app/(protected)/course/actions";
import type { CourseResource } from "@/lib/course-organize";

export function CourseReportSection({
  courseCode,
  resources,
}: {
  courseCode: string;
  resources: CourseResource[];
}) {
  const [open, setOpen] = useState(false);
  const [resourceId, setResourceId] = useState(String(resources[0]?.id ?? ""));
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const uploaded = resources.filter((r) => r.storage_path);

  async function submit() {
    if (!message.trim() || !resourceId) return;
    setStatus("sending");
    const result = await reportResourceProblem(Number(resourceId), message.trim());
    if (result.ok) {
      setStatus("sent");
      setMessage("");
      setTimeout(() => {
        setOpen(false);
        setStatus("idle");
      }, 2000);
    } else {
      setStatus("error");
    }
  }

  if (!resources.length) return null;

  return (
    <section className="rounded-xl border border-dashed border-brand-line bg-brand-soft/60 p-5">
      {!open ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium text-brand-navy">Something look wrong?</p>
            <p className="mt-1 text-sm text-brand-muted">
              Wrong file, broken link, or missing upload for {courseCode}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-full border border-amber-700/30 bg-white px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-50"
          >
            Report an issue
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="font-medium text-brand-navy">Report an issue</p>
          <label className="block text-xs font-medium text-brand-muted">
            Which file? (required — pick the closest match)
            <select
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-brand-line bg-white px-3 py-2 text-sm text-brand-ink"
            >
              {resources.map((resource) => (
                <option key={resource.id} value={resource.id}>
                  {resource.name}
                  {!resource.storage_path ? " (not uploaded)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-brand-muted">
            What happened?
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="e.g. cheat sheet shows not uploaded but I have the PDF, wrong lecture match..."
              className="mt-1 w-full rounded-lg border border-brand-line bg-white px-3 py-2 text-sm"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={status === "sending" || !message.trim()}
              className="rounded-full bg-amber-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {status === "sending" ? "Sending…" : status === "sent" ? "Sent — thanks!" : "Send report"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setStatus("idle");
              }}
              className="text-sm text-brand-muted hover:underline"
            >
              Cancel
            </button>
            {status === "error" && (
              <span className="text-sm text-red-600">
                Could not save — run resource-reports.sql in Supabase
              </span>
            )}
          </div>
          {uploaded.length < resources.length && (
            <p className="text-xs text-brand-muted">
              Tip: {resources.length - uploaded.length} files still show as not uploaded — mention that
              in your note if relevant.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
