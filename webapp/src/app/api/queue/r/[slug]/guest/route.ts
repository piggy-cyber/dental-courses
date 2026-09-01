import { NextRequest, NextResponse } from "next/server";
import { isQueueUuid, normalizeQueueText, type QueueGuestAction } from "@/lib/queue-master";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  findLobbyBySlug,
  getOrCreateGuestSession,
  isQueueJsonRequest,
  isQueueSameOriginRequest,
  mapQueueDatabaseError,
  queueErrorResponse,
  requireGuestSession,
  setQueueGuestCookie,
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
    const lobby = await findLobbyBySlug(slug);
    const payload = await request.json() as QueueGuestAction;
    const admin = createAdminClient();
    const cookieToken = request.cookies.get("fc_queue_guest")?.value ?? null;
    let tokenToSet: string | null = null;

    if (payload.type === "check_in") {
      const firstName = normalizeQueueText(payload.firstName, 40);
      const location = normalizeQueueText(payload.location, 40);
      if (!firstName || !location || !isQueueUuid(payload.membershipId)) {
        return NextResponse.json({ error: "invalid_check_in", message: "Enter your first name, location, and a staff member." }, { status: 400 });
      }
      const guest = await getOrCreateGuestSession(cookieToken);
      tokenToSet = guest.created ? guest.token : null;
      const { error } = await admin.rpc("queue_join_lobby", {
        p_lobby_id: lobby.id,
        p_guest_session_id: guest.session.id,
        p_guest_first_name: firstName,
        p_location: location,
        p_assigned_membership_id: payload.membershipId,
      });
      if (error) throw mapQueueDatabaseError(error.message);
    } else {
      if (!isQueueUuid(payload.entryId)) {
        return NextResponse.json({ error: "invalid_entry", message: "Refresh the page and try again." }, { status: 400 });
      }
      const guest = await requireGuestSession(cookieToken);
      const toStatus = payload.type === "start_helping"
        ? "helping"
        : payload.type === "finish"
          ? "completed"
          : payload.type === "leave"
            ? "cancelled"
            : null;
      if (!toStatus) {
        return NextResponse.json({ error: "invalid_action", message: "That guest action is not supported." }, { status: 400 });
      }
      const { error } = await admin.rpc("queue_transition_entry", {
        p_entry_id: payload.entryId,
        p_to_status: toStatus,
        p_actor_kind: "guest",
        p_actor_profile_id: null,
        p_guest_session_id: guest.id,
      });
      if (error) throw mapQueueDatabaseError(error.message);
    }

    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
    if (tokenToSet) setQueueGuestCookie(response, request, tokenToSet);
    return response;
  } catch (error) {
    const response = queueErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
