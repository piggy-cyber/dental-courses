const GROUPME_API = "https://api.groupme.com/v3";
const GROUPME_OAUTH = "https://oauth.groupme.com/oauth/authorize";

export type GroupMeGroup = {
  id: string;
  name: string;
};

export function getGroupMeClientId(): string | null {
  return process.env.NEXT_PUBLIC_GROUPME_CLIENT_ID?.trim() || null;
}

export function getGroupMeBotId(): string | null {
  return process.env.GROUPME_BOT_ID?.trim() || null;
}

export function getGroupMeBotLabel(): string | null {
  return process.env.GROUPME_BOT_LABEL?.trim() || null;
}

export function getGroupMeAuthorizeUrl(clientId: string, state?: string): string {
  const url = new URL(GROUPME_OAUTH);
  url.searchParams.set("client_id", clientId);
  if (state) url.searchParams.set("state", state);
  return url.toString();
}

export async function fetchGroupMeGroups(accessToken: string): Promise<GroupMeGroup[]> {
  const res = await fetch(`${GROUPME_API}/groups?per_page=50`, {
    headers: { "X-Access-Token": accessToken },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`GroupMe API error (${res.status})`);
  }

  const data = await res.json();
  const groups = data.response ?? data;
  if (!Array.isArray(groups)) return [];

  return groups.map((group: { id: string; name: string }) => ({
    id: group.id,
    name: group.name,
  }));
}

/** Reserved for site-wide bot announcements (maintenance alerts, etc.). */
export async function postBotMessage(botId: string, text: string): Promise<void> {
  const res = await fetch(`${GROUPME_API}/bots/post`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bot_id: botId, text }),
  });

  if (!res.ok) {
    throw new Error(`GroupMe bot post failed (${res.status})`);
  }
}
