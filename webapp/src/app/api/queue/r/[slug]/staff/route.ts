import { NextRequest, NextResponse } from "next/server";
import { isQueueUuid, type QueueStaffAction } from "@/lib/queue-master";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  findLobbyBySlug,
  isQueueJsonRequest,
  isQueueSameOriginRequest,
  mapQueueDatabaseError,
  queueErrorResponse,
  requireQueueProfile,
} from "@/lib/queue-master-server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    if (!isQueueSameOriginRequest(request)) {
      return NextResponse.json({ error: "forbidden", message: "Refresh the page and try again." }, { status: 403 });
    }
    if (!isQueueJsonRequest(request)) {
      return NextResponse.json({ error: "json_required", message: "Send this request as JSON." }, { status: 415 });
    }
    const { slug } = await params;
    const profile = await requireQueueProfile();
    const lobby = await findLobbyBySlug(slug);
    const payload = await request.json() as QueueStaffAction;
    const admin = createAdminClient();

    if (payload.type === "join") {
      const { error } = await admin.rpc("queue_join_staff_pool", {
        p_lobby_id: lobby.id,
        p_profile_id: profile.id,
        p_display_name: profile.name,
        p_email: profile.email,
      });
      if (error) throw mapQueueDatabaseError(error.message);
    } else if (payload.type === "heartbeat" || payload.type === "leave") {
      if (!isQueueUuid(payload.candidateId)) return invalidAction();
      const { error } = await admin.rpc(
        payload.type === "heartbeat" ? "queue_staff_candidate_heartbeat" : "queue_leave_staff_pool",
        { p_candidate_id: payload.candidateId, p_lobby_id: lobby.id, p_profile_id: profile.id },
      );
      if (error) throw mapQueueDatabaseError(error.message);
    } else if (payload.type === "accept" || payload.type === "decline") {
      if (!isQueueUuid(payload.requestId)) return invalidAction();
      const { error } = await admin.rpc("queue_respond_admin_promotion", {
        p_request_id: payload.requestId,
        p_lobby_id: lobby.id,
        p_candidate_profile_id: profile.id,
        p_accept: payload.type === "accept",
        p_display_name: profile.name,
      });
      if (error) throw mapQueueDatabaseError(error.message);
    } else {
      return invalidAction();
    }

    return NextResponse.json(
      { ok: true, redirectTo: payload.type === "accept" ? `/queue/r/${lobby.slug}/admin` : null },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const response = queueErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

function invalidAction() {
  return NextResponse.json({ error: "invalid_action", message: "That staff-pool action is not supported." }, { status: 400 });
}
