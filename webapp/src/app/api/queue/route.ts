import { NextRequest, NextResponse } from "next/server";
import type { QueueLobbyLifecycleAction } from "@/lib/queue-master";
import { createQueueLobby, getQueueHome, getQueueProfile, isQueueJsonRequest, isQueueSameOriginRequest, queueErrorResponse, requireQueueProfile, setQueueLobbyClosed } from "@/lib/queue-master-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const profile = await getQueueProfile();
    const home = await getQueueHome(profile, request.cookies.get("fc_queue_guest")?.value ?? null);
    return NextResponse.json({ ...home, signedIn: Boolean(profile) }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const response = queueErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isQueueSameOriginRequest(request)) {
      return NextResponse.json({ error: "forbidden", message: "Refresh the page and try again." }, { status: 403 });
    }
    if (!isQueueJsonRequest(request)) {
      return NextResponse.json({ error: "json_required", message: "Send this request as JSON." }, { status: 415 });
    }
    const profile = await requireQueueProfile();
    const payload = await request.json() as { name?: unknown };
    const lobby = await createQueueLobby(profile, payload.name);
    return NextResponse.json({ lobby }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const response = queueErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!isQueueSameOriginRequest(request)) {
      return NextResponse.json({ error: "forbidden", message: "Refresh the page and try again." }, { status: 403 });
    }
    if (!isQueueJsonRequest(request)) {
      return NextResponse.json({ error: "json_required", message: "Send this request as JSON." }, { status: 415 });
    }
    const profile = await requireQueueProfile();
    const payload = await request.json() as QueueLobbyLifecycleAction;
    if (payload.type !== "close" && payload.type !== "reopen") {
      return NextResponse.json({ error: "invalid_action", message: "That lobby action is not supported." }, { status: 400 });
    }
    const lobby = await setQueueLobbyClosed(profile, payload.lobbyId, payload.type === "close");
    return NextResponse.json({ lobby }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const response = queueErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
