"use client";

import { useState, useTransition } from "react";
import { demoteAdmin, promoteToAdmin } from "@/app/admin/actions";
import { adminLabel } from "@/lib/roles";
import type { TeamMember } from "./page";

export function TeamRow({
  member,
  isSelf,
}: {
  member: TeamMember;
  isSelf: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function promote() {
    setError(null);
    startTransition(async () => {
      try {
        await promoteToAdmin(member.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Update failed");
      }
    });
  }

  function demote() {
    setError(null);
    startTransition(async () => {
      try {
        await demoteAdmin(member.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Update failed");
      }
    });
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-brand-ink">
          {member.name ?? member.email}
          <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-navy">
            {adminLabel(member.role)}
          </span>
          {isSelf && <span className="ml-2 text-xs text-brand-muted">(you)</span>}
        </p>
        <p className="text-xs text-brand-muted">{member.email}</p>
        {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
      </div>
      {!isSelf && (
        <div>
          {member.role === "student" ? (
            <button
              onClick={promote}
              disabled={isPending || member.status !== "approved"}
              className="rounded-full bg-brand-navy px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              Make admin
            </button>
          ) : (
            <button
              onClick={demote}
              disabled={isPending}
              className="rounded-full border border-rose-200 px-4 py-1.5 text-xs font-semibold text-rose-600 disabled:opacity-60"
            >
              Remove admin
            </button>
          )}
        </div>
      )}
    </li>
  );
}
