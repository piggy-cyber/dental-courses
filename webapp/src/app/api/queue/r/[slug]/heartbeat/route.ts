import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  findLobbyBySlug,
  getMembership,
  isQueueSameOriginRequest,
  queueErrorResponse,
  requireQueueProfile,
} from "@/lib/queue-master-server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    if (!isQueueSameOriginRequest(request)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const { slug } = await params;
    const profile = await requireQueueProfile();
    const lobby = await findLobbyBySlug(slug);
    const membership = await getMembership(lobby.id, profile.id);
    if (!membership) return NextResponse.json({ error: "staff_required" }, { status: 403 });
    const now = new Date().toISOString();
    const admin = createAdminClient();
    const { error } = await admin
      .from("queue_memberships")
      .update({ last_seen_at: now, updated_at: now })
      .eq("id", membership.id)
      .is("revoked_at", null);
    if (error) throw error;
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const response = queueErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
