import { describe, expect, it } from "vitest";
import { d2RecordingCalendar } from "@/lib/d2-recording-calendar";

describe("D2 recording calendar data", () => {
  it("keeps the verified course and event counts", () => {
    const prosth = d2RecordingCalendar.events.filter((event) => event.courseId === "REHE-257");

    expect(Object.keys(d2RecordingCalendar.courses)).toHaveLength(7);
    expect(d2RecordingCalendar.events).toHaveLength(74);
    expect(new Set(d2RecordingCalendar.events.map((event) => event.id)).size).toBe(74);
    expect(prosth).toHaveLength(24);
    expect(prosth.filter((event) => event.echoUrl)).toHaveLength(20);
    expect(prosth.filter((event) => !event.echoUrl)).toHaveLength(4);
    expect(d2RecordingCalendar.unpublishedCourses).toHaveLength(5);
  });

  it("does not expose a private local file path", () => {
    expect(JSON.stringify(d2RecordingCalendar)).not.toContain("/Users/");
  });
});
