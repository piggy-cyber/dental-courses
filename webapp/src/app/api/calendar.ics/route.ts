import { getClinicDutyShowcase } from "@/lib/clinic-duty-showcase";
import { buildSharedCalendar, buildSharedCalendarIcs } from "@/lib/shared-calendar";

export const dynamic = "force-dynamic";

export async function GET() {
  const showcase = await getClinicDutyShowcase();
  if (!showcase) return new Response("Calendar unavailable", { status: 503 });

  const calendar = buildSharedCalendar(showcase);
  const body = buildSharedCalendarIcs(calendar);

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="fourth-canal-d2-calendar-fall-2026.ics"',
      "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=3600",
    },
  });
}
