import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let database = false;
  if (process.env.SUPABASE_SECRET_KEY?.trim()) {
    try {
      const admin = createAdminClient();
      const { error } = await admin.from("profiles").select("id", { head: true, count: "exact" }).limit(1);
      database = !error;
    } catch {
      database = false;
    }
  }

  const body = { status: database ? "ok" : "degraded", checks: { app: true, database } };
  return NextResponse.json(body, { status: database ? 200 : 503 });
}
