import { describe, expect, it } from "vitest";
import {
  buildD2LabProjectMonth,
  d2LabProjectCourseGaps,
  d2LabProjectSessions,
  d2LabProjectsSummary,
  getD2LabProjectSelectedDate,
} from "@/lib/d2-lab-projects";

describe("D2 lab projects", () => {
  it("keeps every published lab section in chronological order", () => {
    expect(d2LabProjectSessions).toHaveLength(80);
    expect(new Set(d2LabProjectSessions.map((session) => session.id)).size).toBe(80);
    expect(d2LabProjectSessions.map((session) => `${session.date}|${session.startsAt}`)).toEqual(
      [...d2LabProjectSessions]
        .sort((a, b) => a.date.localeCompare(b.date) || a.startsAt.localeCompare(b.startsAt))
        .map((session) => `${session.date}|${session.startsAt}`),
    );

    expect(d2LabProjectSessions.filter((session) => session.courseCode === "REHE 257")).toHaveLength(24);
    expect(d2LabProjectSessions.filter((session) => session.courseCode === "REHE 262")).toHaveLength(26);
    expect(d2LabProjectSessions.filter((session) => session.courseCode === "REHE 259")).toHaveLength(26);
    expect(d2LabProjectSessions.filter((session) => session.courseCode === "HWDP 245")).toHaveLength(4);
  });

  it("separates detailed projects from source gaps without inventing topics", () => {
    expect(d2LabProjectsSummary).toMatchObject({
      sessions: 80,
      courses: 4,
      detailedSessions: 24,
      publishedTopics: 4,
      scheduleOnlySessions: 52,
    });
    expect(d2LabProjectsSummary.projectTasks).toBeGreaterThan(40);
    expect(d2LabProjectSessions.some((session) => session.projectTasks.some((task) => task.includes("Project #1")))).toBe(true);
    expect(d2LabProjectSessions.some((session) => session.projectTasks.some((task) => task.includes("Project #2")))).toBe(true);
    expect(d2LabProjectCourseGaps.map((course) => course.courseCode)).toEqual([
      "HWDP 232",
      "REHE 264",
      "REMA 261",
    ]);
    expect(d2LabProjectSessions.find((session) => session.date === "2026-09-14")?.endsAt).toBeNull();
    expect(d2LabProjectSessions.filter((session) => session.date === "2026-08-14")).toEqual([
      expect.objectContaining({ courseCode: "REHE 259", section: "Group A", startsAt: "09:00", endsAt: "11:50", title: "Project 1", canvasUrl: expect.stringContaining("calendar_event_361603") }),
      expect.objectContaining({ courseCode: "REHE 259", section: "Group B", startsAt: "13:00", endsAt: "15:50", title: "Project 1", canvasUrl: expect.stringContaining("calendar_event_361603") }),
    ]);
  });

  it("does not expose a private local source path", () => {
    expect(JSON.stringify({ d2LabProjectSessions, d2LabProjectCourseGaps })).not.toContain("/Users/");
  });

  it("builds a bounded month calendar and selects today first", () => {
    const august = buildD2LabProjectMonth(d2LabProjectSessions, "2026-08");
    expect(august).toHaveLength(6);
    expect(august.flat()).toHaveLength(42);
    expect(august.flat().filter(Boolean)).toHaveLength(31);
    expect(august.flat().find((day) => day?.date === "2026-08-18")?.sessions).toHaveLength(2);
    expect(august.flat().find((day) => day?.date === "2026-08-14")?.sessions).toHaveLength(2);
    expect(getD2LabProjectSelectedDate("2026-08", "2026-08-13", d2LabProjectSessions)).toBe("2026-08-13");
    expect(getD2LabProjectSelectedDate("2026-09", "2026-08-13", d2LabProjectSessions)).toBe("2026-09-01");
  });
});
