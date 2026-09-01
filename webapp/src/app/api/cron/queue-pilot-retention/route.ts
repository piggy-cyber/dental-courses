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
  const [queueResult, staffResult] = await Promise.all([
    admin.rpc("purge_queue_pilot_data"),
    admin.rpc("purge_queue_staff_pool_data"),
  ]);
  if (queueResult.error || staffResult.error) return NextResponse.json({ error: "Queue retention failed" }, { status: 500 });
  const result = (Array.isArray(queueResult.data) ? queueResult.data[0] : queueResult.data) as { entries_deleted?: number; sessions_deleted?: number } | null;
  const staff = (Array.isArray(staffResult.data) ? staffResult.data[0] : staffResult.data) as { candidates_deleted?: number; requests_deleted?: number; requests_expired?: number } | null;
  return NextResponse.json({
    removedEntries: Number(result?.entries_deleted ?? 0),
    removedGuestSessions: Number(result?.sessions_deleted ?? 0),
    removedStaffCandidates: Number(staff?.candidates_deleted ?? 0),
    removedPromotionRequests: Number(staff?.requests_deleted ?? 0),
    expiredPromotionRequests: Number(staff?.requests_expired ?? 0),
  });
}
