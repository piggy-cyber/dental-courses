import { NextRequest, NextResponse } from "next/server";
import { isQueueUuid, type QueueAdminAction } from "@/lib/queue-master";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  findLobbyBySlug,
  getMembership,
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
    const membership = await getMembership(lobby.id, profile.id);
    if (!membership) {
      return NextResponse.json({ error: "staff_required", message: "You are not staff for this lobby." }, { status: 403 });
    }
    const payload = await request.json() as QueueAdminAction;
    const admin = createAdminClient();

    if (payload.type === "set_accepting") {
      if (typeof payload.accepting !== "boolean") return invalidAction();
      const { error } = await admin
        .from("queue_memberships")
        .update({ accepting_guests: payload.accepting, last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", membership.id)
        .is("revoked_at", null);
      if (error) throw mapQueueDatabaseError(error.message);
    } else if (payload.type === "call") {
      if (!isQueueUuid(payload.entryId)) return invalidAction();
      const { error } = await admin.rpc("queue_call_entry_scoped", {
        p_lobby_id: lobby.id,
        p_entry_id: payload.entryId,
        p_actor_profile_id: profile.id,
      });
      if (error) throw mapQueueDatabaseError(error.message);
    } else if (["start_helping", "finish", "cancel", "no_show"].includes(payload.type)) {
      if (!("entryId" in payload) || !isQueueUuid(payload.entryId)) return invalidAction();
      const toStatus = payload.type === "start_helping" ? "helping"
        : payload.type === "finish" ? "completed"
          : payload.type === "cancel" ? "cancelled" : "no_show";
      const { error } = await admin.rpc("queue_transition_entry_scoped", {
        p_lobby_id: lobby.id,
        p_entry_id: payload.entryId,
        p_to_status: toStatus,
        p_actor_kind: "staff",
        p_actor_profile_id: profile.id,
        p_guest_session_id: null,
      });
      if (error) throw mapQueueDatabaseError(error.message);
    } else if (payload.type === "reassign" || payload.type === "reorder") {
      if (!isQueueUuid(payload.entryId)) return invalidAction();
      if (payload.type === "reassign" && !isQueueUuid(payload.membershipId)) return invalidAction();
      if (payload.type === "reorder" && (!Number.isSafeInteger(payload.sortPosition) || payload.sortPosition < 1)) return invalidAction();
      const { error } = await admin.rpc("queue_manage_waiting_entry_scoped", {
        p_lobby_id: lobby.id,
        p_entry_id: payload.entryId,
        p_actor_profile_id: profile.id,
        p_assigned_membership_id: payload.type === "reassign" ? payload.membershipId : null,
        p_sort_position: payload.type === "reorder" ? payload.sortPosition : null,
      });
      if (error) throw mapQueueDatabaseError(error.message);
    } else if (payload.type === "request_promotion") {
      if (membership.role !== "owner") return ownerRequired();
      if (!isQueueUuid(payload.candidateId)) return invalidAction();
      const { error } = await admin.rpc("queue_request_admin_promotion", {
        p_candidate_id: payload.candidateId,
        p_lobby_id: lobby.id,
        p_owner_profile_id: profile.id,
      });
      if (error) throw mapQueueDatabaseError(error.message);
    } else if (payload.type === "cancel_promotion") {
      if (membership.role !== "owner") return ownerRequired();
      if (!isQueueUuid(payload.requestId)) return invalidAction();
      const { error } = await admin.rpc("queue_cancel_admin_promotion", {
        p_request_id: payload.requestId,
        p_lobby_id: lobby.id,
        p_owner_profile_id: profile.id,
      });
      if (error) throw mapQueueDatabaseError(error.message);
    } else if (payload.type === "remove_staff") {
      if (membership.role !== "owner") return ownerRequired();
      if (!isQueueUuid(payload.membershipId)) return invalidAction();
      const { error } = await admin.rpc("queue_remove_membership_scoped", {
        p_lobby_id: lobby.id,
        p_membership_id: payload.membershipId,
        p_owner_profile_id: profile.id,
      });
      if (error) throw mapQueueDatabaseError(error.message);
    } else {
      return invalidAction();
    }

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const response = queueErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

function invalidAction() {
  return NextResponse.json({ error: "invalid_action", message: "That staff action is not supported." }, { status: 400 });
}

function ownerRequired() {
  return NextResponse.json({ error: "owner_required", message: "Only the lobby owner can manage staff." }, { status: 403 });
}
