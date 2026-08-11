import type { ClinicDutyShowcase } from "@/lib/clinic-duty-showcase-shared";

export type SharedCalendarSourceTone = "teal" | "copper" | "slate";

export type SharedCalendarSource = {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  tone: SharedCalendarSourceTone;
};

export type SharedCalendarParticipant = {
  key: string;
  label: string;
  kind: "student" | "group";
};

export type SharedCalendarAction = {
  label: string;
  href: string;
  requiresLinkedD2: boolean;
  promptTitle: string;
  promptDescription: string;
};

export type SharedCalendarEvent = {
  id: string;
  sourceId: string;
  title: string;
  date: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  status: "scheduled" | "closed";
  participants: SharedCalendarParticipant[];
  description: string;
  action: SharedCalendarAction | null;
};

export type SharedCalendarData = {
  label: string;
  startsOn: string;
  endsOn: string;
  sources: SharedCalendarSource[];
  events: SharedCalendarEvent[];
  summary: {
    students: number;
    simClinicDates: number;
    sealantRotations: number;
    closures: number;
  };
};

export type SharedCalendarDay = {
  date: string;
  day: number;
  events: SharedCalendarEvent[];
};

export type SharedCalendarWeek = Array<SharedCalendarDay | null>;

export const SHARED_CALENDAR_SOURCES: SharedCalendarSource[] = [
  {
    id: "sim-clinic",
    label: "Sim Clinic Duty",
    shortLabel: "Sim Clinic",
    description: "Two assigned D2 students check the shared Lab and Sim Clinic spaces.",
    tone: "teal",
  },
  {
    id: "sealant-duty",
    label: "Sealant Duty + Clinic Shadowing",
    shortLabel: "Sealant",
    description: "The official Fall 2026 D2 group rotation shown on the class schedule.",
    tone: "copper",
  },
  {
    id: "academic-closure",
    label: "School closure",
    shortLabel: "Closed",
    description: "A date on which Sim Clinic Duty is closed.",
    tone: "slate",
  },
];

type SealantRotation = {
  date: string;
  sealantGroup: "A" | "B" | null;
  restorativeGroup: "A" | "B" | null;
};

export const FALL_2026_SEALANT_ROTATIONS: readonly SealantRotation[] = [
  { date: "2026-08-31", sealantGroup: "A", restorativeGroup: "B" },
  { date: "2026-09-14", sealantGroup: "A", restorativeGroup: "B" },
  { date: "2026-09-21", sealantGroup: "B", restorativeGroup: "A" },
  { date: "2026-09-28", sealantGroup: "A", restorativeGroup: "B" },
  { date: "2026-10-05", sealantGroup: "B", restorativeGroup: "A" },
  { date: "2026-10-12", sealantGroup: "A", restorativeGroup: "B" },
  { date: "2026-10-19", sealantGroup: "B", restorativeGroup: "A" },
  { date: "2026-10-26", sealantGroup: "A", restorativeGroup: "B" },
  { date: "2026-11-02", sealantGroup: "B", restorativeGroup: "A" },
  { date: "2026-11-09", sealantGroup: "A", restorativeGroup: "B" },
  { date: "2026-11-16", sealantGroup: "B", restorativeGroup: "A" },
  { date: "2026-11-30", sealantGroup: null, restorativeGroup: null },
] as const;

function easternUtcOffset(date: string) {
  return date >= "2026-11-01" ? "-05:00" : "-04:00";
}

function buildSealantEvents(): SharedCalendarEvent[] {
  return FALL_2026_SEALANT_ROTATIONS.map((rotation) => {
    const groupDescription = rotation.sealantGroup
      ? `Group ${rotation.sealantGroup} attends Sealant Duty and Clinic Shadowing; Group ${rotation.restorativeGroup} attends Restorative.`
      : "The source schedule lists this rotation without an individual group assignment.";
    return {
      id: `sealant-duty-${rotation.date}`,
      sourceId: "sealant-duty",
      title: "Sealant Duty + Clinic Shadowing",
      date: rotation.date,
      startsAt: `${rotation.date}T13:00:00${easternUtcOffset(rotation.date)}`,
      endsAt: `${rotation.date}T16:50:00${easternUtcOffset(rotation.date)}`,
      allDay: false,
      status: "scheduled",
      participants: rotation.sealantGroup
        ? [{ key: `sealant-group-${rotation.sealantGroup.toLowerCase()}`, label: `Group ${rotation.sealantGroup}`, kind: "group" as const }]
        : [],
      description: groupDescription,
      action: null,
    };
  });
}

export function buildSharedCalendar(showcase: ClinicDutyShowcase): SharedCalendarData {
  const clinicEvents: SharedCalendarEvent[] = showcase.dates.map((duty) => {
    if (duty.dateStatus === "closed") {
      return {
        id: `academic-closure-${duty.date}`,
        sourceId: "academic-closure",
        title: "School closed",
        date: duty.date,
        startsAt: duty.opensAt,
        endsAt: duty.closesAt,
        allDay: true,
        status: "closed",
        participants: [],
        description: duty.closureReason ?? "Sim Clinic Duty is closed.",
        action: null,
      };
    }

    return {
      id: `sim-clinic-${duty.date}`,
      sourceId: "sim-clinic",
      title: "Sim Clinic Duty",
      date: duty.date,
      startsAt: duty.opensAt,
      endsAt: duty.closesAt,
      allDay: false,
      status: "scheduled",
      participants: duty.slots.map((slot) => ({
        key: slot.studentKey,
        label: slot.name,
        kind: "student" as const,
      })),
      description: "The assigned pair checks shared Lab and Sim Clinic spaces; each student remains responsible for their own station.",
      action: {
        label: "Change duty",
        href: `/clinic-duty?view=mine&date=${duty.date}`,
        requiresLinkedD2: true,
        promptTitle: `Change responsibility for ${duty.date}`,
        promptDescription: "Sign in to release this date or offer a trade. Responsibility stays with the original student until a valid claim or accepted trade transfers it.",
      },
    };
  });

  const sealantEvents = buildSealantEvents();
  const events = [...clinicEvents, ...sealantEvents].sort((a, b) =>
    a.startsAt.localeCompare(b.startsAt) || a.sourceId.localeCompare(b.sourceId),
  );

  return {
    label: "Fall 2026 D2 Calendar",
    startsOn: showcase.term.startsOn,
    endsOn: showcase.term.endsOn,
    sources: SHARED_CALENDAR_SOURCES,
    events,
    summary: {
      students: showcase.summary.students,
      simClinicDates: showcase.summary.openDates,
      sealantRotations: sealantEvents.length,
      closures: showcase.summary.closedDates,
    },
  };
}

export function buildSharedCalendarMonth(
  events: SharedCalendarEvent[],
  month: string,
): SharedCalendarWeek[] {
  if (!/^\d{4}-\d{2}$/.test(month)) return [];

  const [year, zeroPaddedMonth] = month.split("-");
  const monthIndex = Number(zeroPaddedMonth) - 1;
  const firstWeekday = new Date(Date.UTC(Number(year), monthIndex, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(Number(year), monthIndex + 1, 0)).getUTCDate();
  const eventsByDate = new Map<string, SharedCalendarEvent[]>();

  for (const event of events.filter((item) => item.date.startsWith(`${month}-`))) {
    const dateEvents = eventsByDate.get(event.date) ?? [];
    dateEvents.push(event);
    eventsByDate.set(event.date, dateEvents);
  }

  const cells: Array<SharedCalendarDay | null> = Array.from(
    { length: firstWeekday },
    () => null,
  );
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    cells.push({ date, day, events: eventsByDate.get(date) ?? [] });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return Array.from({ length: cells.length / 7 }, (_, index) =>
    cells.slice(index * 7, index * 7 + 7),
  );
}

function formatIcsDateTime(iso: string) {
  return new Date(iso)
    .toISOString()
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replace(/\.\d{3}Z$/, "Z");
}

function nextIcsDate(date: string) {
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10).replaceAll("-", "");
}

function escapeIcs(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\r\n", "\n")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}

function foldIcsLine(line: string) {
  const encoder = new TextEncoder();
  const output: string[] = [];
  let current = "";

  for (const character of line) {
    if (encoder.encode(`${current}${character}`).length > 75) {
      output.push(current);
      current = ` ${character}`;
    } else {
      current += character;
    }
  }
  output.push(current);
  return output;
}

export function buildSharedCalendarIcs(
  calendar: SharedCalendarData,
  generatedAt: Date = new Date(),
) {
  const eventLines = calendar.events.flatMap((event) => {
    const source = calendar.sources.find((item) => item.id === event.sourceId);
    const people = event.participants.map((participant) => participant.label).join(", ");
    const description = people
      ? `${people}. ${event.description}`
      : event.description;
    const lines = [
      "BEGIN:VEVENT",
      `UID:${event.id}@fourthcanal.com`,
      `DTSTAMP:${formatIcsDateTime(generatedAt.toISOString())}`,
      event.allDay
        ? `DTSTART;VALUE=DATE:${event.date.replaceAll("-", "")}`
        : `DTSTART:${formatIcsDateTime(event.startsAt)}`,
      event.allDay
        ? `DTEND;VALUE=DATE:${nextIcsDate(event.date)}`
        : `DTEND:${formatIcsDateTime(event.endsAt)}`,
      `SUMMARY:${escapeIcs(event.title)}`,
      `DESCRIPTION:${escapeIcs(description)}`,
      `CATEGORIES:${escapeIcs(source?.label ?? "Fourth Canal")}`,
      "URL:https://fourthcanal.com/calendar",
    ];

    if (event.status === "scheduled") {
      lines.push(
        "BEGIN:VALARM",
        "TRIGGER:-PT24H",
        "ACTION:DISPLAY",
        `DESCRIPTION:${escapeIcs(`${event.title} is tomorrow`)}`,
        "END:VALARM",
      );
    }
    lines.push("END:VEVENT");
    return lines;
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Fourth Canal//Shared Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(calendar.label)}`,
    "X-WR-TIMEZONE:America/New_York",
    ...eventLines,
    "END:VCALENDAR",
    "",
  ]
    .flatMap(foldIcsLine)
    .join("\r\n");
}
