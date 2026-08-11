import { describe, expect, it } from "vitest";
import {
  buildClinicDutyShowcase,
  buildFall2026ShowcaseSnapshot,
} from "@/lib/clinic-duty-showcase-shared";

const term = {
  id: "term-1",
  slug: "fall-2026",
  label: "Fall 2026",
  starts_on: "2026-08-14",
  ends_on: "2026-12-16",
  timezone: "America/New_York",
};

describe("buildClinicDutyShowcase", () => {
  it("sorts dates and preserves exactly two roster-backed assignees on open dates", () => {
    const showcase = buildClinicDutyShowcase(
      term,
      [
        { id: "date-2", duty_date: "2026-08-15", opens_at: "2026-08-15T11:00:00Z", closes_at: "2026-08-15T23:00:00Z", status: "open", closure_reason: null },
        { id: "date-1", duty_date: "2026-08-14", opens_at: "2026-08-14T11:00:00Z", closes_at: "2026-08-15T03:00:00Z", status: "open", closure_reason: null },
      ],
      [
        { id: "slot-2", duty_date_id: "date-1", position: 2, assignee_roster_id: "student-2" },
        { id: "slot-1", duty_date_id: "date-1", position: 1, assignee_roster_id: "student-1" },
        { id: "slot-3", duty_date_id: "date-2", position: 1, assignee_roster_id: "student-3" },
        { id: "slot-4", duty_date_id: "date-2", position: 2, assignee_roster_id: "student-4" },
      ],
      [
        { id: "student-1", full_name: "Rick Ahn" },
        { id: "student-2", full_name: "Lina Alsmoudi" },
        { id: "student-3", full_name: "Gokul Anirudhan" },
        { id: "student-4", full_name: "Elissa Aziz" },
      ],
    );

    expect(showcase.dates.map((date) => date.date)).toEqual(["2026-08-14", "2026-08-15"]);
    expect(showcase.dates[0].slots.map((slot) => slot.name)).toEqual(["Rick Ahn", "Lina Alsmoudi"]);
    expect(showcase.summary).toMatchObject({ students: 4, openDates: 2, closedDates: 0, dutySlots: 4 });
  });

  it("keeps closures visible without assigning students", () => {
    const showcase = buildClinicDutyShowcase(
      term,
      [{ id: "closed-1", duty_date: "2026-09-07", opens_at: "2026-09-07T11:00:00Z", closes_at: "2026-09-08T03:00:00Z", status: "closed", closure_reason: "University holiday" }],
      [],
      [],
    );

    expect(showcase.summary).toMatchObject({ students: 0, openDates: 0, closedDates: 1, dutySlots: 0 });
    expect(showcase.dates[0]).toMatchObject({ dateStatus: "closed", slots: [], closureReason: "University holiday" });
  });

  it("rejects an incomplete open-date pair", () => {
    expect(() => buildClinicDutyShowcase(
      term,
      [{ id: "date-1", duty_date: "2026-08-14", opens_at: "2026-08-14T11:00:00Z", closes_at: "2026-08-15T03:00:00Z", status: "open", closure_reason: null }],
      [{ id: "slot-1", duty_date_id: "date-1", position: 1, assignee_roster_id: "student-1" }],
      [{ id: "student-1", full_name: "Rick Ahn" }],
    )).toThrow("exactly two assignees");
  });

  it("builds the balanced 82-student Fall 2026 showcase snapshot", () => {
    const showcase = buildFall2026ShowcaseSnapshot();
    const workload = new Map<string, number>();
    showcase.dates.forEach((date) => date.slots.forEach((slot) => {
      workload.set(slot.studentKey, (workload.get(slot.studentKey) ?? 0) + 1);
    }));

    expect(showcase.summary).toEqual({
      students: 82,
      openDates: 104,
      closedDates: 3,
      dutySlots: 208,
      minimumDuties: 2,
      maximumDuties: 3,
    });
    expect([...workload.values()].filter((count) => count === 3)).toHaveLength(44);
    expect([...workload.values()].filter((count) => count === 2)).toHaveLength(38);
    expect(showcase.dates.find((date) => date.date === "2026-09-07")).toMatchObject({
      dateStatus: "closed",
      slots: [],
    });
  });
});
