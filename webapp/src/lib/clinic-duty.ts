import { createClient } from "@/lib/supabase/server";

export const CLINIC_DUTY_TIMEZONE = "America/New_York";
export const CLINIC_DUTY_BUCKET = "sim-clinic-duty";

export const CLINIC_DUTY_CHECKLIST = [
  { id: "shared_counters", label: "Shared counters", detail: "Wiped clean with no material or debris left to dry." },
  { id: "work_surfaces", label: "Work surfaces", detail: "Shared work surfaces are cleared and clean." },
  { id: "dispensing_areas", label: "Dispensing areas", detail: "Shared dispensing areas are orderly and free of residue." },
  { id: "sinks_faucets", label: "Sinks and faucets", detail: "Basins, fixtures, and nearby surfaces are clean." },
  { id: "floors", label: "Floors", detail: "Visible debris and dropped material have been removed." },
  { id: "aisles", label: "Aisles", detail: "Aisles are clear and safe to walk through." },
  { id: "trash_recycling", label: "Trash and recycling", detail: "Shared bins are handled according to clinic procedure." },
  { id: "shared_equipment", label: "Shared equipment", detail: "Shared equipment is clean, returned, and ready for the next group." },
  { id: "stools_chairs", label: "Stools and chairs", detail: "Shared seating is clean and returned to place." },
  { id: "clear_pathways", label: "Clear pathways", detail: "Doors, exits, and circulation paths are unobstructed." },
  { id: "supply_problems", label: "Supply check", detail: "Missing, low, or damaged shared supplies have been reported." },
  { id: "final_walkthrough", label: "Final walkthrough", detail: "Both Lab and Sim Clinic shared spaces received a final visual check." },
] as const;

export type ClinicDutyChecklistId = (typeof CLINIC_DUTY_CHECKLIST)[number]["id"];
export type ClinicDutyChecklist = Record<ClinicDutyChecklistId, boolean>;

export type ClinicDutyStatus =
  | "scheduled"
  | "due-today"
  | "released"
  | "trade-pending"
  | "completed"
  | "overdue"
  | "closed";
export type ClinicDutyExchangeStatus =
  | "open"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "expired";
export type ClinicDutySubmissionStatus = "completed" | "reopened";
export type ClinicDutyAuditStatus =
  | "term.schedule_seeded"
  | "term.published"
  | "date.closed"
  | "date.reopened"
  | "assignment.overridden"
  | "exchange.release_created"
  | "exchange.release_claimed"
  | "exchange.trade_created"
  | "exchange.trade_accepted"
  | "exchange.trade_rejected"
  | "exchange.cancelled"
  | "exchange.expired"
  | "photo.upload_prepared"
  | "photo.waived"
  | "photo.waiver_removed"
  | "submission.completed"
  | "submission.reopened";

export type ClinicDutySlot = {
  id: string;
  position: 1 | 2;
  originalRosterId?: string;
  assigneeRosterId: string;
  assigneeName: string;
  isMine: boolean;
  releaseOpen?: boolean;
};

export type ClinicDutyDate = {
  id: string;
  date: string;
  opensAt: string;
  closesAt: string;
  dateStatus: "open" | "closed";
  closureReason: string | null;
  completionStatus: ClinicDutyStatus;
  submittedByName: string | null;
  submittedAt: string | null;
  slots: ClinicDutySlot[];
};

export type ClinicDutyExchange = {
  id: string;
  kind: "release" | "trade";
  offeredSlotId: string;
  requestedSlotId: string | null;
  createdByRosterId: string;
  createdByName: string;
  counterpartyRosterId: string | null;
  counterpartyName: string | null;
  status: ClinicDutyExchangeStatus;
  deadlineAt: string;
  createdAt: string;
  offeredDate: string;
  requestedDate: string | null;
};

export type ClinicDutyPortal = {
  viewer: { profileId: string; rosterId: string | null; isManager: boolean };
  term: null | {
    id: string;
    slug: string;
    label: string;
    startsOn: string;
    endsOn: string;
    timezone: string;
    status: "draft" | "published" | "archived";
  };
  dates: ClinicDutyDate[];
  exchanges: ClinicDutyExchange[];
};

export type ClinicDutyDetail = {
  viewer: { profileId: string; rosterId: string | null; isManager: boolean };
  id: string;
  date: string;
  opensAt: string;
  closesAt: string;
  dateStatus: "open" | "closed";
  closureReason: string | null;
  termLabel: string;
  termStatus: "draft" | "published" | "archived";
  photoWaived: boolean;
  photoWaiverReason: string | null;
  slots: ClinicDutySlot[];
  submission: null | {
    id: string;
    status: ClinicDutySubmissionStatus;
    checklist: Partial<ClinicDutyChecklist>;
    unsafeIssueReported: boolean;
    unsafeIssueType: string | null;
    unsafeIssueNote: string | null;
    submittedByName: string | null;
    submittedAt: string;
    reopenedAt: string | null;
    reopenReason: string | null;
  };
  photos: Array<{
    id: string;
    status: "ready";
    mimeType: "image/jpeg" | "image/webp";
    byteSize: number;
    createdAt: string;
  }>;
};

export type ClinicDutyAdmin = {
  term: null | {
    id: string;
    slug: string;
    label: string;
    startsOn: string;
    endsOn: string;
    status: "draft" | "published" | "archived";
    publishedAt: string | null;
  };
  summary: {
    openDates: number;
    closedDates: number;
    slots: number;
    completedDates: number;
    overdueDates: number;
  };
  workload: Array<{
    rosterId: string;
    name: string;
    status: "expected" | "signed_in" | "withdrawn";
    dutyCount: number;
    futureDutyCount: number;
  }>;
  dates: Array<{
    id: string;
    date: string;
    opensAt: string;
    closesAt: string;
    status: "open" | "closed";
    closureReason: string | null;
    photoWaived: boolean;
    photoWaiverReason: string | null;
    submissionStatus: ClinicDutySubmissionStatus | null;
    unsafeIssueReported: boolean;
    slots: Array<ClinicDutySlot & { originalRosterId: string }>;
  }>;
  events: Array<{
    id: number;
    eventType: ClinicDutyAuditStatus | string;
    reason: string | null;
    metadata: Record<string, unknown>;
    actorName: string | null;
    dutyDate: string | null;
    createdAt: string;
  }>;
};

export async function getClinicDutyPortal(): Promise<ClinicDutyPortal> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_sim_clinic_duty_portal");
  if (error) throw new Error(error.message);
  return data as ClinicDutyPortal;
}

export async function getClinicDutyDetail(date: string): Promise<ClinicDutyDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_sim_clinic_duty_date", {
    p_duty_date: date,
  });
  if (error) throw new Error(error.message);
  return data as ClinicDutyDetail | null;
}

export async function getClinicDutyAdmin(): Promise<ClinicDutyAdmin> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_sim_clinic_duty_admin");
  if (error) throw new Error(error.message);
  return data as ClinicDutyAdmin;
}

export function formatClinicDutyDate(date: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    ...options,
  }).format(new Date(`${date}T12:00:00Z`));
}

export function formatClinicDutyTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CLINIC_DUTY_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function buildFall2026OpenDates(): string[] {
  const dates: string[] = [];
  const closed = new Set(["2026-09-07", "2026-11-26", "2026-11-27"]);
  for (let cursor = Date.UTC(2026, 7, 14); cursor <= Date.UTC(2026, 11, 16); cursor += 86_400_000) {
    const date = new Date(cursor);
    const day = date.getUTCDay();
    const iso = date.toISOString().slice(0, 10);
    if (day !== 0 && !closed.has(iso)) dates.push(iso);
  }
  return dates;
}

export function generateFall2026AssignmentIndexes() {
  return buildFall2026OpenDates().map((date, dateIndex) => ({
    date,
    studentIndexes: [
      dateIndex % 82,
      dateIndex < 82
        ? (dateIndex + 27) % 82
        : 22 + ((dateIndex - 82 + 1) % 22),
    ] as [number, number],
  }));
}
