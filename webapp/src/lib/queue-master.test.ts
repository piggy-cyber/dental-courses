import { describe, expect, it } from "vitest";
import {
  canQueueTransition,
  countQueueWaitingAhead,
  createQueueSlug,
  isQueueActiveStatus,
  isQueueMemberOnline,
  normalizeQueueText,
  projectQueueGuestStaffCards,
  QUEUE_ACTIVE_LOBBY_LIMIT,
} from "@/lib/queue-master";

describe("QueueMaster contracts", () => {
  it("uses the approved three-active-lobby pilot cap", () => {
    expect(QUEUE_ACTIVE_LOBBY_LIMIT).toBe(3);
  });
  it("creates stable URL-safe lobby slugs", () => {
    expect(createQueueSlug("City Hall & DMV", "A1B2")).toBe("city-hall-dmv-a1b2");
    expect(createQueueSlug("  Déntal Clinic  ")).toBe("dental-clinic");
  });

  it("normalizes only safe, bounded guest text", () => {
    expect(normalizeQueueText("  Rick   Ahn ", 40)).toBe("Rick Ahn");
    expect(normalizeQueueText("bad\u0000value", 40)).toBeNull();
    expect(normalizeQueueText("x".repeat(41), 40)).toBeNull();
  });

  it("expires staff presence after 45 seconds", () => {
    const now = Date.parse("2026-09-01T12:00:00.000Z");
    expect(isQueueMemberOnline("2026-09-01T11:59:15.000Z", now)).toBe(true);
    expect(isQueueMemberOnline("2026-09-01T11:59:14.999Z", now)).toBe(false);
    expect(isQueueMemberOnline(null, now)).toBe(false);
  });

  it("allows only the approved queue state flow", () => {
    expect(canQueueTransition("waiting", "called")).toBe(true);
    expect(canQueueTransition("called", "helping")).toBe(true);
    expect(canQueueTransition("helping", "completed")).toBe(true);
    expect(canQueueTransition("waiting", "completed")).toBe(false);
    expect(canQueueTransition("completed", "waiting")).toBe(false);
  });

  it("treats only waiting, called, and helping as active", () => {
    expect(["waiting", "called", "helping"].every((status) => isQueueActiveStatus(status as never))).toBe(true);
    expect(isQueueActiveStatus("completed")).toBe(false);
    expect(isQueueActiveStatus("cancelled")).toBe(false);
  });

  it("does not expose another guest's active session in the guest staff projection", () => {
    const staff = projectQueueGuestStaffCards([{
      id: "staff-1",
      displayName: "Instructor",
      acceptingGuests: false,
      isOnline: true,
      isAvailable: false,
      waitingCount: 1,
      activeEntry: {
        id: "entry-1",
        lobbyId: "lobby-1",
        guestFirstName: "Another guest",
        location: "Desk 14",
        assignedMembershipId: "staff-1",
        assignedStaffName: "Instructor",
        status: "helping",
        sortPosition: 1,
        createdAt: "2026-09-01T12:00:00.000Z",
        calledAt: "2026-09-01T12:01:00.000Z",
        helpingAt: "2026-09-01T12:02:00.000Z",
        finishedAt: null,
      },
    }]);

    expect(staff[0]).not.toHaveProperty("activeEntry");
    expect(JSON.stringify(staff)).not.toContain("Another guest");
    expect(JSON.stringify(staff)).not.toContain("Desk 14");
  });

  it("counts only guests waiting for the same assigned admin", () => {
    const entries = [
      { status: "waiting" as const, assignedMembershipId: "admin-a", sortPosition: 10 },
      { status: "waiting" as const, assignedMembershipId: "admin-b", sortPosition: 20 },
      { status: "called" as const, assignedMembershipId: "admin-a", sortPosition: 30 },
      { status: "waiting" as const, assignedMembershipId: "admin-a", sortPosition: 40 },
    ];

    expect(countQueueWaitingAhead(entries, entries[3])).toBe(1);
  });
});
