import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  LAB_HELP_PROFESSORS,
  groupLabHelpQueueEntries,
  normalizeBenchSeat,
  validateLabHelpQueueCancellation,
  validateLabHelpQueueSubmission,
  type LabHelpQueuePublicEntry,
} from "@/lib/lab-help-queue";
import {
  createLabHelpQueueSubmissionToken,
  getLabHelpQueueClientFingerprint,
  getLabHelpQueueRequestFingerprint,
  getLabHelpQueueServerConfig,
  isLabHelpQueueJsonRequest,
  isLabHelpQueueSameOriginRequest,
  verifyLabHelpQueueSubmissionToken,
} from "@/lib/lab-help-queue-server";

const originalLabSecret = process.env.LAB_QUEUE_RATE_LIMIT_SECRET;
const originalSubmissionSecret = process.env.LAB_QUEUE_SUBMISSION_SECRET;
const originalSupportSecret = process.env.SUPPORT_RATE_LIMIT_SECRET;

afterEach(() => {
  if (originalLabSecret === undefined) delete process.env.LAB_QUEUE_RATE_LIMIT_SECRET;
  else process.env.LAB_QUEUE_RATE_LIMIT_SECRET = originalLabSecret;
  if (originalSubmissionSecret === undefined) delete process.env.LAB_QUEUE_SUBMISSION_SECRET;
  else process.env.LAB_QUEUE_SUBMISSION_SECRET = originalSubmissionSecret;
  if (originalSupportSecret === undefined) delete process.env.SUPPORT_RATE_LIMIT_SECRET;
  else process.env.SUPPORT_RATE_LIMIT_SECRET = originalSupportSecret;
});

const validSubmission = {
  studentName: "  Riley   Chen  ",
  issue: " Tooth pain ",
  benchSeat: "#88",
  professor: "Dr. LaSalvia",
  clientId: "55bd82c9-9024-4d4b-846e-c66d5ce603be",
  idempotencyKey: "64c33d84-f085-47a9-a7e9-dde655166ce3",
  submissionToken: `v1.1787068800.${"c".repeat(64)}`,
  turnstileToken: "verified-anonymous-browser-token",
  website: "",
};

describe("Lab Help Queue input", () => {
  it("preserves the exact professor list and order", () => {
    expect(LAB_HELP_PROFESSORS).toEqual([
      "Dr. T",
      "Dr. J",
      "Dr. Berns",
      "Dr. LaSalvia",
      "Dr. Markarian",
      "Dr. Zakhary",
      "Dr. Ali",
      "Dr. Tarik",
    ]);
  });

  it("normalizes a #88 bench and optional issue", () => {
    expect(normalizeBenchSeat("#88")).toBe("88");
    expect(validateLabHelpQueueSubmission(validSubmission)).toEqual({
      ok: true,
      data: {
        studentName: "Riley Chen",
        issue: "Tooth pain",
        benchSeat: "88",
        professor: "Dr. LaSalvia",
        clientId: validSubmission.clientId,
        idempotencyKey: validSubmission.idempotencyKey,
        submissionToken: validSubmission.submissionToken,
        turnstileToken: validSubmission.turnstileToken,
      },
    });
    expect(validateLabHelpQueueSubmission({ ...validSubmission, issue: "" })).toMatchObject({
      ok: true,
      data: { issue: null },
    });
  });

  it("rejects altered professors, invalid benches, identifiers, and honeypots", () => {
    expect(validateLabHelpQueueSubmission({ ...validSubmission, professor: "Dr. Other" })).toMatchObject({ ok: false });
    expect(validateLabHelpQueueSubmission({ ...validSubmission, benchSeat: "hallway" })).toMatchObject({ ok: false });
    expect(validateLabHelpQueueSubmission({ ...validSubmission, clientId: "not-a-uuid" })).toMatchObject({ ok: false });
    expect(validateLabHelpQueueSubmission({ ...validSubmission, submissionToken: "" })).toMatchObject({ ok: false });
    expect(validateLabHelpQueueSubmission({ ...validSubmission, turnstileToken: "" })).toMatchObject({ ok: false });
    expect(validateLabHelpQueueSubmission({ ...validSubmission, website: "https://spam.example" })).toMatchObject({
      ok: false,
      code: "spam_detected",
    });
    const missingHoneypot: Record<string, unknown> = { ...validSubmission };
    delete missingHoneypot.website;
    expect(validateLabHelpQueueSubmission(missingHoneypot)).toMatchObject({
      ok: false,
      code: "spam_detected",
    });
  });

  it("validates a request owner before cancellation", () => {
    expect(validateLabHelpQueueCancellation({
      entryId: "1ae2ef64-c410-4add-b3b0-74566cb728d4",
      clientId: validSubmission.clientId,
    })).toMatchObject({ ok: true });
    expect(validateLabHelpQueueCancellation({ entryId: "bad", clientId: validSubmission.clientId })).toMatchObject({ ok: false });
  });
});

describe("Lab Help Queue display", () => {
  it("groups chronologically with independent professor queues", () => {
    const entries: LabHelpQueuePublicEntry[] = [
      { id: "b", studentName: "Second", issue: null, benchSeat: "2", professor: "Dr. Berns", createdAt: "2026-08-18T12:02:00Z" },
      { id: "a", studentName: "First", issue: "Tooth pain", benchSeat: "1", professor: "Dr. Berns", createdAt: "2026-08-18T12:01:00Z" },
      { id: "c", studentName: "Other", issue: null, benchSeat: "3", professor: "Dr. LaSalvia", createdAt: "2026-08-18T12:00:00Z" },
    ];

    const groups = groupLabHelpQueueEntries(entries);
    expect(groups.map((group) => group.professor)).toEqual(["Dr. Berns", "Dr. LaSalvia"]);
    expect(groups[0].entries.map((entry) => entry.studentName)).toEqual(["First", "Second"]);
    expect(groups[1].entries).toHaveLength(1);
  });
});

describe("Lab Help Queue anonymous safeguards", () => {
  it("uses a queue-specific secret when present and otherwise reuses the support secret", () => {
    process.env.SUPPORT_RATE_LIMIT_SECRET = "support-secret";
    delete process.env.LAB_QUEUE_RATE_LIMIT_SECRET;
    delete process.env.LAB_QUEUE_SUBMISSION_SECRET;
    expect(getLabHelpQueueServerConfig().rateLimitSecret).toBe("support-secret");
    expect(getLabHelpQueueServerConfig().submissionSecret).toBe("support-secret");
    process.env.LAB_QUEUE_RATE_LIMIT_SECRET = "queue-secret";
    expect(getLabHelpQueueServerConfig().rateLimitSecret).toBe("queue-secret");
    expect(getLabHelpQueueServerConfig().submissionSecret).toBe("queue-secret");
    process.env.LAB_QUEUE_SUBMISSION_SECRET = "submission-secret";
    expect(getLabHelpQueueServerConfig().submissionSecret).toBe("submission-secret");
  });

  it("requires JSON from the exact page origin for mutating requests", () => {
    const approved = new NextRequest("https://fourthcanal.com/api/lab-help-queue", {
      method: "POST",
      headers: {
        origin: "https://fourthcanal.com",
        "content-type": "application/json; charset=utf-8",
        "sec-fetch-site": "same-origin",
      },
    });
    expect(isLabHelpQueueSameOriginRequest(approved)).toBe(true);
    expect(isLabHelpQueueJsonRequest(approved)).toBe(true);

    const crossOrigin = new NextRequest("https://fourthcanal.com/api/lab-help-queue", {
      method: "POST",
      headers: { origin: "https://attacker.example", "content-type": "application/json" },
    });
    expect(isLabHelpQueueSameOriginRequest(crossOrigin)).toBe(false);

    const formEncoded = new NextRequest("https://fourthcanal.com/api/lab-help-queue", {
      method: "POST",
      headers: { origin: "https://fourthcanal.com", "content-type": "text/plain" },
    });
    expect(isLabHelpQueueJsonRequest(formEncoded)).toBe(false);
  });

  it("HMACs both the request address and browser identifier", () => {
    const request = new NextRequest("https://fourthcanal.com/api/lab-help-queue", {
      headers: { "x-vercel-forwarded-for": "203.0.113.40" },
    });
    const requestFingerprint = getLabHelpQueueRequestFingerprint(request, "queue-secret");
    const clientFingerprint = getLabHelpQueueClientFingerprint(validSubmission.clientId, "queue-secret");
    expect(requestFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(clientFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(requestFingerprint).not.toContain("203.0.113.40");
    expect(clientFingerprint).not.toContain(validSubmission.clientId);
    expect(clientFingerprint).not.toBe(requestFingerprint);
  });

  it("signs a short-lived submission token for one browser and request fingerprint", () => {
    const now = Date.UTC(2026, 7, 18, 17, 0, 0);
    const token = createLabHelpQueueSubmissionToken({
      clientId: validSubmission.clientId,
      requestFingerprint: "a".repeat(64),
      secret: "submission-secret",
      now,
    });

    expect(verifyLabHelpQueueSubmissionToken({
      token,
      clientId: validSubmission.clientId,
      requestFingerprint: "a".repeat(64),
      secret: "submission-secret",
      now: now + 4 * 60 * 1000,
    })).toBe(true);
    expect(verifyLabHelpQueueSubmissionToken({
      token,
      clientId: "f71868fe-7952-49c2-9b12-7aa6f794a94e",
      requestFingerprint: "a".repeat(64),
      secret: "submission-secret",
      now,
    })).toBe(false);
    expect(verifyLabHelpQueueSubmissionToken({
      token,
      clientId: validSubmission.clientId,
      requestFingerprint: "b".repeat(64),
      secret: "submission-secret",
      now,
    })).toBe(false);
    expect(verifyLabHelpQueueSubmissionToken({
      token,
      clientId: validSubmission.clientId,
      requestFingerprint: "a".repeat(64),
      secret: "submission-secret",
      now: now + 6 * 60 * 1000,
    })).toBe(false);
  });
});
