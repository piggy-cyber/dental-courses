import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResourceForDownload } from "@/lib/resource-url";

const MAX_TEXT_BYTES = 512 * 1024;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await getResourceForDownload(Number(id));

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const admin = createAdminClient();
  const { data: blob, error } = await admin.storage
    .from("course-files")
    .download(result.storagePath);

  if (error || !blob) {
    return NextResponse.json({ error: "Could not read file" }, { status: 500 });
  }

  if (blob.size > MAX_TEXT_BYTES) {
    return NextResponse.json({ error: "Text file too large to preview" }, { status: 413 });
  }

  const text = await blob.text();
  return new NextResponse(text, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
