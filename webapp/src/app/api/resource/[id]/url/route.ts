import { NextResponse } from "next/server";
import { getResourceSignedUrl } from "@/lib/resource-url";

// Returns a short-lived signed URL for inline preview (JSON, no redirect).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await getResourceSignedUrl(Number(id), { inline: true });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    signedUrl: result.signedUrl,
    name: result.name,
    ext: result.ext,
    kind: result.kind,
    courseCode: result.courseCode,
  });
}
