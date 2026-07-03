import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminProfile } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/server";
import { AccountDetailForm } from "./AccountDetailForm";

export const dynamic = "force-dynamic";

export type AccountDetail = {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  bio: string | null;
  role: "student" | "owner";
  status: "pending" | "approved" | "revoked";
  created_at: string;
  approved_at: string | null;
  access_note: string | null;
  access_tiers: string[];
  admin_note: string | null;
  roster_id: string | null;
  roster_match: boolean;
};

export type RosterMatch = {
  id: string;
  full_name: string;
  email: string | null;
  cohort: string;
  status: "expected" | "signed_in" | "withdrawn";
  profile_id: string | null;
};

export default async function AdminAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await requireAdminProfile();
  const supabase = await createClient();

  const { data: accountRow } = await supabase
    .from("profiles")
    .select(
      "id, email, name, username, bio, role, status, created_at, approved_at, access_note, access_tiers, admin_note, roster_id, roster_match"
    )
    .eq("id", id)
    .maybeSingle();

  if (!accountRow) notFound();

  const account = {
    ...(accountRow as AccountDetail),
    access_tiers: (accountRow as AccountDetail).access_tiers ?? [],
  };

  let roster: RosterMatch | null = null;
  if (account.roster_id) {
    const { data } = await supabase
      .from("student_roster")
      .select("id, full_name, email, cohort, status, profile_id")
      .eq("id", account.roster_id)
      .maybeSingle();
    roster = (data as RosterMatch | null) ?? null;
  }

  if (!roster) {
    const { data } = await supabase
      .from("student_roster")
      .select("id, full_name, email, cohort, status, profile_id")
      .eq("profile_id", account.id)
      .maybeSingle();
    roster = (data as RosterMatch | null) ?? null;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/accounts" className="text-sm text-brand-blue hover:underline">
            Back to accounts
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-brand-navy">
            {account.name ?? account.email}
          </h1>
          <p className="mt-1 text-brand-muted">{account.email}</p>
        </div>
        <Link
          href="/admin/roster"
          className="rounded-full border border-brand-line px-4 py-2 text-sm font-semibold text-brand-navy hover:bg-brand-soft"
        >
          Open roster
        </Link>
      </header>

      <AccountDetailForm account={account} roster={roster} isSelf={account.id === userId} />
    </div>
  );
}
