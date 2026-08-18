import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type PurgeResult = {
  entries_removed?: number;
  limits_removed?: number;
};

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("purge_lab_help_queue_data");
  if (error) {
    return NextResponse.json({ error: "Lab queue retention failed" }, { status: 500 });
  }

  const result = (Array.isArray(data) ? data[0] : data) as PurgeResult | null;
  return NextResponse.json({
    removedEntries: Number(result?.entries_removed ?? 0),
    removedRateLimits: Number(result?.limits_removed ?? 0),
  });
}
