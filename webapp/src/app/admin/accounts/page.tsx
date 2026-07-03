import { createClient } from "@/lib/supabase/server";
import { requireAdminProfile } from "@/app/admin/actions";
import { AccountRow } from "./AccountRow";

export const dynamic = "force-dynamic";

export type Account = {
  id: string;
  email: string;
  name: string | null;
  role: "student" | "owner";
  status: "pending" | "approved" | "revoked";
  created_at: string;
  approved_at: string | null;
  access_note: string | null;
};

export default async function AdminAccountsPage() {
  const { userId } = await requireAdminProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, name, role, status, created_at, approved_at, access_note")
    .order("created_at", { ascending: false });

  const accounts = (data as Account[]) ?? [];
  const pending = accounts.filter((account) => account.status === "pending");
  const others = accounts.filter((account) => account.status !== "pending");

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-bold text-brand-navy">Accounts</h1>
        <p className="mt-1 text-brand-muted">
          Approve who can enter the library. New sign-ins land here as pending.
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-muted">
          Waiting for approval ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="rounded-xl border border-brand-line bg-brand-panel p-6 text-sm text-brand-muted">
            No pending requests.
          </p>
        ) : (
          <ul className="divide-y divide-brand-line overflow-hidden rounded-xl border border-brand-line bg-brand-panel">
            {pending.map((account) => (
              <AccountRow key={account.id} account={account} isSelf={account.id === userId} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-muted">
          All other accounts ({others.length})
        </h2>
        <ul className="divide-y divide-brand-line overflow-hidden rounded-xl border border-brand-line bg-brand-panel">
          {others.map((account) => (
            <AccountRow key={account.id} account={account} isSelf={account.id === userId} />
          ))}
        </ul>
      </section>
    </div>
  );
}
