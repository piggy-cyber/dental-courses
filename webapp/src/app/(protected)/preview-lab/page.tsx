import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { PreviewLabClient } from "@/components/PreviewLabClient";

export const dynamic = "force-dynamic";

const DEFAULT_RESOURCE_ID = 5296;

export default async function PreviewLabPage() {
  const supabase = await createClient();
  const { data: resources } = await supabase
    .from("resources")
    .select("id, name, ext, course_code, size_mb")
    .not("storage_path", "is", null)
    .order("size_mb", { ascending: true, nullsFirst: false });

  const list = resources ?? [];
  const defaultId = list.some((r) => r.id === DEFAULT_RESOURCE_ID)
    ? DEFAULT_RESOURCE_ID
    : list[0]?.id ?? DEFAULT_RESOURCE_ID;

  return (
    <div className="space-y-8">
      <header>
        <Link href="/home" className="text-sm text-brand-blue hover:underline">
          &larr; Home
        </Link>
        <p className="eyebrow mt-2">Sandbox</p>
        <h1 className="text-2xl font-bold text-brand-navy">File preview lab</h1>
        <p className="mt-2 max-w-2xl text-sm text-brand-muted">
          Try inline preview before download. Supports PDF, images, Office (DOC/DOCX/PPT/PPTX via
          Microsoft viewer), video, and text. APKG and other binaries are download-only. Use crash
          test below to verify signed URLs for every uploaded file.
        </p>
      </header>

      {list.length === 0 ? (
        <div className="app-card p-8 text-center text-sm text-brand-muted">
          <p>No uploaded files in storage yet.</p>
          <p className="mt-2">
            Run{" "}
            <code className="rounded bg-brand-soft px-1.5 py-0.5 text-brand-ink">
              node scripts/upload-files.mjs --canvas
            </code>{" "}
            from the webapp folder, then refresh.
          </p>
        </div>
      ) : (
        <Suspense
          fallback={
            <div className="text-sm text-brand-muted">Loading preview lab…</div>
          }
        >
          <PreviewLabClient resources={list} defaultId={defaultId} />
        </Suspense>
      )}
    </div>
  );
}
