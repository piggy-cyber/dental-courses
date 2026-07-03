"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  extUpper,
  officeEmbedUrl,
  previewStrategy,
  previewStrategyLabel,
  type PreviewStrategy,
} from "@/lib/preview-capabilities";

type PreviewMeta = {
  signedUrl: string;
  name: string;
  ext: string | null;
  kind: string | null;
  courseCode: string;
};

type PreviewState = {
  resourceId: number;
  meta: PreviewMeta | null;
  error: string | null;
  loading: boolean;
};

function PreviewFrame({ strategy, meta }: { strategy: PreviewStrategy; meta: PreviewMeta }) {
  const upper = extUpper(meta.ext);

  if (strategy === "pdf") {
    return (
      <iframe
        src={meta.signedUrl}
        title={meta.name}
        className="h-[70vh] w-full rounded-xl border border-brand-line bg-white"
      />
    );
  }

  if (strategy === "image") {
    return (
      <Image
        src={meta.signedUrl}
        alt={meta.name}
        width={1200}
        height={900}
        className="mx-auto max-h-[70vh] max-w-full rounded-xl border border-brand-line bg-white object-contain"
        unoptimized
      />
    );
  }

  if (strategy === "office") {
    return (
      <div className="space-y-2">
        <p className="text-xs text-brand-muted">
          Rendering via Microsoft Office viewer ({upper}). If it stays blank, the file may be too
          large or the viewer may be unavailable — use Download.
        </p>
        <iframe
          src={officeEmbedUrl(meta.signedUrl)}
          title={meta.name}
          className="h-[70vh] w-full rounded-xl border border-brand-line bg-white"
        />
      </div>
    );
  }

  if (strategy === "video") {
    return (
      <video
        src={meta.signedUrl}
        controls
        className="mx-auto max-h-[70vh] w-full rounded-xl border border-brand-line bg-black"
      >
        Your browser does not support video playback.
      </video>
    );
  }

  if (strategy === "text") {
    return <TextPreview resourceId={meta.name} />;
  }

  return (
    <div className="rounded-xl border border-dashed border-brand-line bg-white px-6 py-12 text-center">
      <p className="font-medium text-brand-navy">Preview not supported</p>
      <p className="mt-2 text-sm text-brand-muted">
        {upper || "This file type"} (e.g. APKG, ZIP) — download to open locally.
      </p>
    </div>
  );
}

function TextPreview({ resourceId }: { resourceId: number | string }) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const id = typeof resourceId === "number" ? resourceId : null;
    if (id === null) return;

    fetch(`/api/resource/${id}/text`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Could not load text");
        }
        return res.text();
      })
      .then((value) => {
        if (!cancelled) setText(value);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [resourceId]);

  if (error) {
    return <p className="text-sm text-red-700">{error}</p>;
  }
  if (text === null) {
    return <p className="text-sm text-brand-muted">Loading text…</p>;
  }

  return (
    <pre className="max-h-[70vh] overflow-auto rounded-xl border border-brand-line bg-white p-4 text-xs leading-relaxed text-brand-ink">
      {text}
    </pre>
  );
}

export function ResourcePreviewPanel({ resourceId }: { resourceId: number }) {
  const [state, setState] = useState<PreviewState>({
    resourceId,
    meta: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/resource/${resourceId}/url`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Could not load preview");
        if (!cancelled) {
          setState({
            resourceId,
            meta: body as PreviewMeta,
            error: null,
            loading: false,
          });
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setState({
            resourceId,
            meta: null,
            error: err.message,
            loading: false,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [resourceId]);

  const loading = state.loading || state.resourceId !== resourceId;
  const error = state.resourceId === resourceId ? state.error : null;
  const meta = state.resourceId === resourceId ? state.meta : null;

  if (loading) {
    return (
      <div className="app-card p-8 text-center text-sm text-brand-muted">
        Loading preview…
      </div>
    );
  }

  if (error || !meta) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        {error ?? "Preview unavailable"}
      </div>
    );
  }

  const strategy = previewStrategy(meta.ext);

  return (
    <div className="app-card overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-brand-line px-5 py-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
            {meta.courseCode} · {meta.kind ?? "File"} · {previewStrategyLabel(strategy)}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-brand-navy">{meta.name}</h2>
          {meta.ext && <p className="mt-1 text-xs text-brand-muted">{meta.ext}</p>}
        </div>
        <a
          href={`/api/resource/${resourceId}`}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-full border border-brand-line bg-white/70 px-4 py-2 text-sm font-semibold text-brand-blue transition hover:border-brand-blue hover:bg-white"
        >
          Download
        </a>
      </div>

      <div className="bg-brand-soft/70 p-4">
        {strategy === "text" ? (
          <TextPreview resourceId={resourceId} />
        ) : (
          <PreviewFrame strategy={strategy} meta={meta} />
        )}
      </div>
    </div>
  );
}
