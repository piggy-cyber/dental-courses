import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import {
  createQueueSlug,
  isQueueMemberOnline,
  normalizeQueueEmail,
  normalizeQueueText,
  type QueueAdminInvitation,
  type QueueAdminSnapshot,
  type QueueDisplaySnapshot,
  type QueueEntry,
  type QueueEntryStatus,
  type QueueGuestSnapshot,
  type QueueLobby,
  type QueueMembership,
  type QueueStaffCard,
} from "@/lib/queue-master";

export const QUEUE_GUEST_COOKIE = "fc_queue_guest";
export const QUEUE_GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

type LobbyRow = {
  id: string;
  name: string;
  slug: string;
  owner_profile_id: string;
  revision: number;
  created_at: string;
};

type MembershipRow = {
  id: string;
  lobby_id: string;
  profile_id: string;
  role: "owner" | "admin";
  display_name: string;
  accepting_guests: boolean;
  last_seen_at: string | null;
  revoked_at: string | null;
};

type EntryRow = {
  id: string;
  lobby_id: string;
  guest_session_id: string;
  guest_first_name: string;
  location: string;
  assigned_membership_id: string;
  status: QueueEntryStatus;
  sort_position: number;
  created_at: string;
  called_at: string | null;
  helping_at: string | null;
  finished_at: string | null;
};

type QueueProfile = { id: string; email: string; name: string };

export class QueueServerError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export function isQueueSameOriginRequest(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  let normalizedOrigin: string;
  try {
    normalizedOrigin = new URL(origin).origin;
  } catch {
    return false;
  }
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",", 1)[0]?.trim();
  const host = forwardedHost || request.headers.get("host");
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",", 1)[0]?.trim();
  const protocol = forwardedProtocol || requestUrl.protocol.replace(":", "");
  const allowedOrigins = new Set([requestUrl.origin]);
  if (host && (protocol === "http" || protocol === "https")) allowedOrigins.add(`${protocol}://${host}`);
  if (!allowedOrigins.has(normalizedOrigin)) return false;
  const fetchSite = request.headers.get("sec-fetch-site");
  return fetchSite === null || fetchSite === "same-origin";
}

export function isQueueJsonRequest(request: NextRequest): boolean {
  return request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() === "application/json";
}

export function hashQueueGuestToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isValidQueueGuestToken(token: unknown): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);
}

export function setQueueGuestCookie(response: NextResponse, request: NextRequest, token: string) {
  response.cookies.set(QUEUE_GUEST_COOKIE, token, {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: QUEUE_GUEST_COOKIE_MAX_AGE,
    priority: "high",
  });
}

export async function getQueueProfile(): Promise<QueueProfile | null> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const providers = Array.isArray(user?.app_metadata?.providers) ? user.app_metadata.providers : [];
  const hasGoogleIdentity = user?.app_metadata?.provider === "google" || providers.includes("google");
  if (!user?.email || user.is_anonymous || !hasGoogleIdentity) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, email, name")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw new QueueServerError("profile_lookup_failed", "Could not load your Fourth Canal profile.", 500);
  if (!data) return null;
  return data as QueueProfile;
}

export async function requireQueueProfile(): Promise<QueueProfile> {
  const profile = await getQueueProfile();
  if (!profile) throw new QueueServerError("sign_in_required", "Sign in with Google to manage a queue.", 401);
  await claimQueueInvitations(profile);
  return profile;
}

async function claimQueueInvitations(profile: QueueProfile) {
  const admin = createAdminClient();
  const { error } = await admin.rpc("queue_claim_invitations", {
    p_profile_id: profile.id,
    p_email: profile.email,
    p_display_name: profile.name,
  });
  if (error) throw mapQueueDatabaseError(error.message);
}

export async function createQueueLobby(profile: QueueProfile, nameValue: unknown): Promise<QueueLobby> {
  const name = normalizeQueueText(nameValue, 80);
  if (!name || name.length < 2) throw new QueueServerError("invalid_name", "Enter a lobby name.");
  const suffix = randomBytes(3).toString("hex");
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("queue_create_lobby", {
    p_owner_profile_id: profile.id,
    p_name: name,
    p_slug: createQueueSlug(name, suffix),
    p_display_name: profile.name,
  });
  if (error) throw mapQueueDatabaseError(error.message);
  return mapLobby(data as LobbyRow);
}

export async function getQueueHome(profile: QueueProfile | null, token: string | null) {
  const admin = createAdminClient();
  let lobbies: QueueLobby[] = [];
  if (profile) {
    await claimQueueInvitations(profile);
    const { data: memberships, error } = await admin
      .from("queue_memberships")
      .select("lobby_id")
      .eq("profile_id", profile.id)
      .is("revoked_at", null);
    if (error) throw new QueueServerError("lobbies_failed", "Could not load your lobbies.", 500);
    const lobbyIds = (memberships ?? []).map((row) => row.lobby_id);
    if (lobbyIds.length) {
      const { data, error: lobbyError } = await admin
        .from("queue_lobbies")
        .select("id, name, slug, owner_profile_id, revision, created_at")
        .in("id", lobbyIds)
        .order("created_at", { ascending: false });
      if (lobbyError) throw new QueueServerError("lobbies_failed", "Could not load your lobbies.", 500);
      lobbies = (data as LobbyRow[]).map(mapLobby);
    }
  }

  let guestLobby: QueueLobby | null = null;
  const guestSession = await findGuestSession(token);
  if (guestSession?.last_lobby_id) {
    const { data } = await admin
      .from("queue_lobbies")
      .select("id, name, slug, owner_profile_id, revision, created_at")
      .eq("id", guestSession.last_lobby_id)
      .maybeSingle();
    guestLobby = data ? mapLobby(data as LobbyRow) : null;
  }
  return { lobbies, guestLobby };
}

export async function findLobbyBySlug(slug: string): Promise<LobbyRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("queue_lobbies")
    .select("id, name, slug, owner_profile_id, revision, created_at")
    .eq("slug", slug.toLowerCase())
    .maybeSingle();
  if (error) throw new QueueServerError("lobby_failed", "Could not load this lobby.", 500);
  if (!data) throw new QueueServerError("lobby_not_found", "This lobby does not exist.", 404);
  return data as LobbyRow;
}

export async function getMembership(lobbyId: string, profileId: string): Promise<MembershipRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("queue_memberships")
    .select("id, lobby_id, profile_id, role, display_name, accepting_guests, last_seen_at, revoked_at")
    .eq("lobby_id", lobbyId)
    .eq("profile_id", profileId)
    .is("revoked_at", null)
    .maybeSingle();
  if (error) throw new QueueServerError("membership_failed", "Could not verify lobby access.", 500);
  return data as MembershipRow | null;
}

export async function getQueueGuestSnapshot(slug: string, token: string | null): Promise<QueueGuestSnapshot> {
  const lobbyRow = await findLobbyBySlug(slug);
  const { membershipRows, entryRows } = await loadLobbyRows(lobbyRow.id);
  const guestSession = await findGuestSession(token);
  const currentRow = guestSession
    ? entryRows.find((entry) => entry.guest_session_id === guestSession.id && ["waiting", "called", "helping"].includes(entry.status)) ?? null
    : null;
  const staff = buildStaffCards(membershipRows, entryRows);
  const entries = mapEntries(entryRows, membershipRows);
  const currentEntry = currentRow ? entries.find((entry) => entry.id === currentRow.id) ?? null : null;
  const waitingAhead = currentRow
    ? entryRows.filter((entry) => entry.status === "waiting" && entry.sort_position < currentRow.sort_position).length
    : 0;
  return { kind: "guest", lobby: mapLobby(lobbyRow), staff, currentEntry, waitingAhead };
}

export async function getQueueDisplaySnapshot(slug: string): Promise<QueueDisplaySnapshot> {
  const lobbyRow = await findLobbyBySlug(slug);
  const { membershipRows, entryRows } = await loadLobbyRows(lobbyRow.id);
  const entries = mapEntries(entryRows, membershipRows);
  return {
    kind: "display",
    lobby: mapLobby(lobbyRow),
    staff: buildStaffCards(membershipRows, entryRows),
    waiting: entries.filter((entry) => entry.status === "waiting"),
  };
}

export async function getQueueAdminSnapshot(slug: string, profile: QueueProfile): Promise<QueueAdminSnapshot> {
  const lobbyRow = await findLobbyBySlug(slug);
  const meRow = await getMembership(lobbyRow.id, profile.id);
  if (!meRow) throw new QueueServerError("staff_required", "You are not staff for this lobby.", 403);
  const { membershipRows, entryRows } = await loadLobbyRows(lobbyRow.id);
  let invitations: QueueAdminInvitation[] = [];
  if (meRow.role === "owner") {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("queue_admin_invitations")
      .select("id, email, claimed_at, revoked_at, created_at")
      .eq("lobby_id", lobbyRow.id)
      .order("created_at", { ascending: false });
    if (error) throw new QueueServerError("invites_failed", "Could not load staff invitations.", 500);
    invitations = (data ?? []).map((row) => ({
      id: row.id,
      email: row.email,
      claimedAt: row.claimed_at,
      revokedAt: row.revoked_at,
      createdAt: row.created_at,
    }));
  }
  return {
    kind: "admin",
    lobby: mapLobby(lobbyRow),
    me: mapMembership(meRow),
    memberships: membershipRows.map(mapMembership),
    invitations,
    entries: mapEntries(entryRows, membershipRows),
  };
}

async function loadLobbyRows(lobbyId: string) {
  const admin = createAdminClient();
  const [membershipsResult, entriesResult] = await Promise.all([
    admin
      .from("queue_memberships")
      .select("id, lobby_id, profile_id, role, display_name, accepting_guests, last_seen_at, revoked_at")
      .eq("lobby_id", lobbyId)
      .is("revoked_at", null)
      .order("created_at"),
    admin
      .from("queue_entries")
      .select("id, lobby_id, guest_session_id, guest_first_name, location, assigned_membership_id, status, sort_position, created_at, called_at, helping_at, finished_at")
      .eq("lobby_id", lobbyId)
      .in("status", ["waiting", "called", "helping"])
      .order("sort_position"),
  ]);
  if (membershipsResult.error || entriesResult.error) {
    throw new QueueServerError("snapshot_failed", "Could not load the queue.", 500);
  }
  return {
    membershipRows: membershipsResult.data as MembershipRow[],
    entryRows: entriesResult.data as EntryRow[],
  };
}

type GuestSessionRow = { id: string; last_lobby_id: string | null; expires_at: string };

export async function findGuestSession(token: string | null): Promise<GuestSessionRow | null> {
  if (!isValidQueueGuestToken(token)) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("queue_guest_sessions")
    .select("id, last_lobby_id, expires_at")
    .eq("token_hash", hashQueueGuestToken(token))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw new QueueServerError("guest_session_failed", "Could not restore this guest session.", 500);
  return data as GuestSessionRow | null;
}

export async function requireGuestSession(token: string | null): Promise<GuestSessionRow> {
  const session = await findGuestSession(token);
  if (!session) throw new QueueServerError("guest_session_required", "Refresh the page and check in again.", 401);
  return session;
}

export async function getOrCreateGuestSession(token: string | null) {
  const existing = await findGuestSession(token);
  if (existing && token) return { session: existing, token, created: false };
  const newToken = randomBytes(32).toString("base64url");
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("queue_guest_sessions")
    .insert({ token_hash: hashQueueGuestToken(newToken) })
    .select("id, last_lobby_id, expires_at")
    .single();
  if (error) throw new QueueServerError("guest_session_failed", "Could not start a private guest session.", 500);
  return { session: data as GuestSessionRow, token: newToken, created: true };
}

export function mapQueueDatabaseError(message: string): QueueServerError {
  const known: Record<string, [string, string, number?]> = {
    QUEUE_ADMIN_OFFLINE: ["admin_offline", "That staff member is not accepting new guests right now."],
    QUEUE_ALREADY_JOINED: ["already_joined", "You already have an active place in this lobby."],
    QUEUE_ADMIN_ALREADY_BUSY: ["admin_busy", "That staff member is already helping someone."],
    QUEUE_ENTRY_NOT_WAITING: ["entry_not_waiting", "That guest is no longer waiting."],
    QUEUE_INVALID_TRANSITION: ["invalid_transition", "That queue change is no longer available."],
    QUEUE_STAFF_FORBIDDEN: ["staff_forbidden", "You cannot change that guest.", 403],
    QUEUE_GUEST_FORBIDDEN: ["guest_forbidden", "You can only change your own queue session.", 403],
    QUEUE_REASSIGN_BEFORE_REMOVAL: ["reassign_required", "Reassign this staff member's active guests before removing them."],
    QUEUE_OWNER_REQUIRED: ["owner_required", "Only the lobby owner can do that.", 403],
  };
  const key = Object.keys(known).find((candidate) => message.includes(candidate));
  if (!key) return new QueueServerError("database_error", "The queue changed before this action completed. Refresh and try again.", 409);
  const [code, userMessage, status = 409] = known[key];
  return new QueueServerError(code, userMessage, status);
}

export function queueErrorResponse(error: unknown) {
  const queueError = error instanceof QueueServerError
    ? error
    : new QueueServerError("unexpected_error", "The queue could not complete that request.", 500);
  return { status: queueError.status, body: { error: queueError.code, message: queueError.message } };
}

export function validateInvitationEmail(value: unknown) {
  const email = normalizeQueueEmail(value);
  if (!email) throw new QueueServerError("invalid_email", "Enter a valid staff email address.");
  return email;
}

function mapLobby(row: LobbyRow): QueueLobby {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    ownerProfileId: row.owner_profile_id,
    revision: Number(row.revision),
    createdAt: row.created_at,
  };
}

function mapMembership(row: MembershipRow): QueueMembership {
  const isOnline = isQueueMemberOnline(row.last_seen_at);
  return {
    id: row.id,
    lobbyId: row.lobby_id,
    profileId: row.profile_id,
    role: row.role,
    displayName: row.display_name,
    acceptingGuests: row.accepting_guests,
    lastSeenAt: row.last_seen_at,
    isOnline,
    isAvailable: row.accepting_guests && isOnline,
    revokedAt: row.revoked_at,
  };
}

function mapEntries(rows: EntryRow[], memberships: MembershipRow[]): QueueEntry[] {
  const names = new Map(memberships.map((membership) => [membership.id, membership.display_name]));
  return rows.map((row) => ({
    id: row.id,
    lobbyId: row.lobby_id,
    guestFirstName: row.guest_first_name,
    location: row.location,
    assignedMembershipId: row.assigned_membership_id,
    assignedStaffName: names.get(row.assigned_membership_id) ?? "Staff",
    status: row.status,
    sortPosition: Number(row.sort_position),
    createdAt: row.created_at,
    calledAt: row.called_at,
    helpingAt: row.helping_at,
    finishedAt: row.finished_at,
  }));
}

function buildStaffCards(memberships: MembershipRow[], entries: EntryRow[]): QueueStaffCard[] {
  const mappedEntries = mapEntries(entries, memberships);
  return memberships.map((membership) => {
    const mapped = mapMembership(membership);
    return {
      id: mapped.id,
      displayName: mapped.displayName,
      acceptingGuests: mapped.acceptingGuests,
      isOnline: mapped.isOnline,
      isAvailable: mapped.isAvailable,
      waitingCount: entries.filter((entry) => entry.assigned_membership_id === membership.id && entry.status === "waiting").length,
      activeEntry: mappedEntries.find((entry) => entry.assignedMembershipId === membership.id && ["called", "helping"].includes(entry.status)) ?? null,
    };
  });
}
