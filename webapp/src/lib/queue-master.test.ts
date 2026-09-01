import { describe, expect, it } from "vitest";
import {
  canQueueTransition,
  createQueueSlug,
  isQueueActiveStatus,
  isQueueMemberOnline,
  normalizeQueueText,
} from "@/lib/queue-master";

describe("QueueMaster contracts", () => {
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
});
