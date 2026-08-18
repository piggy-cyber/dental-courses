import { NextResponse, type NextRequest } from "next/server";
import {
  validateLabHelpQueueCancellation,
  validateLabHelpQueueSubmission,
  normalizeLabHelpQueueClientId,
  type LabHelpProfessor,
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
import { verifyTurnstile } from "@/lib/support-server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type QueueRow = {
  id: string;
  student_name: string;
  issue: string | null;
  bench_seat: string;
  professor: LabHelpProfessor;
  created_at: string;
};

function publicEntry(row: QueueRow): LabHelpQueuePublicEntry {
  return {
    id: row.id,
    studentName: row.student_name,
    issue: row.issue,
    benchSeat: row.bench_seat,
    professor: row.professor,
    createdAt: row.created_at,
  };
}

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

function errorResponse(
  code: "validation_failed" | "spam_detected" | "request_rejected" | "captcha_failed" | "rate_limited" | "already_waiting" | "not_found" | "service_unavailable",
  message: string,
  status: number,
  extra: Record<string, unknown> = {},
) {
  return json({ ok: false, code, message, ...extra }, status);
}

function hasServerConfiguration() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    && process.env.SUPABASE_SECRET_KEY?.trim(),
  );
}

async function readBody(request: NextRequest) {
  try {
    return await request.json() as unknown;
  } catch {
    return null;
  }
}

async function findActiveEntry(admin: ReturnType<typeof createAdminClient>, clientFingerprint: string) {
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("lab_help_queue_entries")
    .select("id, student_name, issue, bench_seat, professor, created_at")
    .eq("client_fingerprint", clientFingerprint)
    .eq("status", "waiting")
    .gt("expires_at", now)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? publicEntry(data as QueueRow) : null;
}

async function queuePosition(admin: ReturnType<typeof createAdminClient>, entry: LabHelpQueuePublicEntry) {
  const { data, error } = await admin
    .from("lab_help_queue_entries")
    .select("id")
    .eq("professor", entry.professor)
    .eq("status", "waiting")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw error;
  const index = (data ?? []).findIndex((candidate) => candidate.id === entry.id);
  return index >= 0 ? index + 1 : 1;
}

export async function GET(request: NextRequest) {
  const clientId = normalizeLabHelpQueueClientId(request.nextUrl.searchParams.get("clientId"));
  if (!clientId) {
    return errorResponse("validation_failed", "Refresh the page and try again.", 422);
  }

  const config = getLabHelpQueueServerConfig();
  if (!hasServerConfiguration() || !config.turnstileSecret || !config.rateLimitSecret || !config.submissionSecret) {
    return errorResponse("service_unavailable", "The lab queue is temporarily unavailable.", 503);
  }

  const requestFingerprint = getLabHelpQueueRequestFingerprint(request, config.rateLimitSecret);
  if (!requestFingerprint) {
    return errorResponse("service_unavailable", "The lab queue is temporarily unavailable.", 503);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("lab_help_queue_entries")
    .select("id, student_name, issue, bench_seat, professor, created_at")
    .eq("status", "waiting")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: true });

  if (error) {
    return errorResponse("service_unavailable", "The lab queue is temporarily unavailable.", 503);
  }

  return json({
    ok: true,
    entries: ((data ?? []) as QueueRow[]).map(publicEntry),
    refreshedAt: new Date().toISOString(),
    submissionToken: createLabHelpQueueSubmissionToken({
      clientId,
      requestFingerprint,
      secret: config.submissionSecret,
    }),
  });
}

export async function POST(request: NextRequest) {
  if (!isLabHelpQueueSameOriginRequest(request)) {
    return errorResponse("request_rejected", "Refresh the page and try again.", 403);
  }
  if (!isLabHelpQueueJsonRequest(request)) {
    return errorResponse("request_rejected", "Send the request as JSON.", 415);
  }

  const validated = validateLabHelpQueueSubmission(await readBody(request));
  if (!validated.ok) {
    return errorResponse(
      validated.code,
      validated.message,
      validated.code === "spam_detected" ? 400 : 422,
    );
  }

  const config = getLabHelpQueueServerConfig();
  if (!hasServerConfiguration() || !config.turnstileSecret || !config.rateLimitSecret || !config.submissionSecret) {
    return errorResponse("service_unavailable", "The lab queue is temporarily unavailable.", 503);
  }

  const requestFingerprint = getLabHelpQueueRequestFingerprint(request, config.rateLimitSecret);
  if (!requestFingerprint) {
    return errorResponse("service_unavailable", "The lab queue is temporarily unavailable.", 503);
  }

  if (!verifyLabHelpQueueSubmissionToken({
    token: validated.data.submissionToken,
    clientId: validated.data.clientId,
    requestFingerprint,
    secret: config.submissionSecret,
  })) {
    return errorResponse("request_rejected", "Refresh the page and try again.", 403);
  }

  const clientFingerprint = getLabHelpQueueClientFingerprint(
    validated.data.clientId,
    config.rateLimitSecret,
  );
  const admin = createAdminClient();

  const { data: replay, error: replayError } = await admin
    .from("lab_help_queue_entries")
    .select("id, student_name, issue, bench_seat, professor, created_at")
    .eq("idempotency_key", validated.data.idempotencyKey)
    .eq("client_fingerprint", clientFingerprint)
    .maybeSingle();
  if (replayError) {
    return errorResponse("service_unavailable", "The lab queue is temporarily unavailable.", 503);
  }
  if (replay) {
    const entry = publicEntry(replay as QueueRow);
    try {
      return json({ ok: true, entry, position: await queuePosition(admin, entry), replayed: true });
    } catch {
      return errorResponse("service_unavailable", "The lab queue is temporarily unavailable.", 503);
    }
  }

  let humanVerified = false;
  try {
    humanVerified = await verifyTurnstile({
      token: validated.data.turnstileToken,
      secret: config.turnstileSecret,
      request,
      expectedAction: "lab_help_queue_submit",
    });
  } catch {
    return errorResponse("service_unavailable", "The anonymous security check is temporarily unavailable. Try again.", 503);
  }
  if (!humanVerified) {
    return errorResponse("captcha_failed", "The anonymous security check could not be verified. Try again.", 422);
  }

  const expirationTime = new Date().toISOString();
  const { error: expirationError } = await admin
    .from("lab_help_queue_entries")
    .delete()
    .eq("client_fingerprint", clientFingerprint)
    .eq("status", "waiting")
    .lte("expires_at", expirationTime);
  if (expirationError) {
    return errorResponse("service_unavailable", "The lab queue is temporarily unavailable.", 503);
  }

  try {
    const activeEntry = await findActiveEntry(admin, clientFingerprint);
    if (activeEntry) {
      return errorResponse(
        "already_waiting",
        `You are already #${await queuePosition(admin, activeEntry)} in ${activeEntry.professor}'s queue.`,
        409,
        { activeEntry },
      );
    }
  } catch {
    return errorResponse("service_unavailable", "The lab queue is temporarily unavailable.", 503);
  }

  const { data: accepted, error: rateLimitError } = await admin.rpc(
    "accept_lab_help_queue_request",
    {
      p_client_fingerprint: clientFingerprint,
      p_request_fingerprint: requestFingerprint,
    },
  );
  if (rateLimitError) {
    return errorResponse("service_unavailable", "The lab queue is temporarily unavailable.", 503);
  }
  if (accepted !== true) {
    return errorResponse("rate_limited", "Too many requests were submitted from this connection. Try again later.", 429);
  }

  const { data, error } = await admin
    .from("lab_help_queue_entries")
    .insert({
      student_name: validated.data.studentName,
      issue: validated.data.issue,
      bench_seat: validated.data.benchSeat,
      professor: validated.data.professor,
      client_fingerprint: clientFingerprint,
      idempotency_key: validated.data.idempotencyKey,
    })
    .select("id, student_name, issue, bench_seat, professor, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      try {
        const activeEntry = await findActiveEntry(admin, clientFingerprint);
        if (activeEntry) {
          return errorResponse(
            "already_waiting",
            `You are already #${await queuePosition(admin, activeEntry)} in ${activeEntry.professor}'s queue.`,
            409,
            { activeEntry },
          );
        }
      } catch {
        // Fall through to the generic response without exposing database details.
      }
    }
    return errorResponse("service_unavailable", "The lab queue is temporarily unavailable.", 503);
  }

  const entry = publicEntry(data as QueueRow);
  try {
    return json({ ok: true, entry, position: await queuePosition(admin, entry) }, 201);
  } catch {
    return errorResponse("service_unavailable", "Your request was saved, but its position could not be loaded. Refresh the page.", 503);
  }
}

export async function DELETE(request: NextRequest) {
  if (!isLabHelpQueueSameOriginRequest(request)) {
    return errorResponse("request_rejected", "Refresh the page and try again.", 403);
  }
  if (!isLabHelpQueueJsonRequest(request)) {
    return errorResponse("request_rejected", "Send the request as JSON.", 415);
  }

  const validated = validateLabHelpQueueCancellation(await readBody(request));
  if (!validated.ok) {
    return errorResponse("validation_failed", validated.message, 422);
  }

  const config = getLabHelpQueueServerConfig();
  if (!hasServerConfiguration() || !config.rateLimitSecret) {
    return errorResponse("service_unavailable", "The lab queue is temporarily unavailable.", 503);
  }

  const clientFingerprint = getLabHelpQueueClientFingerprint(
    validated.data.clientId,
    config.rateLimitSecret,
  );
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("lab_help_queue_entries")
    .delete()
    .eq("id", validated.data.entryId)
    .eq("client_fingerprint", clientFingerprint)
    .eq("status", "waiting")
    .gt("expires_at", now)
    .select("id")
    .maybeSingle();

  if (error) {
    return errorResponse("service_unavailable", "The request could not be removed right now.", 503);
  }
  if (!data) {
    return errorResponse("not_found", "That request is no longer waiting.", 404);
  }

  return json({ ok: true });
}
