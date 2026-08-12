import { describe, expect, it } from "vitest";
import { d2CanvasCalendar } from "@/lib/d2-canvas-calendar";
import { parseD2CanvasCalendarIcs } from "../../scripts/import-d2-canvas-calendar.mjs";

describe("D2 Canvas calendar snapshot", () => {
  it("keeps every D2-tagged Canvas event and excludes the cohort-only event", () => {
    expect(d2CanvasCalendar.eventCount).toBe(103);
    expect(d2CanvasCalendar.events).toHaveLength(103);
    expect(new Set(d2CanvasCalendar.events.map((event) => event.uid)).size).toBe(103);
    expect(d2CanvasCalendar.events.filter((event) => event.eventKind === "exam")).toHaveLength(6);
    expect(d2CanvasCalendar.events.some((event) => event.title.includes("Welcome Back"))).toBe(false);
  });

  it("stores only normalized calendar fields and no private feed metadata", () => {
    const serialized = JSON.stringify(d2CanvasCalendar);

    expect(serialized).not.toContain("Rick Ahn Calendar");
    expect(serialized).not.toContain("X-WR-CAL");
    expect(serialized).not.toContain("zoom.us");
    expect(serialized).not.toContain("DESCRIPTION");
    expect(serialized).not.toContain("CcxzZU4");
  });

  it("unfolds Canvas lines, filters course tags, and converts UTC to Eastern time", () => {
    const parsed = parseD2CanvasCalendarIcs([
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:event-1",
      "DTSTART:20261105T130000Z",
      "DTEND:20261105T143000Z",
      "SUMMARY:BP Resto: Final Exam [REHE",
      "  262]",
      "LOCATION:SMSN 251",
      "DESCRIPTION:https://example.zoom.us/private",
      "URL;VALUE=URI:https://canvas.case.edu/calendar#event-1",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "UID:event-2",
      "DTSTART:20260812T170000Z",
      "DTEND:20260812T180000Z",
      "SUMMARY:Class of 2029 Welcome [Class of 2029]",
      "END:VEVENT",
      "END:VCALENDAR",
      "",
    ].join("\r\n"));

    expect(parsed).toEqual([
      {
        uid: "event-1",
        courseCode: "REHE 262",
        title: "BP Resto: Final Exam",
        eventKind: "exam",
        date: "2026-11-05",
        classStart: "08:00",
        classEnd: "09:30",
        startsAt: "2026-11-05T13:00:00.000Z",
        endsAt: "2026-11-05T14:30:00.000Z",
        allDay: false,
        location: "SMSN 251",
        canvasUrl: "https://canvas.case.edu/calendar#event-1",
      },
    ]);
  });
});
