import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260901050103_queue_master_pilot.sql"),
  "utf8",
);
const hardening = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260901051737_queue_master_advisor_hardening.sql"),
  "utf8",
);
const staffPool = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260901071538_queue_master_staff_pool.sql"),
  "utf8",
);
const lifecycle = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260901100812_queue_master_lobby_lifecycle.sql"),
  "utf8",
);

const queueTables = [
  "queue_lobbies",
  "queue_memberships",
  "queue_admin_invitations",
  "queue_guest_sessions",
  "queue_entries",
  "queue_transition_events",
];

describe("QueueMaster migration security contract", () => {
  it.each(queueTables)("enables RLS and revokes browser access on %s", (table) => {
    expect(migration).toContain(`alter table public.${table} enable row level security;`);
    expect(migration).toContain(`revoke all on table public.${table} from public, anon, authenticated;`);
    expect(hardening).toContain(`create policy "Queue service role access" on public.${table}`);
  });

  it("enforces one active guest and one called/helping guest per staff member", () => {
    expect(migration).toMatch(/queue_entries_one_active_guest_idx[\s\S]*status in \('waiting', 'called', 'helping'\)/);
    expect(migration).toMatch(/queue_entries_one_active_admin_idx[\s\S]*status in \('called', 'helping'\)/);
  });

  it("checks accepting and recent presence inside the atomic join function", () => {
    expect(migration).toContain("not selected_admin.accepting_guests");
    expect(migration).toContain("now() - interval '45 seconds'");
  });

  it("broadcasts no guest, email, location, or session data", () => {
    const broadcastBody = migration.match(/perform realtime\.send\(([\s\S]*?)\);/)?.[1] ?? "";
    expect(broadcastBody).toContain("'lobby_id'");
    expect(broadcastBody).toContain("'revision'");
    expect(broadcastBody).not.toMatch(/guest|email|location|session|candidate|request|token|name/i);
  });

  it("does not alter Fourth Canal roles or the lab help queue", () => {
    expect(migration).not.toMatch(/alter table public\.profiles/i);
    expect(migration).not.toMatch(/alter table public\.lab_help_queue_entries/i);
  });

  it.each(["queue_staff_candidates", "queue_admin_promotion_requests"])("secures the new %s table from browser roles", (table) => {
    expect(staffPool).toContain(`alter table public.${table} enable row level security;`);
    expect(staffPool).toContain(`revoke all on table public.${table} from public, anon, authenticated;`);
    expect(staffPool).toContain(`create policy "Queue service role access" on public.${table}`);
  });

  it("disables email invitation claiming and creates no replacement email workflow", () => {
    expect(staffPool).toContain("QUEUE_EMAIL_INVITATIONS_DEPRECATED");
    expect(staffPool).not.toMatch(/insert into public\.queue_admin_invitations/i);
  });

  it("enforces unique pending requests, expiry, online candidates, and atomic acceptance", () => {
    expect(staffPool).toMatch(/queue_admin_promotion_requests_one_pending_idx[\s\S]*where status = 'pending'/);
    expect(staffPool).toContain("now() + interval '24 hours'");
    expect(staffPool).toContain("candidate.last_seen_at < now() - interval '45 seconds'");
    expect(staffPool).toMatch(/queue_request_admin_promotion[\s\S]*queue_staff_candidates[\s\S]*for update/);
    expect(staffPool).toMatch(/queue_respond_admin_promotion[\s\S]*insert into public\.queue_memberships[\s\S]*accepting_guests[\s\S]*false/);
  });

  it("indexes staff-pool ownership and foreign-key lookups", () => {
    expect(staffPool).toContain("queue_staff_candidates_lobby_presence_idx");
    expect(staffPool).toContain("queue_staff_candidates_profile_idx");
    expect(staffPool).toContain("queue_admin_promotion_requests_lobby_idx");
    expect(staffPool).toContain("queue_admin_promotion_requests_candidate_id_idx");
    expect(staffPool).toContain("queue_admin_promotion_requests_candidate_idx");
    expect(staffPool).toContain("queue_admin_promotion_requests_owner_idx");
  });

  it("keeps all staff pool functions service-only", () => {
    for (const signature of [
      "queue_join_staff_pool(uuid, uuid, text, text)",
      "queue_staff_candidate_heartbeat(uuid, uuid, uuid)",
      "queue_leave_staff_pool(uuid, uuid, uuid)",
      "queue_request_admin_promotion(uuid, uuid, uuid)",
      "queue_cancel_admin_promotion(uuid, uuid, uuid)",
      "queue_respond_admin_promotion(uuid, uuid, uuid, boolean, text)",
    ]) expect(staffPool).toContain(`revoke all on function public.${signature} from public, anon, authenticated;`);
  });

  it("enforces a concurrent-safe three-active-lobby limit", () => {
    expect(lifecycle).toContain("add column closed_at timestamptz");
    expect(lifecycle).toContain("pg_advisory_xact_lock");
    expect(lifecycle).toMatch(/where owner_profile_id = p_owner_profile_id[\s\S]*closed_at is null[\s\S]*>= 3/);
    expect(lifecycle).toContain("QUEUE_LOBBY_LIMIT");
  });

  it("blocks closed-lobby joins and requires active entries to clear before closing", () => {
    expect(lifecycle).toContain("QUEUE_LOBBY_CLOSED");
    expect(lifecycle).toContain("queue_entries_require_open_lobby");
    expect(lifecycle).toContain("queue_staff_candidates_require_open_lobby");
    expect(lifecycle).toContain("queue_admin_promotions_require_open_lobby");
    expect(lifecycle).toMatch(/status in \('waiting', 'called', 'helping'\)[\s\S]*QUEUE_ACTIVE_ENTRIES/);
  });

  it("keeps lifecycle mutations service-only and disables accepting on close", () => {
    expect(lifecycle).toContain("set accepting_guests = false");
    expect(lifecycle).toContain("revoke all on function public.queue_set_lobby_closed(uuid, uuid, boolean)");
    expect(lifecycle).toContain("grant execute on function public.queue_set_lobby_closed(uuid, uuid, boolean)");
    for (const signature of [
      "queue_call_entry_scoped(uuid, uuid, uuid)",
      "queue_transition_entry_scoped(uuid, uuid, text, text, uuid, uuid)",
      "queue_manage_waiting_entry_scoped(uuid, uuid, uuid, uuid, bigint)",
      "queue_remove_membership_scoped(uuid, uuid, uuid)",
    ]) {
      expect(lifecycle).toContain(`revoke all on function public.${signature}`);
      expect(lifecycle).toContain(`grant execute on function public.${signature}`);
    }
    expect(lifecycle).toContain("QUEUE_RESOURCE_LOBBY_MISMATCH");
  });
});
