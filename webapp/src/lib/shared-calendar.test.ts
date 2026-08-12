import { describe, expect, it } from "vitest";
import { buildFall2026ShowcaseSnapshot } from "@/lib/clinic-duty-showcase-shared";
import {
  buildSharedCalendar,
  buildSharedCalendarIcs,
  buildSharedCalendarMonth,
  FALL_2026_SEALANT_ROTATIONS,
  VERIFIED_FALL_2026_EXAMS,
} from "@/lib/shared-calendar";

describe("shared Fall 2026 D2 calendar", () => {
  const calendar = buildSharedCalendar(buildFall2026ShowcaseSnapshot());

  it("combines classes, verified exams, Sim Clinic, closures, and Sealant rotations", () => {
    expect(calendar.summary).toEqual({
      students: 82,
      classBlocks: 72,
      exams: 2,
      simClinicDates: 104,
      sealantRotations: 12,
      closures: 3,
    });
    expect(calendar.events).toHaveLength(193);
    expect(new Set(calendar.events.map((event) => event.id)).size).toBe(193);
    expect(calendar.events.filter((event) => event.sourceId === "class-recording")).toHaveLength(72);
    expect(calendar.events.filter((event) => event.sourceId === "exam")).toHaveLength(2);
    expect(calendar.events.filter((event) => event.sourceId === "sim-clinic")).toHaveLength(104);
    expect(calendar.events.filter((event) => event.sourceId === "sealant-duty")).toHaveLength(12);
    expect(calendar.events.filter((event) => event.sourceId === "academic-closure")).toHaveLength(3);
  });

  it("uses only the two exams explicitly listed in the verified Prosth schedule", () => {
    expect(VERIFIED_FALL_2026_EXAMS).toEqual([
      {
        courseId: "REHE-257",
        date: "2026-09-22",
        title: "Midterm Exam + Project #1 Due",
      },
      {
        courseId: "REHE-257",
        date: "2026-10-27",
        title: "Final Comprehensive Written Examination",
      },
    ]);
    expect(calendar.events.filter((event) => event.sourceId === "exam")).toMatchObject([
      {
        date: "2026-09-22",
        title: "REHE 257: Midterm Exam + Project #1 Due",
        startsAt: "2026-09-22T13:00:00-04:00",
        endsAt: "2026-09-22T16:45:00-04:00",
      },
      {
        date: "2026-10-27",
        title: "REHE 257: Final Comprehensive Written Examination",
        startsAt: "2026-10-27T13:00:00-04:00",
        endsAt: "2026-10-27T16:45:00-04:00",
      },
    ]);
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
    expect(august31?.events.map((event) => event.sourceId).sort()).toEqual(["sealant-duty", "sim-clinic"]);
  });

  it("exports every public event as a standards-shaped ICS file with 24-hour reminders", () => {
    const ics = buildSharedCalendarIcs(calendar, new Date("2026-08-11T16:00:00Z"));
    const lines = ics.split("\r\n");

    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(193);
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(190);
    expect(ics).toContain("SUMMARY:REHE 257: Midterm Exam + Project #1 Due");
    expect(ics).toContain("SUMMARY:REHE 257: Final Comprehensive Written Examination");
    expect(ics).toContain("CATEGORIES:Classes + recordings");
    expect(ics).toContain("CATEGORIES:Verified exams");
    expect(ics).toContain("SUMMARY:Sealant Duty + Clinic Shadowing");
    expect(ics).toContain("SUMMARY:Sim Clinic Duty");
    expect(ics).toContain("DTSTART;VALUE=DATE:20260907");
    expect(ics).toContain("DTEND;VALUE=DATE:20260908");
    expect(ics).toContain("X-WR-CALNAME:Fall 2026 D2 Calendar");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(lines.every((line) => new TextEncoder().encode(line).length <= 75)).toBe(true);
  });
});
