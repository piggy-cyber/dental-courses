"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { setAccountStatus } from "@/app/admin/actions";
import { classLabel, cohortStandingLabel } from "@/lib/cohorts";
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
  const canApprove =
    account.roster?.access_approved === true &&
    account.roster.status !== "withdrawn" &&
    account.roster.email?.toLowerCase() === account.email.toLowerCase();

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
          disabled={isPending || !canApprove}
          title={canApprove ? "Approve student" : "Allowed roster link required"}
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
      <Link
        href={`/admin/accounts/${account.id}`}
        className="portal-button px-3 py-1.5 text-xs font-semibold"
      >
        Manage account
      </Link>
      {!canApprove && account.status !== "approved" && (
        <p className="basis-full text-right text-xs text-amber-800">
          Link an allowed roster student first
        </p>
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
  const [graduationYear, setGraduationYear] = useState("all");

  const graduationYears = useMemo(
    () =>
      [
        ...new Set(
          accounts
            .map((account) => account.roster?.graduation_year)
            .filter((year): year is number => Boolean(year))
        ),
      ].sort((a, b) => a - b),
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
        account.roster?.graduation_year,
        account.council_title,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (q && !searchText.includes(q)) return false;
      if (status !== "all" && account.status !== status) return false;
      if (
        graduationYear !== "all" &&
        account.roster?.graduation_year !== Number(graduationYear)
      ) {
        return false;
      }
      return true;
    });
  }, [accounts, graduationYear, query, status]);

  return (
    <div className="space-y-4">
      <div className="portal-bar grid gap-3 p-4 md:grid-cols-[1fr_auto_auto]">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, email, class, or council role..."
          className="app-input min-w-0 px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as "all" | Account["status"])}
          className="app-input px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="pending">Public only</option>
          <option value="approved">Workspace access</option>
          <option value="revoked">Workspace revoked</option>
        </select>
        <select
          value={graduationYear}
          onChange={(event) => setGraduationYear(event.target.value)}
          className="app-input px-3 py-2 text-sm"
        >
          <option value="all">All classes</option>
          {graduationYears.map((year) => (
            <option key={year} value={year}>
              {classLabel(year)}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-brand-muted">
        {filtered.length} of {accounts.length} accounts
      </p>

      <div className="app-card overflow-x-auto">
        <table className="portal-table w-full min-w-[1050px] text-sm">
          <thead>
            <tr>
              <th>Account</th>
              <th>Class / standing</th>
              <th>Council role</th>
              <th>Library access</th>
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
                  <p className="mt-0.5 text-xs text-brand-muted">
                    Joined {new Date(account.created_at).toLocaleDateString()}
                  </p>
                </td>
                <td>
                  {account.roster ? (
                    <>
                      <p className="font-medium text-brand-ink">
                        {cohortStandingLabel(account.roster.graduation_year)}
                      </p>
                      <p className="text-xs text-brand-muted">{account.roster.full_name}</p>
                    </>
                  ) : (
                    <span className="text-xs text-brand-muted">No roster link</span>
                  )}
                </td>
                <td>
                  <p className="font-medium text-brand-ink">
                    {account.council_title ??
                      (account.role === "owner" ? "Full administrator" : "Student")}
                  </p>
                  {account.admin_permissions.length > 0 && (
                    <p className="text-xs text-brand-muted">
                      {account.admin_permissions.length} delegated responsibilities
                    </p>
                  )}
                </td>
                <td>
                  {account.libraryCollections.length ? (
                    <div className="flex max-w-sm flex-wrap gap-1">
                      {account.libraryCollections.map((collection) => (
                        <span
                          key={collection.id}
                          className="border border-brand-line bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-navy"
                        >
                          {collection.short_label}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-brand-muted">None</span>
                  )}
                </td>
                <td>
                  <AccountStatusControls
                    account={account}
                    isSelf={account.id === currentUserId}
                  />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-brand-muted">
                  No accounts match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
