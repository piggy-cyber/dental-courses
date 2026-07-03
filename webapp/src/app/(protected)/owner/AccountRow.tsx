"use client";

import { useState, useTransition } from "react";
import { setAccountStatus } from "./actions";
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
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-800">
          {account.name ?? account.email}
          {account.role === "owner" && (
            <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
              Owner
            </span>
          )}
          {isSelf && <span className="ml-2 text-xs text-slate-400">(you)</span>}
        </p>
        <p className="truncate text-xs text-slate-400">
          {account.email} &middot; joined{" "}
          {new Date(account.created_at).toLocaleDateString()}
        </p>
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[account.status]}`}
        >
          {account.status}
        </span>
        {!isSelf && (
          <>
            {account.status !== "approved" && (
              <button
                onClick={() => update("approved")}
                disabled={isPending}
                className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                Approve
              </button>
            )}
            {account.status === "approved" && (
              <button
                onClick={() => update("revoked")}
                disabled={isPending}
                className="rounded-full border border-rose-200 px-4 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
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
