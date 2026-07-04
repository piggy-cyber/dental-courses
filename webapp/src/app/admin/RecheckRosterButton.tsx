"use client";

import { useState, useTransition } from "react";
import { recheckRosterMatches } from "@/app/admin/actions";

export function RecheckRosterButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        const count = await recheckRosterMatches();
        setMessage(`${count} profile${count === 1 ? "" : "s"} matched.`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Roster recheck failed");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={run}
        disabled={isPending}
        className="portal-button-primary px-4 py-2 text-sm disabled:opacity-60"
      >
        {isPending ? "Checking..." : "Recheck roster"}
      </button>
      {message && <span className="text-sm text-emerald-700">{message}</span>}
      {error && <span className="text-sm text-rose-600">{error}</span>}
    </div>
  );
}
