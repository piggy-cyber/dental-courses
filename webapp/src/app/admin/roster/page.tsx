import { requireAdminProfile } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/server";
import { RosterTable } from "./RosterTable";

export const dynamic = "force-dynamic";

export type RosterProfile = {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  status: "pending" | "approved" | "revoked";
};

export type RosterRow = {
  id: string;
  full_name: string;
  email: string | null;
  cohort: string;
  graduation_year: number;
  status: "expected" | "signed_in" | "withdrawn";
  access_approved: boolean;
  access_approved_at: string | null;
  profile_id: string | null;
  profile: RosterProfile | null;
};

export default async function AdminRosterPage() {
  await requireAdminProfile("roster.manage");
  const supabase = await createClient();
  const { data: rosterRows } = await supabase
    .from("student_roster")
    .select(
      "id, full_name, email, cohort, graduation_year, status, access_approved, access_approved_at, profile_id"
    )
    .order("graduation_year")
    .order("full_name");

  const profileIds = [
    ...new Set(((rosterRows as RosterRow[] | null) ?? []).map((row) => row.profile_id).filter(Boolean)),
  ] as string[];

  const { data: profileRows } = profileIds.length
    ? await supabase
        .from("profiles")
        .select("id, email, name, username, status")
        .in("id", profileIds)
    : { data: [] };

  const profilesById = new Map(
    (profileRows as RosterProfile[] | null)?.map((profile) => [profile.id, profile])
  );

  const rows =
    ((rosterRows as Omit<RosterRow, "profile">[] | null) ?? []).map((row) => ({
      ...row,
      profile: row.profile_id ? profilesById.get(row.profile_id) ?? null : null,
    }));

  return (
    <div className="space-y-8">
      <header className="app-card p-6">
        <p className="eyebrow text-brand-gold">Admin</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-brand-navy">
          Roster
        </h1>
        <p className="mt-2 text-brand-muted">
          Prebuild each graduating class, decide who is allowed to join, then link the correct
          Google account when that student signs in.
        </p>
      </header>

      <RosterTable rows={rows} />
    </div>
  );
}
