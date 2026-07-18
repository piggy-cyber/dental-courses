import { afterEach, describe, expect, it } from "vitest";
import {
  destinationForEvent,
  formatSlackAlert,
  getSlackAlertConfiguration,
} from "@/lib/communications";

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  if (originalSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
});

describe("communications routing", () => {
  it("routes routine support to the support inbox and sensitive reports only to the President", () => {
    expect(destinationForEvent({ scope: "support", eventType: "support.site" })).toBe("support_inbox");
    expect(destinationForEvent({ scope: "support", eventType: "support.privacy" })).toBe("president");
    expect(destinationForEvent({ scope: "support", eventType: "support.copyright" })).toBe("president");
    expect(destinationForEvent({ scope: "support", eventType: "support.security" })).toBe("president");
  });

  it("keeps access, content, and operations in their dedicated channels", () => {
    expect(destinationForEvent({ scope: "access", eventType: "access.sign_in" })).toBe("member_access");
    expect(destinationForEvent({ scope: "content", eventType: "content.release" })).toBe("academic_content");
    expect(destinationForEvent({ scope: "operations", eventType: "operations.delivery_failed" })).toBe("site_ops");
  });
});

describe("Slack activation and payload safety", () => {
  it("stays disabled in preview and until every production credential is configured", () => {
    expect(getSlackAlertConfiguration({ VERCEL_ENV: "preview" })).toMatchObject({ enabled: false });
    expect(
      getSlackAlertConfiguration({ VERCEL_ENV: "production", SLACK_BOT_TOKEN: "token" })
    ).toMatchObject({ enabled: false });
  });

  it("uses only safe alert metadata", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://fourthcanal.com/";
    const alert = formatSlackAlert({
      event_type: "support.security",
      severity: "urgent",
      reference_id: "7da9873d-1b0a-4ca3-9cbc-d195d1b7cf6b",
      dashboard_path: "/admin/inbox",
    });

    expect(alert).toContain("Type: support.security");
    expect(alert).toContain("Review: https://fourthcanal.com/admin/inbox");
    expect(alert).not.toContain("@example");
    expect(alert).not.toContain("message");
  });
});
