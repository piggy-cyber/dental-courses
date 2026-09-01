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
    expect(broadcastBody).not.toMatch(/guest|email|location|session/i);
  });

  it("does not alter Fourth Canal roles or the lab help queue", () => {
    expect(migration).not.toMatch(/alter table public\.profiles/i);
    expect(migration).not.toMatch(/alter table public\.lab_help_queue_entries/i);
  });
});
