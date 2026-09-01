import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("purge_queue_pilot_data");
  if (error) return NextResponse.json({ error: "Queue retention failed" }, { status: 500 });
  const result = (Array.isArray(data) ? data[0] : data) as { entries_deleted?: number; sessions_deleted?: number } | null;
  return NextResponse.json({
    removedEntries: Number(result?.entries_deleted ?? 0),
    removedGuestSessions: Number(result?.sessions_deleted ?? 0),
  });
}
