export const QUEUE_ENTRY_STATUSES = [
  "waiting",
  "called",
  "helping",
  "completed",
  "cancelled",
  "no_show",
] as const;

export type QueueEntryStatus = (typeof QUEUE_ENTRY_STATUSES)[number];
export type QueueMembershipRole = "owner" | "admin";

export type QueueLobby = {
  id: string;
  name: string;
  slug: string;
  ownerProfileId: string;
  revision: number;
  createdAt: string;
};

export type QueueMembership = {
  id: string;
  lobbyId: string;
  profileId: string;
  role: QueueMembershipRole;
  displayName: string;
  acceptingGuests: boolean;
  lastSeenAt: string | null;
  isOnline: boolean;
  isAvailable: boolean;
  revokedAt: string | null;
};

export type QueueEntry = {
  id: string;
  lobbyId: string;
  guestFirstName: string;
  location: string;
  assignedMembershipId: string;
  assignedStaffName: string;
  status: QueueEntryStatus;
  sortPosition: number;
  createdAt: string;
  calledAt: string | null;
  helpingAt: string | null;
  finishedAt: string | null;
};

export type QueueStaffCard = Pick<
  QueueMembership,
  "id" | "displayName" | "acceptingGuests" | "isOnline" | "isAvailable"
> & {
  waitingCount: number;
  activeEntry: QueueEntry | null;
};

export type QueueGuestSnapshot = {
  kind: "guest";
  lobby: QueueLobby;
  staff: QueueStaffCard[];
  currentEntry: QueueEntry | null;
  waitingAhead: number;
};

export type QueueAdminInvitation = {
  id: string;
  email: string;
  claimedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export type QueueAdminSnapshot = {
  kind: "admin";
  lobby: QueueLobby;
  me: QueueMembership;
  memberships: QueueMembership[];
  invitations: QueueAdminInvitation[];
  entries: QueueEntry[];
};

export type QueueDisplaySnapshot = {
  kind: "display";
  lobby: QueueLobby;
  staff: QueueStaffCard[];
  waiting: QueueEntry[];
};

export type QueueSnapshot = QueueGuestSnapshot | QueueAdminSnapshot | QueueDisplaySnapshot;

export type QueueGuestAction =
  | { type: "check_in"; firstName: string; location: string; membershipId: string }
  | { type: "start_helping"; entryId: string }
  | { type: "finish"; entryId: string }
  | { type: "leave"; entryId: string };

export type QueueAdminAction =
  | { type: "set_accepting"; accepting: boolean }
  | { type: "call"; entryId: string }
  | { type: "start_helping"; entryId: string }
  | { type: "finish"; entryId: string }
  | { type: "cancel"; entryId: string }
  | { type: "no_show"; entryId: string }
  | { type: "reassign"; entryId: string; membershipId: string }
  | { type: "reorder"; entryId: string; sortPosition: number }
  | { type: "invite"; email: string }
  | { type: "revoke_invite"; invitationId: string }
  | { type: "remove_staff"; membershipId: string };

export const QUEUE_ONLINE_WINDOW_MS = 45_000;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isQueueUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function normalizeQueueText(value: unknown, maximum: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > maximum || /[\u0000-\u001f\u007f]/.test(normalized)) {
    return null;
  }
  return normalized;
}

export function normalizeQueueEmail(value: unknown): string | null {
  const email = normalizeQueueText(value, 254)?.toLowerCase() ?? null;
  return email && EMAIL_PATTERN.test(email) ? email : null;
}

export function createQueueSlug(name: string, suffix = ""): string {
  const base = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "") || "lobby";
  return `${base}${suffix ? `-${suffix.toLowerCase().replace(/[^a-z0-9]/g, "")}` : ""}`.slice(0, 64);
}

export function isQueueMemberOnline(lastSeenAt: string | null, now = Date.now()): boolean {
  if (!lastSeenAt) return false;
  const seenAt = Date.parse(lastSeenAt);
  return Number.isFinite(seenAt) && now - seenAt <= QUEUE_ONLINE_WINDOW_MS && seenAt <= now + 5_000;
}

export function canQueueTransition(from: QueueEntryStatus, to: QueueEntryStatus): boolean {
  return (
    (from === "waiting" && ["called", "cancelled", "no_show"].includes(to))
    || (from === "called" && ["helping", "completed", "cancelled", "no_show"].includes(to))
    || (from === "helping" && ["completed", "cancelled"].includes(to))
  );
}

export function isQueueActiveStatus(status: QueueEntryStatus): boolean {
  return status === "waiting" || status === "called" || status === "helping";
}
