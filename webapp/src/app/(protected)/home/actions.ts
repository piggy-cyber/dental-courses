"use server";

import { getSessionProfile } from "@/lib/access";
import { getGroupMeBotId, postBotMessage } from "@/lib/groupme";
import {
  formatMaintenanceGroupMeText,
  type MaintenanceRequest,
} from "@/lib/maintenance";

export async function notifyMaintenanceGroupMe(
  req: Omit<MaintenanceRequest, "reporterName">
): Promise<{ ok: true } | { ok: false; error: string }> {
  const botId = getGroupMeBotId();
  if (!botId) {
    return { ok: false, error: "GroupMe bot is not configured on this site." };
  }

  const { profile } = await getSessionProfile();
  if (!profile) return { ok: false, error: "Not signed in." };

  const reporterName = profile.name ?? profile.email?.split("@")[0] ?? "Student";
  const text = formatMaintenanceGroupMeText({ ...req, reporterName });

  try {
    await postBotMessage(botId, text);
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not post to GroupMe. Try again." };
  }
}
