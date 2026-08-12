import { describe, expect, it } from "vitest";
import {
  getEasternDateKey,
  getSelectedDateForMonth,
  getSharedCalendarRecordingState,
} from "@/components/SharedCalendar";
import type { SharedCalendarEvent } from "@/lib/shared-calendar";

const scheduledEvent: SharedCalendarEvent = {
  id: "calendar-test",
  sourceId: "class-recording",
  title: "HWDP 232: Test class",
  date: "2026-08-12",
  startsAt: "2026-08-12T08:00:00-04:00",
  endsAt: "2026-08-12T09:00:00-04:00",
  allDay: false,
  status: "scheduled",
  participants: [],
  description: "Test",
  actions: [],
  courseCode: "HWDP 232",
  courseName: "Renal & Hematologic Systems",
  eventKind: "class",
  location: "Room 1",
  moduleName: "Module 1",
  recordingStatus: "scheduled",
  recordingStart: "08:00",
  recordingEnd: "09:00",
  canvasUrl: "https://canvas.case.edu/calendar?event_id=1",
  echoUrl: "https://canvas.case.edu/courses/53823/external_tools/23168",
  sourceProvenance: ["Canvas", "Echo360"],
  alternateSchedule: null,
};

describe("today-first shared calendar helpers", () => {
  it("uses Eastern Time on both sides of midnight", () => {
    expect(getEasternDateKey(new Date("2026-08-13T03:59:00Z"))).toBe("2026-08-12");
    expect(getEasternDateKey(new Date("2026-08-13T04:00:00Z"))).toBe("2026-08-13");
  });

  it("selects today in the current month and the first event otherwise", () => {
    expect(getSelectedDateForMonth("2026-08", "2026-08-12", [scheduledEvent])).toBe("2026-08-12");
    expect(getSelectedDateForMonth("2026-09", "2026-08-12", [{ ...scheduledEvent, date: "2026-09-09" }])).toBe("2026-09-09");
  });

  it("does not claim a past scheduled capture was recorded", () => {
    expect(getSharedCalendarRecordingState(scheduledEvent, "2026-08-12")).toEqual({ key: "scheduled", label: "Echo scheduled" });
    expect(getSharedCalendarRecordingState(scheduledEvent, "2026-08-13")).toEqual({ key: "pending", label: "Confirmation pending" });
    expect(getSharedCalendarRecordingState({ ...scheduledEvent, recordingStatus: "recorded" }, "2026-08-13")).toEqual({ key: "recorded", label: "Recorded" });
  });
});
