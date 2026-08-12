import type { ClinicDutyShowcase } from "@/lib/clinic-duty-showcase-shared";
import {
  courses,
  d2RecordingCalendar,
  type CourseId,
  type D2RecordingEvent,
  type RecordingStatus,
} from "@/lib/d2-recording-calendar";
import {
  d2CanvasCalendar,
  type CanvasEventKind,
  type D2CanvasCalendarEvent,
} from "@/lib/d2-canvas-calendar";

export type SharedCalendarSourceTone = "blue" | "gold" | "teal" | "copper" | "slate";
export type SharedCalendarEventKind = CanvasEventKind | "sim-clinic" | "sealant" | "closure";
export type SharedCalendarRecordingStatus = RecordingStatus | "not-found" | null;

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
  external?: boolean;
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
  actions: SharedCalendarAction[];
  courseCode: string | null;
  courseName: string | null;
  eventKind: SharedCalendarEventKind;
  location: string | null;
  moduleName: string | null;
  recordingStatus: SharedCalendarRecordingStatus;
  recordingStart: string | null;
  recordingEnd: string | null;
  canvasUrl: string | null;
  echoUrl: string | null;
  sourceProvenance: string[];
  alternateSchedule: string | null;
};

export type SharedCalendarData = {
  label: string;
  startsOn: string;
  endsOn: string;
  canvasSnapshotDownloadedAt: string;
  sources: SharedCalendarSource[];
  events: SharedCalendarEvent[];
  summary: {
    students: number;
    courseEvents: number;
    exams: number;
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
    id: "class-recording",
    label: "D2 course events",
    shortLabel: "Course",
    description: "Canvas lectures, labs, competencies, and Zoom sessions with Echo360 status.",
    tone: "blue",
  },
  {
    id: "exam",
    label: "Canvas exams",
    shortLabel: "Exam",
    description: "Final and midterm exam blocks published in the D2 Canvas calendar.",
    tone: "gold",
  },
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

export const CANVAS_FALL_2026_EXAMS = d2CanvasCalendar.events
  .filter((event) => event.eventKind === "exam")
  .map((event) => ({
    uid: event.uid,
    courseCode: event.courseCode,
    date: event.date,
    title: event.title,
  }));

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

const COURSE_ENTRIES = Object.entries(courses) as Array<[CourseId, (typeof courses)[CourseId]]>;
const COURSE_BY_CODE = new Map(COURSE_ENTRIES.map(([id, course]) => [course.code, { id, course }]));

function easternUtcOffset(date: string) {
  return date >= "2026-11-01" ? "-05:00" : "-04:00";
}

function localClassIso(date: string, time: string) {
  return `${date}T${time}:00${easternUtcOffset(date)}`;
}

function formatClockTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const hour = hours % 12 || 12;
  return `${hour}:${String(minutes).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
}

function recordingStatusDescription(status: SharedCalendarRecordingStatus, event?: D2RecordingEvent) {
  if (status === "recorded") return "Recorded in Echo360.";
  if (status === "scheduled" && event?.recordingStart && event.recordingEnd) {
    return `Echo360 recording scheduled for ${formatClockTime(event.recordingStart)}-${formatClockTime(event.recordingEnd)}.`;
  }
  if (status === "not-recorded") return "Echo360 marks this class as not recorded.";
  if (status === "not-scheduled") return "Echo360 explicitly lists no recording for this class.";
  if (status === "not-found") return "No matching Echo360 schedule was found.";
  return "Recording status still needs to be checked.";
}

function eventKindForEcho(event: D2RecordingEvent): CanvasEventKind {
  if (/\b(final exam|midterm)\b/i.test(event.title)) return "exam";
  if (/\bcompetency\b/i.test(event.title)) return "competency";
  if (/\b(lab|hololens)\b/i.test(event.title)) return "lab";
  if (/\[zoom\]/i.test(event.title)) return "zoom";
  return "class";
}

function classActions(canvasEvent: D2CanvasCalendarEvent | null, echoEvent: D2RecordingEvent | null) {
  const courseEntry = echoEvent
    ? { id: echoEvent.courseId, course: courses[echoEvent.courseId] }
    : canvasEvent ? COURSE_BY_CODE.get(canvasEvent.courseCode) : undefined;
  const courseCode = courseEntry?.course.code ?? canvasEvent?.courseCode ?? "D2";
  const actions: SharedCalendarAction[] = [];
  const promptDescription = "Sign in with a linked D2 account to open protected Canvas and Echo360 class links.";

  if (echoEvent) {
    actions.push({
      label: "Open class workspace",
      href: `/recordings?event=${encodeURIComponent(echoEvent.id)}`,
      requiresLinkedD2: true,
      promptTitle: `Open ${courseCode} class details`,
      promptDescription,
    });
  }
  const canvasUrl = canvasEvent?.canvasUrl ?? echoEvent?.canvasUrl ?? courseEntry?.course.canvasUrl;
  if (canvasUrl) {
    actions.push({
      label: canvasEvent?.canvasUrl ? "Open Canvas event" : "Open Canvas course",
      href: canvasUrl,
      requiresLinkedD2: true,
      promptTitle: `Open ${courseCode} in Canvas`,
      promptDescription,
      external: true,
    });
  }
  if (echoEvent?.echoUrl) {
    actions.push({
      label: "Open Echo360",
      href: echoEvent.echoUrl,
      requiresLinkedD2: true,
      promptTitle: `Open ${courseCode} in Echo360`,
      promptDescription,
      external: true,
    });
  }
  return actions;
}

function alternateScheduleFor(canvasEvent: D2CanvasCalendarEvent, echoEvent: D2RecordingEvent | null) {
  if (!echoEvent || !canvasEvent.classStart || !canvasEvent.classEnd) return null;
  if (canvasEvent.classStart === echoEvent.classStart && canvasEvent.classEnd === echoEvent.classEnd) return null;
  return `${formatClockTime(echoEvent.classStart)}-${formatClockTime(echoEvent.classEnd)} in the course/Echo source`;
}

function buildCourseEvents() {
  const echoByKey = new Map<string, D2RecordingEvent>(
    d2RecordingCalendar.events.map((event) => {
      const courseCode = courses[event.courseId].code;
      return [`${courseCode}|${event.date}|${event.classStart}`, event] as const;
    }),
  );
  const matchedEchoIds = new Set<string>();

  const canvasEvents = d2CanvasCalendar.events.map((canvasEvent): SharedCalendarEvent => {
    const courseEntry = COURSE_BY_CODE.get(canvasEvent.courseCode);
    const matchKey = `${canvasEvent.courseCode}|${canvasEvent.date}|${canvasEvent.classStart ?? "all-day"}`;
    const echoEvent = echoByKey.get(matchKey) ?? null;
    if (echoEvent) matchedEchoIds.add(echoEvent.id);

    const recordingStatus: SharedCalendarRecordingStatus = echoEvent?.recordingStatus ?? "not-found";
    const recording = recordingStatusDescription(recordingStatus, echoEvent ?? undefined);
    const moduleName = echoEvent?.moduleName ?? null;
    const sourceProvenance = [d2CanvasCalendar.sourceLabel];
    if (echoEvent) sourceProvenance.push(echoEvent.source);

    return {
      id: echoEvent ? `class-${echoEvent.id}` : `canvas-${canvasEvent.uid.replace(/[^a-zA-Z0-9-]/g, "-")}`,
      sourceId: canvasEvent.eventKind === "exam" ? "exam" : "class-recording",
      title: `${canvasEvent.courseCode}: ${canvasEvent.title}`,
      date: canvasEvent.date,
      startsAt: canvasEvent.startsAt,
      endsAt: canvasEvent.endsAt,
      allDay: canvasEvent.allDay,
      status: "scheduled",
      participants: [],
      description: `${moduleName ? `Module: ${moduleName}. ` : "Module not mapped yet. "}${recording}`,
      actions: classActions(canvasEvent, echoEvent),
      courseCode: canvasEvent.courseCode,
      courseName: courseEntry?.course.name ?? canvasEvent.courseCode,
      eventKind: canvasEvent.eventKind,
      location: canvasEvent.location,
      moduleName,
      recordingStatus,
      recordingStart: echoEvent?.recordingStart ?? null,
      recordingEnd: echoEvent?.recordingEnd ?? null,
      canvasUrl: canvasEvent.canvasUrl,
      echoUrl: echoEvent?.echoUrl ?? null,
      sourceProvenance,
      alternateSchedule: alternateScheduleFor(canvasEvent, echoEvent),
    };
  });

  const echoOnlyEvents = d2RecordingCalendar.events
    .filter((event) => !matchedEchoIds.has(event.id))
    .map((event): SharedCalendarEvent => {
      const course = courses[event.courseId];
      const eventKind = eventKindForEcho(event);
      return {
        id: `class-${event.id}`,
        sourceId: eventKind === "exam" ? "exam" : "class-recording",
        title: `${course.code}: ${event.title}`,
        date: event.date,
        startsAt: localClassIso(event.date, event.classStart),
        endsAt: localClassIso(event.date, event.classEnd),
        allDay: false,
        status: "scheduled",
        participants: [],
        description: `Module: ${event.moduleName}. ${recordingStatusDescription(event.recordingStatus, event)} Canvas calendar event not found in the static snapshot.`,
        actions: classActions(null, event),
        courseCode: course.code,
        courseName: course.name,
        eventKind,
        location: null,
        moduleName: event.moduleName,
        recordingStatus: event.recordingStatus,
        recordingStart: event.recordingStart,
        recordingEnd: event.recordingEnd,
        canvasUrl: event.canvasUrl,
        echoUrl: event.echoUrl,
        sourceProvenance: [event.source],
        alternateSchedule: null,
      };
    });

  return [...canvasEvents, ...echoOnlyEvents];
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
      startsAt: localClassIso(rotation.date, "13:00"),
      endsAt: localClassIso(rotation.date, "16:50"),
      allDay: false,
      status: "scheduled",
      participants: rotation.sealantGroup
        ? [{ key: `sealant-group-${rotation.sealantGroup.toLowerCase()}`, label: `Group ${rotation.sealantGroup}`, kind: "group" as const }]
        : [],
      description: groupDescription,
      actions: [],
      courseCode: null,
      courseName: null,
      eventKind: "sealant",
      location: null,
      moduleName: null,
      recordingStatus: null,
      recordingStart: null,
      recordingEnd: null,
      canvasUrl: null,
      echoUrl: null,
      sourceProvenance: ["Fall 2026 D2 schedule updated August 7, 2026"],
      alternateSchedule: null,
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
        actions: [],
        courseCode: null,
        courseName: null,
        eventKind: "closure",
        location: null,
        moduleName: null,
        recordingStatus: null,
        recordingStart: null,
        recordingEnd: null,
        canvasUrl: null,
        echoUrl: null,
        sourceProvenance: ["Fourth Canal Sim Clinic Duty schedule"],
        alternateSchedule: null,
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
      actions: [{
        label: "Change duty",
        href: `/clinic-duty?view=mine&date=${duty.date}`,
        requiresLinkedD2: true,
        promptTitle: `Change responsibility for ${duty.date}`,
        promptDescription: "Sign in to release this date or offer a trade. Responsibility stays with the original student until a valid claim or accepted trade transfers it.",
      }],
      courseCode: null,
      courseName: null,
      eventKind: "sim-clinic",
      location: "Sim Clinic",
      moduleName: null,
      recordingStatus: null,
      recordingStart: null,
      recordingEnd: null,
      canvasUrl: null,
      echoUrl: null,
      sourceProvenance: ["Fourth Canal Sim Clinic Duty schedule"],
      alternateSchedule: null,
    };
  });

  const sealantEvents = buildSealantEvents();
  const courseEvents = buildCourseEvents();
  const examEvents = courseEvents.filter((event) => event.eventKind === "exam");
  const events = [...courseEvents, ...clinicEvents, ...sealantEvents].sort((a, b) =>
    a.startsAt.localeCompare(b.startsAt) || a.sourceId.localeCompare(b.sourceId),
  );

  return {
    label: "Fall 2026 D2 Calendar",
    startsOn: showcase.term.startsOn,
    endsOn: showcase.term.endsOn,
    canvasSnapshotDownloadedAt: d2CanvasCalendar.downloadedAt,
    sources: SHARED_CALENDAR_SOURCES,
    events,
    summary: {
      students: showcase.summary.students,
      courseEvents: courseEvents.length,
      exams: examEvents.length,
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

function recordingCategory(status: SharedCalendarRecordingStatus) {
  if (!status) return null;
  if (status === "not-found") return "No Echo schedule found";
  if (status === "not-scheduled") return "Not scheduled for recording";
  if (status === "not-recorded") return "Not recorded";
  if (status === "recorded") return "Recorded";
  if (status === "scheduled") return "Echo scheduled";
  return "Recording status unknown";
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
    const categories = [
      source?.label ?? "Fourth Canal",
      event.courseCode,
      event.eventKind,
      recordingCategory(event.recordingStatus),
    ].filter((value): value is string => Boolean(value));
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
      `CATEGORIES:${categories.map(escapeIcs).join(",")}`,
      "URL:https://fourthcanal.com/calendar",
    ];

    if (event.location) lines.push(`LOCATION:${escapeIcs(event.location)}`);
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
