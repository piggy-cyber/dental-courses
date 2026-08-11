import { NextResponse } from "next/server";
import { CLINIC_DUTY_BUCKET } from "@/lib/clinic-duty";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const stalePending = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const [{ data: expired, error: expiredError }, { data: abandoned, error: abandonedError }] = await Promise.all([
    admin
      .from("sim_clinic_duty_photos")
      .select("id, storage_path")
      .eq("status", "ready")
      .lte("purge_after", now.toISOString())
      .limit(1000),
    admin
      .from("sim_clinic_duty_photos")
      .select("id, storage_path")
      .eq("status", "pending")
      .lte("created_at", stalePending)
      .limit(250),
  ]);
  if (expiredError || abandonedError) {
    return NextResponse.json(
      { error: expiredError?.message ?? abandonedError?.message ?? "Retention query failed" },
      { status: 500 }
    );
  }

  const records = [...(expired ?? []), ...(abandoned ?? [])];
  if (records.length === 0) return NextResponse.json({ removed: 0 });
  const { error: storageError } = await admin.storage
    .from(CLINIC_DUTY_BUCKET)
    .remove(records.map((record) => record.storage_path));
  if (storageError) return NextResponse.json({ error: storageError.message }, { status: 500 });

  const { error: deleteError } = await admin
    .from("sim_clinic_duty_photos")
    .delete()
    .in("id", records.map((record) => record.id));
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  return NextResponse.json({ removed: records.length });
}
