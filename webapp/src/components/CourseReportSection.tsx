"use client";

import { useState } from "react";
import {
  reportResourceProblem,
  type IssueCategory,
} from "@/app/(protected)/course/actions";
import type { CourseResource } from "@/lib/course-organize";

const ISSUE_TYPES: { value: IssueCategory; label: string }[] = [
  { value: "file", label: "Wrong or broken file" },
  { value: "missing", label: "Missing upload" },
  { value: "wrong_match", label: "Wrong lecture/file match" },
  { value: "broken_link", label: "Broken link or preview" },
  { value: "site", label: "General site issue" },
  { value: "other", label: "Other" },
];

export function CourseReportSection({
  courseCode,
  resources,
}: {
  courseCode: string;
  resources: CourseResource[];
}) {
  const [open, setOpen] = useState(false);
  const [resourceId, setResourceId] = useState("");
  const [category, setCategory] = useState<IssueCategory>("file");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const uploaded = resources.filter((r) => r.storage_path);

  async function submit() {
    if (!message.trim()) return;
    setStatus("sending");
    setError(null);
    const result = await reportResourceProblem({
      resourceId: resourceId ? Number(resourceId) : null,
      courseCode,
      category,
      message: message.trim(),
    });
    if (result.ok) {
      setStatus("sent");
      setMessage("");
      setResourceId("");
      setTimeout(() => {
        setOpen(false);
        setStatus("idle");
      }, 2000);
    } else {
      setError(result.error ?? "Could not save report.");
      setStatus("error");
    }
  }

  if (!resources.length) return null;

  return (
    <section className="rounded-2xl border border-dashed border-brand-line bg-brand-soft/70 p-5">
      {!open ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium text-brand-navy">Something look wrong?</p>
            <p className="mt-1 text-sm text-brand-muted">
              Wrong file, broken link, missing upload, or general issue for {courseCode}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-full border border-brand-gold/40 bg-white/70 px-4 py-2 text-sm font-semibold text-brand-gold hover:bg-white"
          >
            Report an issue
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="font-medium text-brand-navy">Report an issue</p>
          <label className="block text-xs font-medium text-brand-muted">
            Type of issue
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as IssueCategory)}
              className="app-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
            >
              {ISSUE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-brand-muted">
            Which file? (optional)
            <select
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              className="app-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
            >
              <option value="">General course/site issue</option>
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
              placeholder="What should an admin fix? Add the page, file, or button if relevant."
              className="app-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={status === "sending" || !message.trim()}
              className="rounded-full bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-sidebar disabled:opacity-50"
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
                {error ?? "Could not save report."}
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
