"use client";

import { useState } from "react";
import { reportResourceProblem } from "@/app/(protected)/course/actions";

export function ReportProblemButton({
  resourceId,
  resourceName,
}: {
  resourceId: number;
  resourceName: string;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit() {
    if (!message.trim()) return;
    setStatus("sending");
    const result = await reportResourceProblem(resourceId, message.trim());
    if (result.ok) {
      setStatus("sent");
      setMessage("");
      setTimeout(() => {
        setOpen(false);
        setStatus("idle");
      }, 1500);
    } else {
      setStatus("error");
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 text-xs text-slate-400 hover:text-amber-700"
      >
        Report problem
      </button>
    );
  }

  return (
    <div className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50 p-3">
      <p className="text-xs font-medium text-amber-900">Report: {resourceName}</p>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={2}
        placeholder="Wrong course, broken link, missing file..."
        className="mt-2 w-full rounded border border-amber-200 bg-white px-2 py-1 text-xs"
      />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={status === "sending" || !message.trim()}
          className="rounded-full bg-amber-800 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          {status === "sending" ? "Sending..." : status === "sent" ? "Sent" : "Send"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setStatus("idle");
          }}
          className="text-xs text-slate-500 hover:underline"
        >
          Cancel
        </button>
        {status === "error" && (
          <span className="text-xs text-red-600">Could not save — run resource-reports.sql</span>
        )}
      </div>
    </div>
  );
}
