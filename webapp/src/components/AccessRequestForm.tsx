"use client";

import { useState, useTransition } from "react";
import { saveAccessNote } from "@/app/admin/actions";

export function AccessRequestForm({
  initialNote,
}: {
  initialNote?: string | null;
}) {
  const [note, setNote] = useState(initialNote ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        await saveAccessNote(note);
        setMessage("Request saved. An admin will review your account.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save");
      }
    });
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 text-left">
      <label className="block text-sm font-medium text-amber-900" htmlFor="access-note">
        Message for admin (optional)
      </label>
      <textarea
        id="access-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        maxLength={500}
        placeholder="e.g. D1 classmate, paid via Venmo on..."
        className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-brand-ink"
      />
      {error && <p className="text-sm text-rose-700">{error}</p>}
      {message && <p className="text-sm text-emerald-700">{message}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-amber-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isPending ? "Saving..." : "Save request note"}
      </button>
    </form>
  );
}
