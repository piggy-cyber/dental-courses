"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type QueueApiError = { message?: string };

export function useQueueSnapshot<T extends { lobby: { id: string; revision: number } }>(
  slug: string,
  view: "guest" | "admin" | "display" | "staff",
) {
  const [snapshot, setSnapshot] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const latestRevision = useRef(0);

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch(`/api/queue/r/${encodeURIComponent(slug)}/snapshot?view=${view}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      const payload = await response.json() as T & QueueApiError;
      if (!response.ok) throw new Error(payload.message || "Could not load the queue.");
      latestRevision.current = payload.lobby.revision;
      setSnapshot(payload);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load the queue.");
    } finally {
      setLoading(false);
    }
  }, [slug, view]);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const fallback = window.setInterval(() => void refresh(true), 15_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(fallback);
    };
  }, [refresh]);

  useEffect(() => {
    if (!snapshot?.lobby.id) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`queue:${snapshot.lobby.id}`)
      .on("broadcast", { event: "queue_changed" }, ({ payload }) => {
        const revision = typeof payload?.revision === "number" ? payload.revision : 0;
        if (revision > latestRevision.current) void refresh(true);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void refresh(true);
      });
    return () => { void supabase.removeChannel(channel); };
  }, [refresh, snapshot?.lobby.id]);

  return { snapshot, error, loading, refresh };
}

export async function sendQueueAction(
  slug: string,
  audience: "guest" | "admin" | "staff",
  action: object,
) {
  const response = await fetch(`/api/queue/r/${encodeURIComponent(slug)}/${audience}`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(action),
  });
  const payload = await response.json() as QueueApiError;
  if (!response.ok) throw new Error(payload.message || "That action could not be completed.");
}
