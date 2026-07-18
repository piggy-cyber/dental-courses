import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validatePublicSupportInput } from "@/lib/support";
import {
  getRequestFingerprint,
  getSupportServerConfig,
  verifyTurnstile,
} from "@/lib/support-server";
import { postBotMessage } from "@/lib/groupme";

export const runtime = "nodejs";

function errorResponse(
  code: "validation_failed" | "captcha_failed" | "rate_limited" | "service_unavailable" | "spam_detected",
  message: string,
  status: number,
) {
  return NextResponse.json({ ok: false, code, message }, { status });
}

function supportAlert(input: { category: string; referenceId: string; pagePath: string | null }) {
  return [
    "New Fourth Canal support report",
    `Type: ${input.category}`,
    `Reference: ${input.referenceId}`,
    input.pagePath ? `Page: ${input.pagePath}` : "Page: not supplied",
    "Review: https://fourthcanal.com/admin/operations",
  ].join("\n");
}

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse("validation_failed", "Send the completed support form.", 400);
  }

  const validated = validatePublicSupportInput(payload);
  if (!validated.ok) {
    return errorResponse(validated.code, validated.message, validated.code === "spam_detected" ? 400 : 422);
  }

  const config = getSupportServerConfig();
  if (!config.turnstileSecret || !config.rateLimitSecret || !process.env.SUPABASE_SECRET_KEY?.trim()) {
    return errorResponse("service_unavailable", "Support is temporarily unavailable. Please try again later.", 503);
  }

  let captchaVerified = false;
  try {
    captchaVerified = await verifyTurnstile({
      token: validated.data.turnstileToken,
      secret: config.turnstileSecret,
      request,
    });
  } catch {
    return errorResponse("service_unavailable", "Support is temporarily unavailable. Please try again later.", 503);
  }
  if (!captchaVerified) {
    return errorResponse("captcha_failed", "The security check could not be verified. Please try again.", 422);
  }

  const fingerprint = getRequestFingerprint(request, config.rateLimitSecret);
  if (!fingerprint) {
    return errorResponse("service_unavailable", "Support is temporarily unavailable. Please try again later.", 503);
  }

  const admin = createAdminClient();
  const { data: accepted, error: rateLimitError } = await admin.rpc("accept_public_support_report", {
    p_fingerprint: fingerprint,
  });
  if (rateLimitError) {
    return errorResponse("service_unavailable", "Support is temporarily unavailable. Please try again later.", 503);
  }
  if (accepted !== true) {
    return errorResponse("rate_limited", "You have reached the report limit. Please try again in an hour.", 429);
  }

  const referenceId = randomUUID();
  const { error: insertError } = await admin.from("resource_reports").insert({
    user_id: null,
    category: validated.data.category,
    message: validated.data.message,
    reporter_name: validated.data.name,
    reporter_email: validated.data.replyEmail,
    source: "public_support",
    page_path: validated.data.pagePath,
    public_reference_id: referenceId,
    request_fingerprint: fingerprint,
  });
  if (insertError) {
    return errorResponse("service_unavailable", "Support is temporarily unavailable. Please try again later.", 503);
  }

  const botId = process.env.GROUPME_ADMIN_BOT_ID?.trim();
  if (botId) {
    void postBotMessage(
      botId,
      supportAlert({
        category: validated.data.category,
        referenceId,
        pagePath: validated.data.pagePath,
      }),
    ).catch(() => undefined);
  }

  return NextResponse.json({ ok: true, referenceId }, { status: 201 });
}
