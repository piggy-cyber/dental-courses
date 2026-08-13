import { d2CanvasCalendar, type D2CanvasCalendarEvent } from "@/lib/d2-canvas-calendar";
import {
  courses,
  d2RecordingCalendar,
  type CourseId,
  type D2RecordingEvent,
} from "@/lib/d2-recording-calendar";

export type D2LabProjectDetailStatus = "detailed" | "topic-only" | "schedule-only";
export type D2LabProjectKind = "project-work" | "lab" | "competency";

export type D2LabProjectSession = {
  id: string;
  date: string;
  startsAt: string;
  endsAt: string | null;
  courseCode: string;
  courseName: string;
  section: "Group A" | "Group B" | "Whole class";
  title: string;
  kind: D2LabProjectKind;
  location: string | null;
  moduleName: string | null;
  lectureTopics: string[];
  projectTasks: string[];
  detailStatus: D2LabProjectDetailStatus;
  canvasUrl: string | null;
  sourceProvenance: string[];
};

export type D2LabProjectCourseGap = {
  courseCode: string;
  courseName: string;
  note: string;
};

export type D2LabProjectMonthDay = {
  date: string;
  day: number;
  sessions: D2LabProjectSession[];
};

const COURSE_ENTRIES = Object.entries(courses) as Array<[CourseId, (typeof courses)[CourseId]]>;
const COURSE_BY_CODE = new Map(COURSE_ENTRIES.map(([, course]) => [course.code, course]));

function cleanTitle(title: string) {
  return title.replace(/^[^:]+:\s*/, "");
}

function sectionForTitle(title: string): D2LabProjectSession["section"] {
  const match = title.match(/\bGroup ([AB])\b|\bCompetency ([AB])\b/i);
  if (!match) return "Whole class";
  return `Group ${(match[1] ?? match[2]).toUpperCase()}` as "Group A" | "Group B";
}

function canvasMatchForProsth(event: D2RecordingEvent) {
  return d2CanvasCalendar.events.find((canvasEvent) => (
    canvasEvent.courseCode === "REHE 257"
    && canvasEvent.date === event.date
    && canvasEvent.classStart === event.classStart
  )) ?? null;
}

function buildProsthSessions(): D2LabProjectSession[] {
  return d2RecordingCalendar.events
    .filter((event) => event.courseId === "REHE-257")
    .map((event) => {
      const canvasEvent = canvasMatchForProsth(event);
      return {
        id: `lab-${event.id}`,
        date: event.date,
        startsAt: canvasEvent?.classStart ?? event.classStart,
        endsAt: canvasEvent?.classEnd ?? event.classEnd,
        courseCode: courses[event.courseId].code,
        courseName: courses[event.courseId].name,
        section: sectionForTitle(event.title),
        title: event.title,
        kind: /competency/i.test(event.title) ? "competency" : "project-work",
        location: canvasEvent?.location ?? null,
        moduleName: event.moduleName,
        lectureTopics: [...event.lecture],
        projectTasks: [...event.lab],
        detailStatus: "detailed",
        canvasUrl: canvasEvent?.canvasUrl ?? event.canvasUrl,
        sourceProvenance: ["2026 REHE 257/267 schedule", d2CanvasCalendar.sourceLabel],
      } satisfies D2LabProjectSession;
    });
}

function isCanvasLabSession(event: D2CanvasCalendarEvent) {
  return event.courseCode !== "REHE 257"
    && (event.eventKind === "lab" || event.eventKind === "competency");
}

function buildCanvasLabSessions(): D2LabProjectSession[] {
  return d2CanvasCalendar.events
    .filter(isCanvasLabSession)
    .map((event) => {
      const course = COURSE_BY_CODE.get(event.courseCode);
      const title = cleanTitle(event.title);
      const scheduleOnly = /^Lab (Group|Competency) [AB]$/i.test(title);
      return {
        id: `lab-canvas-${event.uid.replace(/[^a-zA-Z0-9-]/g, "-")}`,
        date: event.date,
        startsAt: event.classStart ?? "00:00",
        endsAt: event.classEnd === "23:59" ? null : event.classEnd,
        courseCode: event.courseCode,
        courseName: course?.name ?? event.courseCode,
        section: sectionForTitle(event.title),
        title,
        kind: event.eventKind === "competency" ? "competency" : "lab",
        location: event.location,
        moduleName: null,
        lectureTopics: scheduleOnly ? [] : [title],
        projectTasks: [],
        detailStatus: scheduleOnly ? "schedule-only" : "topic-only",
        canvasUrl: event.canvasUrl,
        sourceProvenance: [d2CanvasCalendar.sourceLabel],
      } satisfies D2LabProjectSession;
    });
}

export const d2LabProjectSessions = [
  ...buildProsthSessions(),
  ...buildCanvasLabSessions(),
].sort((a, b) => (
  a.date.localeCompare(b.date)
  || a.startsAt.localeCompare(b.startsAt)
  || a.courseCode.localeCompare(b.courseCode)
));

const publishedLabCourseCodes = new Set(d2LabProjectSessions.map((session) => session.courseCode));

export const d2LabProjectCourseGaps: D2LabProjectCourseGap[] = COURSE_ENTRIES
  .map(([, course]) => course)
  .filter((course) => !publishedLabCourseCodes.has(course.code))
  .map((course) => ({
    courseCode: course.code,
    courseName: course.name,
    note: "No dated lab or project section was found in the saved Canvas calendar snapshot.",
  }));

export const d2LabProjectsSummary = {
  sessions: d2LabProjectSessions.length,
  courses: publishedLabCourseCodes.size,
  detailedSessions: d2LabProjectSessions.filter((session) => session.detailStatus === "detailed").length,
  publishedTopics: d2LabProjectSessions.filter((session) => session.detailStatus === "topic-only").length,
  scheduleOnlySessions: d2LabProjectSessions.filter((session) => session.detailStatus === "schedule-only").length,
  projectTasks: d2LabProjectSessions.reduce((total, session) => total + session.projectTasks.length, 0),
};

export function buildD2LabProjectMonth(sessions: D2LabProjectSession[], month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const leadingDays = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
  const sessionsByDate = new Map<string, D2LabProjectSession[]>();

  for (const session of sessions) {
    if (!session.date.startsWith(`${month}-`)) continue;
    const dateSessions = sessionsByDate.get(session.date) ?? [];
    dateSessions.push(session);
    sessionsByDate.set(session.date, dateSessions);
  }

  const days: Array<D2LabProjectMonthDay | null> = Array.from({ length: leadingDays }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    days.push({ date, day, sessions: sessionsByDate.get(date) ?? [] });
  }
  while (days.length % 7 !== 0) days.push(null);

  return Array.from({ length: days.length / 7 }, (_, index) => days.slice(index * 7, index * 7 + 7));
}

export function getD2LabProjectSelectedDate(month: string, today: string, sessions: D2LabProjectSession[]) {
  if (today.startsWith(`${month}-`)) return today;
  return sessions.find((session) => session.date.startsWith(`${month}-`))?.date ?? `${month}-01`;
}
