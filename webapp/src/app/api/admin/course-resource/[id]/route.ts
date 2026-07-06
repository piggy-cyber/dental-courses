import { NextResponse } from "next/server";
import { authorizeCourseUpload } from "@/lib/course-upload-auth";
import { deleteResource } from "@/app/admin/course-actions";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await authorizeCourseUpload(request);
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Not authorized." }, { status: 401 });
  }

  const { id } = await params;
  const resourceId = Number(id);
  if (!Number.isFinite(resourceId)) {
    return NextResponse.json({ ok: false, error: "Invalid resource id." }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const courseCode = searchParams.get("courseCode")?.trim();
  const collectionId = searchParams.get("collectionId")?.trim();

  if (!courseCode || !collectionId) {
    return NextResponse.json(
      { ok: false, error: "courseCode and collectionId query params are required." },
      { status: 400 }
    );
  }

  try {
    await deleteResource(courseCode, collectionId, resourceId, actor.kind === "admin" ? actor.userId : null);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Delete failed." },
      { status: 500 }
    );
  }
}
