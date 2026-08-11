import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export const COMMUNICATION_SCOPES = ["access", "support", "content", "operations"] as const;
export const COMMUNICATION_SEVERITIES = ["info", "attention", "urgent"] as const;
export const SLACK_DESTINATIONS = [
  "president",
  "site_ops",
  "member_access",
  "academic_content",
  "support_inbox",
] as const;

export type CommunicationScope = (typeof COMMUNICATION_SCOPES)[number];
export type CommunicationSeverity = (typeof COMMUNICATION_SEVERITIES)[number];
export type SlackDestination = (typeof SLACK_DESTINATIONS)[number];

export type AdminActivityInput = {
  scope: CommunicationScope;
  severity: CommunicationSeverity;
  eventType: string;
  referenceId: string;
  dashboardPath: string;
  profileId?: string | null;
  reportId?: number | null;
};

type DeliveryRecord = {
  outbox_id: number;
  destination: SlackDestination;
  event_type: string;
  severity: CommunicationSeverity;
  reference_id: string;
  dashboard_path: string;
};

type RecordedEvent = {
  activity_event_id: number;
  notification_outbox_id: number;
  notification_destination: SlackDestination;
};

const SENSITIVE_SUPPORT_TYPES = new Set([
  "support.privacy",
  "support.copyright",
  "support.security",
]);

const DESTINATION_ENV: Record<SlackDestination, string> = {
  president: "SLACK_ALERT_CHANNEL_PRESIDENT",
  site_ops: "SLACK_ALERT_CHANNEL_SITE_OPS",
  member_access: "SLACK_ALERT_CHANNEL_MEMBER_ACCESS",
  academic_content: "SLACK_ALERT_CHANNEL_ACADEMIC_CONTENT",
  support_inbox: "SLACK_ALERT_CHANNEL_SUPPORT_INBOX",
};

export function destinationForEvent(input: Pick<AdminActivityInput, "scope" | "eventType">): SlackDestination {
  if (input.scope === "access") return "member_access";
  if (input.scope === "content") return "academic_content";
  if (input.scope === "operations") return "site_ops";
  return SENSITIVE_SUPPORT_TYPES.has(input.eventType) ? "president" : "support_inbox";
}

export function getSlackAlertConfiguration(env: Record<string, string | undefined> = process.env):
  | { enabled: true; botToken: string; channelIds: Record<SlackDestination, string> }
  | { enabled: false; reason: string } {
  if (env.VERCEL_ENV !== "production") {
    return { enabled: false, reason: "Slack alerts are disabled outside production." };
  }

  const botToken = env.SLACK_BOT_TOKEN?.trim();
  if (!botToken) {
    return { enabled: false, reason: "Slack bot token is not configured." };
  }

  const channelIds = Object.fromEntries(
    SLACK_DESTINATIONS.map((destination) => [destination, env[DESTINATION_ENV[destination]]?.trim()])
  ) as Record<SlackDestination, string | undefined>;
  const missing = SLACK_DESTINATIONS.find((destination) => !channelIds[destination]);
  if (missing) {
    return { enabled: false, reason: "Slack channel IDs are not fully configured." };
  }

  return { enabled: true, botToken, channelIds: channelIds as Record<SlackDestination, string> };
}

export function formatSlackAlert(input: Omit<DeliveryRecord, "outbox_id" | "destination">): string {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://fourthcanal.com").replace(/\/$/, "");
  return [
    "Fourth Canal operational alert",
    `Type: ${input.event_type}`,
    `Status: ${input.severity}`,
    `Reference: ${input.reference_id}`,
    `Review: ${siteUrl}${input.dashboard_path}`,
  ].join("\n");
}

export async function recordAdminActivity(input: AdminActivityInput): Promise<RecordedEvent | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("record_communications_event", {
      p_scope: input.scope,
      p_severity: input.severity,
      p_event_type: input.eventType,
      p_reference_id: input.referenceId,
      p_dashboard_path: input.dashboardPath,
      p_profile_id: input.profileId ?? null,
      p_report_id: input.reportId ?? null,
    });
    if (error) throw new Error(error.message);

    const recorded = (data as RecordedEvent[] | null)?.[0];
    if (!recorded?.notification_outbox_id) {
      throw new Error("Communications event did not return an outbox record.");
    }

    await attemptSlackDelivery(recorded.notification_outbox_id);
    return recorded;
  } catch (error) {
    console.error("communications event recording failed:", error);
    return null;
  }
}

export async function attemptSlackDelivery(outboxId: number): Promise<void> {
  const admin = createAdminClient();
  const configuration = getSlackAlertConfiguration();

  if (!configuration.enabled) {
    await updateDelivery(admin, outboxId, "disabled", configuration.reason, false);
    return;
  }

  try {
    const { data, error } = await admin.rpc("get_communications_delivery", {
      p_outbox_id: outboxId,
    });
    if (error) throw new Error(error.message);

    const delivery = (data as DeliveryRecord[] | null)?.[0];
    if (!delivery) throw new Error("Communications delivery was not found.");

    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${configuration.botToken}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        channel: configuration.channelIds[delivery.destination],
        text: formatSlackAlert(delivery),
      }),
      signal: AbortSignal.timeout(5000),
    });
    const responseBody = (await response.json().catch(() => null)) as { ok?: boolean } | null;
    if (!response.ok || responseBody?.ok !== true) {
      throw new Error("Slack rejected the delivery request.");
    }

    await updateDelivery(admin, outboxId, "delivered", null, true);
  } catch (error) {
    console.error("Slack alert delivery failed:", error);
    await updateDelivery(admin, outboxId, "failed", "Slack delivery failed.", true);
  }
}

async function updateDelivery(
  admin: ReturnType<typeof createAdminClient>,
  outboxId: number,
  status: "delivered" | "failed" | "disabled",
  error: string | null,
  incrementAttempt: boolean
) {
  const { error: updateError } = await admin.rpc("update_communications_delivery", {
    p_outbox_id: outboxId,
    p_status: status,
    p_error: error,
    p_increment_attempt: incrementAttempt,
  });
  if (updateError) throw new Error(updateError.message);
}
