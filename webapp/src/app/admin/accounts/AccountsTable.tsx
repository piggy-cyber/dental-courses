"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { setAccountStatus } from "@/app/admin/actions";
import { ACCESS_TIERS, tierLabel } from "@/lib/tiers";
import type { Account } from "./page";

const STATUS_STYLES: Record<Account["status"], string> = {
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  revoked: "border-rose-200 bg-rose-50 text-rose-700",
};

function AccountStatusControls({
  account,
  isSelf,
}: {
  account: Account;
  isSelf: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function update(status: Account["status"]) {
    setError(null);
    startTransition(async () => {
      try {
        await setAccountStatus(account.id, status);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Update failed");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <span
        className={`border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[account.status]}`}
      >
        {account.status}
      </span>
      {!isSelf && account.status !== "approved" && (
        <button
          type="button"
          onClick={() => update("approved")}
          disabled={isPending}
          className="portal-button-primary px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
        >
          Approve
        </button>
      )}
      {!isSelf && account.status === "approved" && (
        <button
          type="button"
          onClick={() => update("revoked")}
          disabled={isPending}
          className="border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 disabled:opacity-60"
        >
          Revoke
        </button>
      )}
      {error && <p className="basis-full text-right text-xs text-rose-600">{error}</p>}
    </div>
  );
}

export function AccountsTable({
  accounts,
  currentUserId,
}: {
  accounts: Account[];
  currentUserId: string;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | Account["status"]>("all");
  const [tier, setTier] = useState("all");
  const [cohort, setCohort] = useState("all");

  const cohorts = useMemo(
    () =>
      [...new Set(accounts.map((account) => account.roster?.cohort).filter(Boolean) as string[])]
        .sort((a, b) => a.localeCompare(b)),
    [accounts]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts.filter((account) => {
      const searchText = [
        account.name,
        account.email,
        account.username,
        account.roster?.full_name,
        account.roster?.cohort,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (q && !searchText.includes(q)) return false;
      if (status !== "all" && account.status !== status) return false;
      if (tier !== "all" && !account.access_tiers.includes(tier)) return false;
      if (cohort !== "all" && account.roster?.cohort !== cohort) return false;
      return true;
    });
  }, [accounts, cohort, query, status, tier]);

  return (
    <div className="space-y-4">
      <div className="portal-bar grid gap-3 p-4 md:grid-cols-[1fr_auto_auto_auto]">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, email, username..."
          className="app-input min-w-0 px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as "all" | Account["status"])}
          className="app-input px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="revoked">Revoked</option>
        </select>
        <select
          value={tier}
          onChange={(event) => setTier(event.target.value)}
          className="app-input px-3 py-2 text-sm"
        >
          <option value="all">All tiers</option>
          {ACCESS_TIERS.map((item) => (
            <option key={item} value={item}>
              {tierLabel(item)}
            </option>
          ))}
        </select>
        <select
          value={cohort}
          onChange={(event) => setCohort(event.target.value)}
          className="app-input px-3 py-2 text-sm"
        >
          <option value="all">All cohorts</option>
          {cohorts.map((item) => (
            <option key={item} value={item}>
              {item.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-brand-muted">
        {filtered.length} of {accounts.length} accounts
      </p>

      <div className="app-card overflow-x-auto">
        <table className="portal-table w-full min-w-[900px] text-sm">
          <thead>
            <tr>
              <th>Account</th>
              <th>Roster</th>
              <th>Tiers</th>
              <th>Joined</th>
              <th>Control</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((account) => (
              <tr key={account.id} className="align-top">
                <td>
                  <Link
                    href={`/admin/accounts/${account.id}`}
                    className="font-semibold text-brand-navy hover:underline"
                  >
                    {account.name ?? account.email}
                  </Link>
                  {account.id === currentUserId && (
                    <span className="ml-2 text-xs text-brand-muted">(you)</span>
                  )}
                  <p className="mt-0.5 text-xs text-brand-muted">{account.email}</p>
                  {account.username && (
                    <p className="mt-0.5 text-xs text-brand-muted">@{account.username}</p>
                  )}
                </td>
                <td>
                  {account.roster ? (
                    <>
                      <p className="font-medium text-brand-ink">{account.roster.full_name}</p>
                      <p className="text-xs text-brand-muted">
                        {account.roster.cohort.toUpperCase()} · {account.roster.status}
                      </p>
                    </>
                  ) : (
                    <span className="text-xs text-brand-muted">No roster match</span>
                  )}
                </td>
                <td>
                  {account.access_tiers.length ? (
                    <div className="flex flex-wrap gap-1">
                      {account.access_tiers.map((item) => (
                        <span
                          key={item}
                          className="border border-brand-line bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-navy"
                        >
                          {tierLabel(item)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-brand-muted">None</span>
                  )}
                </td>
                <td className="text-xs text-brand-muted">
                  {new Date(account.created_at).toLocaleDateString()}
                </td>
                <td>
                  <AccountStatusControls
                    account={account}
                    isSelf={account.id === currentUserId}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
