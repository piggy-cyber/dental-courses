"use client";

import { useState, useTransition } from "react";
import { retrySlackDelivery } from "@/app/admin/actions";

export function RetryDeliveryButton({ outboxId }: { outboxId: number }) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function retry() {
    setMessage(null);
    startTransition(async () => {
      try {
        await retrySlackDelivery(outboxId);
        setMessage("Retried.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Retry failed.");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={retry}
        disabled={isPending}
        className="border border-brand-line px-3 py-1 text-xs font-semibold text-brand-navy disabled:opacity-50"
      >
        {isPending ? "Retrying…" : "Retry"}
      </button>
      {message && <span className="text-xs text-brand-muted">{message}</span>}
    </div>
  );
}
