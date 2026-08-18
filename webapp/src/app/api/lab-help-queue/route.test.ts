import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  getRequestFingerprint: vi.fn(() => "a".repeat(64)),
  getClientFingerprint: vi.fn(() => "b".repeat(64)),
  getServerConfig: vi.fn(() => ({
    rateLimitSecret: "queue-secret",
    submissionSecret: "submission-secret",
    turnstileSecret: "turnstile-secret",
  })),
  createSubmissionToken: vi.fn(() => "issued-submission-token"),
  verifySubmissionToken: vi.fn(() => true),
  isJsonRequest: vi.fn(() => true),
  isSameOriginRequest: vi.fn(() => true),
  verifyTurnstile: vi.fn(async () => true),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

vi.mock("@/lib/lab-help-queue-server", () => ({
  getLabHelpQueueRequestFingerprint: mocks.getRequestFingerprint,
  getLabHelpQueueClientFingerprint: mocks.getClientFingerprint,
  getLabHelpQueueServerConfig: mocks.getServerConfig,
  createLabHelpQueueSubmissionToken: mocks.createSubmissionToken,
  verifyLabHelpQueueSubmissionToken: mocks.verifySubmissionToken,
  isLabHelpQueueJsonRequest: mocks.isJsonRequest,
  isLabHelpQueueSameOriginRequest: mocks.isSameOriginRequest,
}));

vi.mock("@/lib/support-server", () => ({
  verifyTurnstile: mocks.verifyTurnstile,
}));

import { DELETE, GET, POST } from "@/app/api/lab-help-queue/route";

type QueryResult = { data: unknown; error: null | { code?: string } };

function query(result: QueryResult) {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    gt: vi.fn(),
    lte: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    maybeSingle: vi.fn(async () => result),
    single: vi.fn(async () => result),
    then: (
      onFulfilled: (value: QueryResult) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(onFulfilled, onRejected),
  };
  for (const method of ["select", "eq", "gt", "lte", "order", "limit", "insert", "update", "delete"] as const) {
    builder[method].mockReturnValue(builder);
  }
  return builder;
}

function adminWith(results: QueryResult[], rpcResult: QueryResult = { data: true, error: null }) {
  const builders = results.map(query);
  const pendingBuilders = [...builders];
  const admin = {
    from: vi.fn(() => {
      const builder = pendingBuilders.shift();
      if (!builder) throw new Error("Unexpected database query");
      return builder;
    }),
    rpc: vi.fn(async () => rpcResult),
  };
  mocks.createAdminClient.mockReturnValue(admin);
  return { admin, builders };
}

const queueRow = {
  id: "1ae2ef64-c410-4add-b3b0-74566cb728d4",
  student_name: "Riley Chen",
  issue: "Tooth pain",
  bench_seat: "88",
  professor: "Dr. LaSalvia",
  created_at: "2026-08-18T16:30:00.000Z",
};

const submission = {
  studentName: "Riley Chen",
  issue: "Tooth pain",
  benchSeat: "#88",
  professor: "Dr. LaSalvia",
  clientId: "55bd82c9-9024-4d4b-846e-c66d5ce603be",
  idempotencyKey: "64c33d84-f085-47a9-a7e9-dde655166ce3",
  submissionToken: "issued-submission-token",
  turnstileToken: "verified-anonymous-browser-token",
  website: "",
};

function request(method: "POST" | "DELETE", body: unknown) {
  return new NextRequest("https://fourthcanal.com/api/lab-help-queue", {
    method,
    headers: {
      "content-type": "application/json",
      origin: "https://fourthcanal.com",
      "sec-fetch-site": "same-origin",
      "x-vercel-forwarded-for": "203.0.113.40",
    },
    body: JSON.stringify(body),
  });
}

function getRequest(clientId = submission.clientId) {
  return new NextRequest(`https://fourthcanal.com/api/lab-help-queue?clientId=${encodeURIComponent(clientId)}`, {
    headers: { "x-vercel-forwarded-for": "203.0.113.40" },
  });
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "test-secret";
  mocks.createAdminClient.mockReset();
  mocks.getRequestFingerprint.mockClear();
  mocks.getClientFingerprint.mockClear();
  mocks.createSubmissionToken.mockClear();
  mocks.verifySubmissionToken.mockReset();
  mocks.verifySubmissionToken.mockReturnValue(true);
  mocks.isJsonRequest.mockReset();
  mocks.isJsonRequest.mockReturnValue(true);
  mocks.isSameOriginRequest.mockReset();
  mocks.isSameOriginRequest.mockReturnValue(true);
  mocks.verifyTurnstile.mockReset();
  mocks.verifyTurnstile.mockResolvedValue(true);
  mocks.getServerConfig.mockReturnValue({
    rateLimitSecret: "queue-secret",
    submissionSecret: "submission-secret",
    turnstileSecret: "turnstile-secret",
  });
});

describe("Lab Help Queue API", () => {
  it("returns only sanitized active queue fields", async () => {
    adminWith([{ data: [queueRow], error: null }]);

    const response = await GET(getRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(body.entries).toEqual([{
      id: queueRow.id,
      studentName: "Riley Chen",
      issue: "Tooth pain",
      benchSeat: "88",
      professor: "Dr. LaSalvia",
      createdAt: queueRow.created_at,
    }]);
    expect(JSON.stringify(body)).not.toContain("fingerprint");
    expect(body.submissionToken).toBe("issued-submission-token");
    expect(mocks.createSubmissionToken).toHaveBeenCalledWith({
      clientId: submission.clientId,
      requestFingerprint: "a".repeat(64),
      secret: "submission-secret",
    });
  });

  it("creates one normalized request and reports its professor position", async () => {
    const { admin, builders } = adminWith([
      { data: null, error: null },
      { data: null, error: null },
      { data: null, error: null },
      { data: queueRow, error: null },
      { data: [{ id: queueRow.id }], error: null },
    ]);

    const response = await POST(request("POST", submission));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({ ok: true, position: 1, entry: { benchSeat: "88", professor: "Dr. LaSalvia" } });
    expect(mocks.verifySubmissionToken).toHaveBeenCalledWith({
      token: submission.submissionToken,
      clientId: submission.clientId,
      requestFingerprint: "a".repeat(64),
      secret: "submission-secret",
    });
    expect(mocks.verifyTurnstile).toHaveBeenCalledWith({
      token: submission.turnstileToken,
      secret: "turnstile-secret",
      request: expect.any(NextRequest),
      expectedAction: "lab_help_queue_submit",
    });
    expect(admin.rpc).toHaveBeenCalledOnce();
    expect(admin.rpc).toHaveBeenCalledWith("accept_lab_help_queue_request", {
      p_client_fingerprint: "b".repeat(64),
      p_request_fingerprint: "a".repeat(64),
    });
    expect(builders[1].delete).toHaveBeenCalledOnce();
    expect(builders[1].update).not.toHaveBeenCalled();
    expect(builders[3].insert).toHaveBeenCalledWith({
      student_name: "Riley Chen",
      issue: "Tooth pain",
      bench_seat: "88",
      professor: "Dr. LaSalvia",
      client_fingerprint: "b".repeat(64),
      idempotency_key: submission.idempotencyKey,
    });
  });

  it("replays an idempotent success without consuming another rate-limit slot", async () => {
    const { admin } = adminWith([
      { data: queueRow, error: null },
      { data: [{ id: queueRow.id }], error: null },
    ]);

    const response = await POST(request("POST", submission));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.replayed).toBe(true);
    expect(admin.rpc).not.toHaveBeenCalled();
    expect(mocks.verifyTurnstile).not.toHaveBeenCalled();
  });

  it("rejects a second active request and an exhausted anonymous rate limit", async () => {
    let state = adminWith([
      { data: null, error: null },
      { data: null, error: null },
      { data: queueRow, error: null },
      { data: [{ id: queueRow.id }], error: null },
    ]);
    let response = await POST(request("POST", submission));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "already_waiting" });
    expect(state.admin.rpc).not.toHaveBeenCalled();

    state = adminWith([
      { data: null, error: null },
      { data: null, error: null },
      { data: null, error: null },
    ], { data: false, error: null });
    response = await POST(request("POST", { ...submission, idempotencyKey: "31f99d6a-acf2-4aec-a22c-88ddaf75773f" }));
    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ code: "rate_limited" });
  });

  it("fails closed for an altered professor and lets the owning browser leave", async () => {
    let response = await POST(request("POST", { ...submission, professor: "Dr. Other" }));
    expect(response.status).toBe(422);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();

    const { builders } = adminWith([{ data: { id: queueRow.id }, error: null }]);
    response = await DELETE(request("DELETE", { entryId: queueRow.id, clientId: submission.clientId }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(builders[0].delete).toHaveBeenCalledOnce();
    expect(builders[0].update).not.toHaveBeenCalled();
  });

  it("rejects cross-origin, non-JSON, and unsigned submissions before database access", async () => {
    mocks.isSameOriginRequest.mockReturnValueOnce(false);
    let response = await POST(request("POST", submission));
    expect(response.status).toBe(403);

    mocks.isJsonRequest.mockReturnValueOnce(false);
    response = await POST(request("POST", submission));
    expect(response.status).toBe(415);

    mocks.verifySubmissionToken.mockReturnValueOnce(false);
    response = await POST(request("POST", submission));
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "request_rejected" });
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("requires a fresh anonymous human-verification token before any queue mutation", async () => {
    const { admin, builders } = adminWith([{ data: null, error: null }]);
    mocks.verifyTurnstile.mockResolvedValueOnce(false);

    const response = await POST(request("POST", submission));

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ code: "captcha_failed" });
    expect(mocks.verifyTurnstile).toHaveBeenCalledOnce();
    expect(admin.rpc).not.toHaveBeenCalled();
    expect(builders[0].delete).not.toHaveBeenCalled();
    expect(builders[0].insert).not.toHaveBeenCalled();
  });
});
