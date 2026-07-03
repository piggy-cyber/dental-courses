"use client";

import { useState } from "react";
import {
  reportResourceProblem,
  type IssueCategory,
} from "@/app/(protected)/course/actions";

const ISSUE_TYPES: { value: IssueCategory; label: string }[] = [
  { value: "site", label: "General site issue" },
  { value: "account", label: "Account or access issue" },
  { value: "broken_link", label: "Broken link or button" },
  { value: "other", label: "Other" },
];

export function SiteReportSection() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<IssueCategory>("site");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!message.trim()) return;
    setStatus("sending");
    setError(null);
    const result = await reportResourceProblem({
      category,
      message: message.trim(),
    });
    if (result.ok) {
      setStatus("sent");
      setMessage("");
      setTimeout(() => {
        setOpen(false);
        setStatus("idle");
      }, 2000);
    } else {
      setError(result.error ?? "Could not save report.");
      setStatus("error");
    }
  }

  return (
    <section className="rounded-xl border border-brand-line bg-brand-panel p-5 shadow-sm">
      {!open ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Help improve this</p>
            <h2 className="mt-1 font-bold text-brand-navy">Report a site issue</h2>
            <p className="mt-1 text-sm text-brand-muted">
              Broken button, confusing page, missing feature, or access problem.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-full border border-amber-700/30 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-50"
          >
            Report issue
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
            <label className="block text-xs font-medium text-brand-muted">
              Issue type
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as IssueCategory)}
                className="mt-1 w-full rounded-lg border border-brand-line bg-white px-3 py-2 text-sm text-brand-ink"
              >
                {ISSUE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-brand-muted">
              What should an admin fix?
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Example: The homepage weather loads, but the Canvas schedule is missing after I saved my feed."
                className="mt-1 w-full rounded-lg border border-brand-line bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={status === "sending" || !message.trim()}
              className="rounded-full bg-amber-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {status === "sending" ? "Sending..." : status === "sent" ? "Sent" : "Send report"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setStatus("idle");
                setError(null);
              }}
              className="text-sm text-brand-muted hover:underline"
            >
              Cancel
            </button>
            {status === "error" && (
              <span className="text-sm text-red-600">{error ?? "Could not save report."}</span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
