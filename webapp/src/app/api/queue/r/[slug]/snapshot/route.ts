import { NextRequest, NextResponse } from "next/server";
import {
  getQueueAdminSnapshot,
  getQueueDisplaySnapshot,
  getQueueGuestSnapshot,
  queueErrorResponse,
  requireQueueProfile,
} from "@/lib/queue-master-server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const view = request.nextUrl.searchParams.get("view") ?? "guest";
    const snapshot = view === "display"
      ? await getQueueDisplaySnapshot(slug)
      : view === "admin"
        ? await getQueueAdminSnapshot(slug, await requireQueueProfile())
        : await getQueueGuestSnapshot(slug, request.cookies.get("fc_queue_guest")?.value ?? null);
    return NextResponse.json(snapshot, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const response = queueErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
