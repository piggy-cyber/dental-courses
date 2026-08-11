import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildClinicDutyShowcase,
  buildFall2026ShowcaseSnapshot,
  type ClinicDutyShowcase,
  type ClinicDutyShowcaseDateRow,
  type ClinicDutyShowcaseRosterRow,
  type ClinicDutyShowcaseSlotRow,
  type ClinicDutyShowcaseTermRow,
} from "@/lib/clinic-duty-showcase-shared";

export async function getClinicDutyShowcase(): Promise<ClinicDutyShowcase | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("https://")
    || !process.env.SUPABASE_SECRET_KEY?.trim()
    || process.env.SUPABASE_SECRET_KEY === "[SENSITIVE]"
  ) {
    return buildFall2026ShowcaseSnapshot();
  }

  const supabase = createAdminClient();
  const { data: termData, error: termError } = await supabase
    .from("sim_clinic_duty_terms")
    .select("id,slug,label,starts_on,ends_on,timezone")
    .eq("slug", "fall-2026")
    .eq("status", "published")
    .maybeSingle();

  if (termError) throw new Error(`Unable to load the showcase term: ${termError.message}`);
  if (!termData) return null;

  const term = termData as ClinicDutyShowcaseTermRow;
  const { data: dateData, error: dateError } = await supabase
    .from("sim_clinic_duty_dates")
    .select("id,duty_date,opens_at,closes_at,status,closure_reason")
    .eq("term_id", term.id)
    .order("duty_date", { ascending: true });

  if (dateError) throw new Error(`Unable to load showcase dates: ${dateError.message}`);
  const dates = (dateData ?? []) as ClinicDutyShowcaseDateRow[];
  const dateIds = dates.map((date) => date.id);

  const { data: slotData, error: slotError } = dateIds.length > 0
    ? await supabase
        .from("sim_clinic_duty_slots")
        .select("id,duty_date_id,position,assignee_roster_id")
        .in("duty_date_id", dateIds)
        .order("position", { ascending: true })
    : { data: [], error: null };

  if (slotError) throw new Error(`Unable to load showcase assignments: ${slotError.message}`);
  const slots = (slotData ?? []) as ClinicDutyShowcaseSlotRow[];
  const rosterIds = [...new Set(slots.map((slot) => slot.assignee_roster_id))];

  const { data: rosterData, error: rosterError } = rosterIds.length > 0
    ? await supabase
        .from("student_roster")
        .select("id,full_name")
        .in("id", rosterIds)
    : { data: [], error: null };

  if (rosterError) throw new Error(`Unable to load showcase names: ${rosterError.message}`);

  return buildClinicDutyShowcase(
    term,
    dates,
    slots,
    (rosterData ?? []) as ClinicDutyShowcaseRosterRow[],
  );
}
