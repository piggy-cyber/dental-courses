import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminProfile } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasCumulativeCollectionAccess } from "@/lib/cohorts";
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
  admin_note: string | null;
  roster_id: string | null;
  roster_match: boolean;
  council_title: string | null;
};

export type RosterMatch = {
  id: string;
  full_name: string;
  email: string | null;
  cohort: string;
  graduation_year: number;
  status: "expected" | "signed_in" | "withdrawn";
  access_approved: boolean;
  profile_id: string | null;
};

export type AdminResourceCollection = {
  id: string;
  label: string;
  short_label: string;
  description: string | null;
  source_tier: string | null;
  source_cohort: string | null;
  graduation_year: number | null;
  curriculum_year: number | null;
  academic_year_start: number | null;
  cumulative_access: boolean;
  is_active: boolean;
  sort_order: number;
};

type AccountActivityEntry = {
  event_id: number;
  severity: "info" | "attention" | "urgent";
  event_type: string;
  event_created_at: string;
  delivery_status: "pending" | "delivered" | "failed" | "disabled";
  delivery_attempts: number;
  delivery_error: string | null;
};

const DELIVERY_LABELS: Record<AccountActivityEntry["delivery_status"], string> = {
  pending: "Pending",
  delivered: "Delivered",
  failed: "Failed",
  disabled: "Disabled",
};

export default async function AdminAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await requireAdminProfile("accounts.manage");
  const supabase = await createClient();

  const { data: accountRow } = await supabase
    .from("profiles")
    .select(
      "id, email, name, username, bio, role, status, created_at, approved_at, access_note, admin_note, roster_id, roster_match, council_title"
    )
    .eq("id", id)
    .maybeSingle();

  if (!accountRow) notFound();
  const account = accountRow as AccountDetail;

  const [{ data: rosterRows }, { data: collections }, { data: grantRows }, { data: activityRows }] = await Promise.all([
    supabase
      .from("student_roster")
      .select(
        "id, full_name, email, cohort, graduation_year, status, access_approved, profile_id"
      )
      .neq("status", "withdrawn")
      .order("graduation_year")
      .order("full_name"),
    supabase
      .from("resource_collections")
      .select(
        "id, label, short_label, description, source_tier, source_cohort, graduation_year, curriculum_year, academic_year_start, cumulative_access, is_active, sort_order"
      )
      .order("sort_order")
      .order("label"),
    supabase
      .from("profile_resource_collection_grants")
      .select("collection_id")
      .eq("profile_id", account.id),
    createAdminClient().rpc("get_profile_communications_history", {
      p_profile_id: account.id,
      p_limit: 30,
    }),
  ]);

  const allRosterRows = (rosterRows as RosterMatch[] | null) ?? [];
  const roster =
    allRosterRows.find((row) => row.id === account.roster_id || row.profile_id === account.id) ??
    null;
  const rosterOptions = allRosterRows.filter(
    (row) => row.access_approved && (row.profile_id === null || row.profile_id === account.id)
  );
  const collectionList = (collections as AdminResourceCollection[] | null) ?? [];
  const automaticCollectionIds = roster?.access_approved
    ? collectionList
        .filter((collection) => hasCumulativeCollectionAccess(roster.graduation_year, collection))
        .map((collection) => collection.id)
    : [];
  const automaticSet = new Set(automaticCollectionIds);
  const manualGrantedCollectionIds =
    ((grantRows as { collection_id: string }[] | null) ?? [])
      .map((row) => row.collection_id)
      .filter((collectionId) => !automaticSet.has(collectionId));

  return (
    <div className="space-y-6">
      <header className="app-card flex flex-wrap items-start justify-between gap-3 p-6">
        <div>
          <Link href="/admin/accounts" className="text-sm text-brand-blue hover:underline">
            Back to accounts
          </Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-navy">
            {account.name ?? account.email}
          </h1>
          <p className="mt-1 text-brand-muted">{account.email}</p>
        </div>
        <Link href="/admin/roster" className="portal-button px-4 py-2 text-sm">
          Open roster
        </Link>
      </header>

      <AccountDetailForm
        account={account}
        roster={roster}
        rosterOptions={rosterOptions}
        isSelf={account.id === userId}
        collections={collectionList}
        automaticCollectionIds={automaticCollectionIds}
        manualGrantedCollectionIds={manualGrantedCollectionIds}
      />

      <section className="app-card overflow-hidden">
        <div className="portal-bar border-0 border-b border-brand-line px-4 py-3">
          <h2 className="text-sm font-bold uppercase text-brand-navy">Private access history</h2>
        </div>
        {(activityRows as AccountActivityEntry[] | null)?.length ? (
          <ul className="divide-y divide-brand-line">
            {(activityRows as AccountActivityEntry[]).map((entry) => (
              <li key={`${entry.event_id}-${entry.delivery_status}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-brand-navy">
                    {entry.event_type.replace(/^access\./, "").replaceAll("_", " ")}
                  </p>
                  <p className="mt-0.5 text-xs text-brand-muted">
                    {new Date(entry.event_created_at).toLocaleString()} · Slack {DELIVERY_LABELS[entry.delivery_status]}
                    {entry.delivery_attempts > 0 ? ` · ${entry.delivery_attempts} attempt${entry.delivery_attempts === 1 ? "" : "s"}` : ""}
                  </p>
                </div>
                {entry.delivery_error && (
                  <span className="text-xs text-amber-700">{entry.delivery_error}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-5 text-sm text-brand-muted">
            New sign-in and access changes will appear here.
          </p>
        )}
      </section>
    </div>
  );
}
