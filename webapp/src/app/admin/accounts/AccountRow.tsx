"use client";

import { useState, useTransition } from "react";
import { setAccountStatus } from "@/app/admin/actions";
import { adminLabel } from "@/lib/roles";
import type { Account } from "./page";

const STATUS_STYLES: Record<Account["status"], string> = {
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  revoked: "bg-rose-50 text-rose-700 border-rose-200",
};

export function AccountRow({
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
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-brand-ink">
          {account.name ?? account.email}
          {account.role === "owner" && (
            <span className="ml-2 border border-brand-line bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-navy">
              {adminLabel(account.role)}
            </span>
          )}
          {isSelf && <span className="ml-2 text-xs text-brand-muted">(you)</span>}
        </p>
        <p className="truncate text-xs text-brand-muted">
          {account.email} · joined {new Date(account.created_at).toLocaleDateString()}
        </p>
        {account.access_note && (
          <p className="mt-2 border border-brand-line bg-brand-soft px-3 py-2 text-xs text-brand-ink">
            <span className="font-semibold">Request: </span>
            {account.access_note}
          </p>
        )}
        {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[account.status]}`}
        >
          {account.status}
        </span>
        {!isSelf && (
          <>
            {account.status !== "approved" && (
              <button
                onClick={() => update("approved")}
                disabled={isPending}
                className="portal-button-primary px-4 py-1.5 text-xs font-semibold disabled:opacity-60"
              >
                Approve
              </button>
            )}
            {account.status === "approved" && (
              <button
                onClick={() => update("revoked")}
                disabled={isPending}
                className="border border-rose-200 px-4 py-1.5 text-xs font-semibold text-rose-600 disabled:opacity-60"
              >
                Revoke
              </button>
            )}
          </>
        )}
      </div>
    </li>
  );
}
