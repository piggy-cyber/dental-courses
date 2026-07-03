import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/access";
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
};

export default async function OwnerPage() {
  const { profile } = await getSessionProfile();
  if (!profile || profile.role !== "owner") redirect("/library");

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, name, role, status, created_at, approved_at")
    .order("created_at", { ascending: false });

  const accounts = (data as Account[]) ?? [];
  const pending = accounts.filter((account) => account.status === "pending");
  const others = accounts.filter((account) => account.status !== "pending");

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-bold">Account management</h1>
        <p className="mt-1 text-slate-500">
          Approve who can enter the library. New sign-ins land here as pending.
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Waiting for approval ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            No pending requests.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {pending.map((account) => (
              <AccountRow key={account.id} account={account} isSelf={account.id === profile.id} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
          All accounts ({others.length})
        </h2>
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {others.map((account) => (
            <AccountRow key={account.id} account={account} isSelf={account.id === profile.id} />
          ))}
        </ul>
      </section>
    </div>
  );
}
