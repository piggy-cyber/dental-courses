import { getSessionProfile } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CalendarDuty = {
  duty_date: string;
  opens_at: string;
  closes_at: string;
  partner_name: string;
};

function icsDate(iso: string) {
  return new Date(iso).toISOString().replaceAll("-", "").replaceAll(":", "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcs(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}

export async function GET() {
  const { profile } = await getSessionProfile();
  if (
    !profile
    || profile.status !== "approved"
    || !profile.roster_id
    || profile.graduation_year !== 2029
    || !profile.roster_access_approved
  ) {
    return new Response("Not authorized", { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_sim_clinic_duty_calendar");
  if (error) return new Response("Calendar unavailable", { status: 503 });
  const duties = (data as CalendarDuty[] | null) ?? [];
  const generatedAt = icsDate(new Date().toISOString());
  const events = duties.flatMap((duty) => [
    "BEGIN:VEVENT",
    `UID:sim-clinic-duty-${profile.roster_id}-${duty.duty_date}@fourthcanal.com`,
    `DTSTAMP:${generatedAt}`,
    `DTSTART:${icsDate(duty.opens_at)}`,
    `DTEND:${icsDate(duty.closes_at)}`,
    "SUMMARY:Sim Clinic Duty",
    `DESCRIPTION:${escapeIcs(`Shared Lab and Sim Clinic duty with ${duty.partner_name}. Complete the shared-space checklist and private photo in Fourth Canal.`)}`,
    "URL:https://fourthcanal.com/clinic-duty",
    "BEGIN:VALARM",
    "TRIGGER:-PT24H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Sim Clinic Duty is tomorrow",
    "END:VALARM",
    "END:VEVENT",
  ]);
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Fourth Canal//Sim Clinic Duty//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Sim Clinic Duty",
    ...events,
    "END:VCALENDAR",
    "",
  ].join("\r\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="sim-clinic-duty-fall-2026.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
