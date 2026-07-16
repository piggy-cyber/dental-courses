import { createClient } from "@/lib/supabase/server";
import { requireAdminProfile } from "@/app/admin/actions";
import { AccountsTable } from "./AccountsTable";

export const dynamic = "force-dynamic";

export type AccountRoster = {
  id: string;
  full_name: string;
  email: string | null;
  cohort: string;
  status: "expected" | "signed_in" | "withdrawn";
  profile_id: string | null;
};

export type Account = {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  role: "student" | "owner";
  status: "pending" | "approved" | "revoked";
  created_at: string;
  approved_at: string | null;
  access_note: string | null;
  access_tiers: string[];
  roster_id: string | null;
  roster: AccountRoster | null;
};

export default async function AdminAccountsPage() {
  const { userId } = await requireAdminProfile("accounts.manage");
  const supabase = await createClient();
  const [{ data: profileRows }, { data: rosterRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, email, name, username, role, status, created_at, approved_at, access_note, access_tiers, roster_id"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("student_roster")
      .select("id, full_name, email, cohort, status, profile_id")
      .order("cohort")
      .order("full_name"),
  ]);

  const rosterById = new Map((rosterRows as AccountRoster[] | null)?.map((row) => [row.id, row]));
  const rosterByProfile = new Map(
    (rosterRows as AccountRoster[] | null)
      ?.filter((row) => row.profile_id)
      .map((row) => [row.profile_id!, row])
  );
  const accounts =
    (profileRows as Omit<Account, "roster">[] | null)?.map((account) => ({
      ...account,
      access_tiers: account.access_tiers ?? [],
      roster:
        (account.roster_id ? rosterById.get(account.roster_id) : null) ??
        rosterByProfile.get(account.id) ??
        null,
    })) ?? [];

  return (
    <div className="space-y-8">
      <header className="app-card p-6">
        <p className="eyebrow text-brand-gold">Admin</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-brand-navy">
          Accounts
        </h1>
        <p className="mt-2 text-brand-muted">
          Approve roster-matched students, then use Manage access to choose D1/D2 labels and
          the exact course collections they can open.
        </p>
      </header>

      <AccountsTable accounts={accounts} currentUserId={userId} />
    </div>
  );
}
