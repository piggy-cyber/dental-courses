"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function TranscriptButton({
  lectureId,
  title,
}: {
  lectureId: string;
  title: string;
}) {
  const [text, setText] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function load() {
    if (text !== null) {
      setOpen(!open);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("transcripts")
      .select("content")
      .eq("lecture_id", lectureId)
      .single();
    setText(data?.content ?? "Transcript could not be loaded.");
    setOpen(true);
    setLoading(false);
  }

  async function copy() {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function download() {
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^\w\s-]/g, "").trim() || "transcript"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={load}
          disabled={loading}
          className="rounded-full border border-brand-line bg-white/70 px-4 py-1.5 text-sm font-semibold text-brand-navy transition hover:border-brand-blue hover:bg-white disabled:opacity-60"
        >
          {loading ? "Loading..." : open ? "Hide transcript" : "View transcript"}
        </button>
        {open && text && (
          <>
            <button
              onClick={copy}
              className="rounded-full border border-brand-line bg-white/70 px-4 py-1.5 text-sm font-semibold text-brand-navy transition hover:border-brand-blue hover:bg-white"
            >
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={download}
              className="rounded-full border border-brand-line bg-white/70 px-4 py-1.5 text-sm font-semibold text-brand-navy transition hover:border-brand-blue hover:bg-white"
            >
              Download .txt
            </button>
          </>
        )}
      </div>
      {open && text && (
        <pre className="mt-3 max-h-80 overflow-y-auto whitespace-pre-wrap rounded-xl border border-brand-line bg-white/80 p-4 text-xs leading-relaxed text-brand-muted">
          {text}
        </pre>
      )}
    </div>
  );
}
