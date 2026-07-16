import { createClient } from "@/lib/supabase/server";
import { requireAdminProfile } from "@/app/admin/actions";
import { hasCumulativeCollectionAccess } from "@/lib/cohorts";
import { AccountsTable } from "./AccountsTable";

export const dynamic = "force-dynamic";

export type AccountRoster = {
  id: string;
  full_name: string;
  email: string | null;
  cohort: string;
  graduation_year: number;
  status: "expected" | "signed_in" | "withdrawn";
  access_approved: boolean;
  profile_id: string | null;
};

export type AccountCollection = {
  id: string;
  label: string;
  short_label: string;
  graduation_year: number | null;
  curriculum_year: number | null;
  academic_year_start: number | null;
  cumulative_access: boolean;
  is_active: boolean;
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
  roster_id: string | null;
  council_title: string | null;
  admin_permissions: string[];
  roster: AccountRoster | null;
  libraryCollections: AccountCollection[];
};

export default async function AdminAccountsPage() {
  const { userId } = await requireAdminProfile("accounts.manage");
  const supabase = await createClient();
  const [{ data: profileRows }, { data: rosterRows }, { data: collectionRows }, { data: grantRows }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, email, name, username, role, status, created_at, approved_at, access_note, roster_id, council_title, admin_permissions"
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("student_roster")
        .select(
          "id, full_name, email, cohort, graduation_year, status, access_approved, profile_id"
        )
        .order("graduation_year")
        .order("full_name"),
      supabase
        .from("resource_collections")
        .select(
          "id, label, short_label, graduation_year, curriculum_year, academic_year_start, cumulative_access, is_active"
        )
        .order("sort_order")
        .order("label"),
      supabase.from("profile_resource_collection_grants").select("profile_id, collection_id"),
    ]);

  const rosterById = new Map((rosterRows as AccountRoster[] | null)?.map((row) => [row.id, row]));
  const rosterByProfile = new Map(
    (rosterRows as AccountRoster[] | null)
      ?.filter((row) => row.profile_id)
      .map((row) => [row.profile_id!, row])
  );
  const collections = (collectionRows as AccountCollection[] | null) ?? [];
  const collectionById = new Map(collections.map((collection) => [collection.id, collection]));
  const manualGrantsByProfile = new Map<string, Set<string>>();

  for (const grant of
    ((grantRows as { profile_id: string; collection_id: string }[] | null) ?? [])) {
    if (!manualGrantsByProfile.has(grant.profile_id)) {
      manualGrantsByProfile.set(grant.profile_id, new Set());
    }
    manualGrantsByProfile.get(grant.profile_id)!.add(grant.collection_id);
  }

  const accounts =
    (profileRows as Omit<Account, "roster" | "libraryCollections">[] | null)?.map((account) => ({
      ...account,
      admin_permissions: account.admin_permissions ?? [],
      roster:
        (account.roster_id ? rosterById.get(account.roster_id) : null) ??
        rosterByProfile.get(account.id) ??
        null,
      libraryCollections: [] as AccountCollection[],
    })) ?? [];

  for (const account of accounts) {
    const accessible = new Map<string, AccountCollection>();
    if (
      account.status === "approved" &&
      account.roster?.access_approved &&
      account.roster.status !== "withdrawn"
    ) {
      for (const collection of collections) {
        if (hasCumulativeCollectionAccess(account.roster.graduation_year, collection)) {
          accessible.set(collection.id, collection);
        }
      }
    }

    if (account.status === "approved") {
      for (const collectionId of manualGrantsByProfile.get(account.id) ?? []) {
        const collection = collectionById.get(collectionId);
        if (collection) accessible.set(collection.id, collection);
      }
    }

    account.libraryCollections = [...accessible.values()];
  }

  return (
    <div className="space-y-8">
      <header className="app-card p-6">
        <p className="eyebrow text-brand-gold">Admin</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-brand-navy">
          Accounts
        </h1>
        <p className="mt-2 text-brand-muted">
          Permanent class labels determine cumulative student resources. Council roles are shown
          separately so academic responsibilities never change a student&apos;s class access.
        </p>
      </header>

      <AccountsTable accounts={accounts} currentUserId={userId} />
    </div>
  );
}
