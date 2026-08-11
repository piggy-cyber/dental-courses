import { describe, expect, it } from "vitest";
import { buildFall2026OpenDates, generateFall2026AssignmentIndexes } from "@/lib/clinic-duty";

describe("Fall 2026 Sim Clinic Duty schedule", () => {
  it("contains exactly 104 open Monday-Saturday dates", () => {
    const dates = buildFall2026OpenDates();
    expect(dates).toHaveLength(104);
    expect(dates).not.toContain("2026-09-07");
    expect(dates).not.toContain("2026-11-26");
    expect(dates).not.toContain("2026-11-27");
    expect(dates).toContain("2026-10-19");
    expect(dates).toContain("2026-10-20");
    expect(dates.every((date) => new Date(`${date}T12:00:00Z`).getUTCDay() !== 0)).toBe(true);
  });

  it("creates 208 unique same-day slots with a 44/38 workload split", () => {
    const schedule = generateFall2026AssignmentIndexes();
    const counts = Array.from({ length: 82 }, () => 0);
    for (const assignment of schedule) {
      expect(new Set(assignment.studentIndexes).size).toBe(2);
      assignment.studentIndexes.forEach((index) => counts[index] += 1);
    }
    expect(counts.filter((count) => count === 3)).toHaveLength(44);
    expect(counts.filter((count) => count === 2)).toHaveLength(38);
    expect(counts.reduce((sum, count) => sum + count, 0)).toBe(208);
  });

  it("avoids repeated pairs and adjacent open-date assignments", () => {
    const schedule = generateFall2026AssignmentIndexes();
    const pairs = schedule.map(({ studentIndexes }) => [...studentIndexes].sort((a, b) => a - b).join(":"));
    expect(new Set(pairs).size).toBe(schedule.length);

    for (let index = 1; index < schedule.length; index += 1) {
      const previous = new Set(schedule[index - 1].studentIndexes);
      expect(schedule[index].studentIndexes.some((student) => previous.has(student))).toBe(false);
    }
  });
});
