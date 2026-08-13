import { describe, expect, it } from "vitest";
import { buildFall2026ShowcaseSnapshot } from "@/lib/clinic-duty-showcase-shared";
import { d2RecordingCalendar } from "@/lib/d2-recording-calendar";
import {
  buildSharedCalendar,
  buildSharedCalendarIcs,
  buildSharedCalendarMonth,
  CANVAS_FALL_2026_EXAMS,
  FALL_2026_SEALANT_ROTATIONS,
} from "@/lib/shared-calendar";

describe("shared Fall 2026 D2 calendar", () => {
  const calendar = buildSharedCalendar(buildFall2026ShowcaseSnapshot());
  const courseEvents = calendar.events.filter((event) => event.courseCode);

  it("merges all Canvas, Echo360, duty, rotation, and closure events", () => {
    expect(calendar.summary).toEqual({
      students: 82,
      courseEvents: 144,
      exams: 6,
      simClinicDates: 104,
      sealantRotations: 12,
      closures: 3,
    });
    expect(calendar.events).toHaveLength(263);
    expect(new Set(calendar.events.map((event) => event.id)).size).toBe(263);
    expect(calendar.events.filter((event) => event.sourceId === "class-recording")).toHaveLength(138);
    expect(calendar.events.filter((event) => event.sourceId === "exam")).toHaveLength(6);
    expect(calendar.events.filter((event) => event.sourceId === "sim-clinic")).toHaveLength(104);
    expect(calendar.events.filter((event) => event.sourceId === "sealant-duty")).toHaveLength(12);
    expect(calendar.events.filter((event) => event.sourceId === "academic-closure")).toHaveLength(3);
  });

  it("preserves every existing Echo event ID while adding only the missing Canvas events", () => {
    const ids = new Set(calendar.events.map((event) => event.id));

    expect(d2RecordingCalendar.events.every((event) => ids.has(`class-${event.id}`))).toBe(true);
    expect(courseEvents.filter((event) => event.id.startsWith("canvas-"))).toHaveLength(44);
    expect(courseEvents.filter((event) => event.recordingStatus === "recorded")).toHaveLength(2);
    expect(courseEvents.filter((event) => event.recordingStatus === "scheduled")).toHaveLength(68);
    expect(courseEvents.filter((event) => event.recordingStatus === "not-scheduled")).toHaveLength(4);
    expect(courseEvents.filter((event) => event.recordingStatus === "not-found")).toHaveLength(70);
    expect(calendar.events.filter((event) => event.date === "2026-08-14" && event.courseCode === "REHE 259")).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: "REHE 259: BP Fixed: Intro, Occlusal Adjustments", eventKind: "class", recordingStatus: "scheduled" }),
      expect.objectContaining({ title: "REHE 259: Project 1 - Group A", eventKind: "lab", startsAt: "2026-08-14T09:00:00-04:00" }),
      expect.objectContaining({ title: "REHE 259: Project 1 - Group B", eventKind: "lab", startsAt: "2026-08-14T13:00:00-04:00" }),
    ]));
  });

  it("uses all six Canvas exam blocks and lets Canvas control the displayed time", () => {
    expect(CANVAS_FALL_2026_EXAMS.map((exam) => [exam.courseCode, exam.date, exam.title])).toEqual([
      ["HWDP 232", "2026-09-09", "R&B: Final Exam"],
      ["REMA 261", "2026-09-17", "Ortho: Final Exam"],
      ["REHE 257", "2026-09-22", "ProsthoTech: Midterm, Finish Project"],
      ["HWDP 245", "2026-09-28", "MS: Final Exam"],
      ["REHE 257", "2026-10-27", "ProsthoTech: Final Exam"],
      ["REHE 262", "2026-11-05", "BP Resto: Final Exam"],
    ]);

    expect(calendar.events.find((event) => event.title === "REHE 257: ProsthoTech: Final Exam")).toMatchObject({
      startsAt: "2026-10-27T17:00:00.000Z",
      endsAt: "2026-10-27T19:00:00.000Z",
      moduleName: "Session 25",
      recordingStatus: "not-scheduled",
      alternateSchedule: "1:00 PM-4:45 PM in the course/Echo source",
    });
  });

  it("preserves the official Sealant group sequence without inventing a group on November 30", () => {
    expect(FALL_2026_SEALANT_ROTATIONS.map((rotation) => [rotation.date, rotation.sealantGroup])).toEqual([
      ["2026-08-31", "A"],
      ["2026-09-14", "A"],
      ["2026-09-21", "B"],
      ["2026-09-28", "A"],
      ["2026-10-05", "B"],
      ["2026-10-12", "A"],
      ["2026-10-19", "B"],
      ["2026-10-26", "A"],
      ["2026-11-02", "B"],
      ["2026-11-09", "A"],
      ["2026-11-16", "B"],
      ["2026-11-30", null],
    ]);
    expect(calendar.events.find((event) => event.id === "sealant-duty-2026-11-30")).toMatchObject({
      participants: [],
      description: "The source schedule lists this rotation without an individual group assignment.",
    });
  });

  it("places multiple event sources on the same reusable calendar day", () => {
    const august = buildSharedCalendarMonth(calendar.events, "2026-08");
    const august31 = august.flat().find((day) => day?.date === "2026-08-31");

    expect(august).toHaveLength(6);
    expect(august.every((week) => week.length === 7)).toBe(true);
    expect(august31?.events.map((event) => event.sourceId)).toEqual(expect.arrayContaining([
      "class-recording",
      "sealant-duty",
      "sim-clinic",
    ]));
  });

  it("exports all 263 stable events with recording categories and reminders", () => {
    const ics = buildSharedCalendarIcs(calendar, new Date("2026-08-12T16:00:00Z"));
    const lines = ics.split("\r\n");
    const unfolded = ics.replace(/\r\n[ \t]/g, "");
    const uids = [...ics.matchAll(/^UID:(.+)$/gm)].map((match) => match[1]);

    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(263);
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(260);
    expect(new Set(uids).size).toBe(263);
    expect(unfolded).toContain("SUMMARY:REHE 257: ProsthoTech: Midterm\\, Finish Project");
    expect(unfolded).toContain("SUMMARY:REHE 262: BP Resto: Final Exam");
    expect(unfolded).toContain("SUMMARY:REHE 259: Project 1 - Group A");
    expect(unfolded).toContain("CATEGORIES:D2 course events,HWDP 232,class,Recorded");
    expect(unfolded).toContain("No Echo schedule found");
    expect(ics).toContain("SUMMARY:Sealant Duty + Clinic Shadowing");
    expect(ics).toContain("SUMMARY:Sim Clinic Duty");
    expect(ics).toContain("DTSTART;VALUE=DATE:20260907");
    expect(ics).toContain("X-WR-CALNAME:Fall 2026 D2 Calendar");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(lines.every((line) => new TextEncoder().encode(line).length <= 75)).toBe(true);
  });
});
