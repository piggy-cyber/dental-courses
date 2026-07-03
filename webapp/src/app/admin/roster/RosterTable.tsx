"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { addRosterEntry } from "@/app/admin/actions";
import { ACCESS_TIERS, cohortToTier, tierLabel, type AccessTier } from "@/lib/tiers";
import type { RosterRow } from "./page";

const COHORT_OPTIONS = ["d1-2025", "d2-2026", "d3-2027", "d4-2028"];

function csvValue(value: string | null | undefined) {
  const text = value ?? "";
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function RosterTable({ rows }: { rows: RosterRow[] }) {
  const [activeTier, setActiveTier] = useState<AccessTier>("d1");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [cohort, setCohort] = useState("d1-2025");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visibleRows = useMemo(
    () => rows.filter((row) => cohortToTier(row.cohort) === activeTier),
    [activeTier, rows]
  );

  const unsignedCount = visibleRows.filter(
    (row) => row.status === "expected" && !row.profile_id
  ).length;

  function switchTier(tier: AccessTier) {
    setActiveTier(tier);
    const firstCohort = COHORT_OPTIONS.find((item) => item.startsWith(tier));
    if (firstCohort) setCohort(firstCohort);
  }

  function submit() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        await addRosterEntry({ fullName, email, cohort });
        setFullName("");
        setEmail("");
        setMessage("Roster row added.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Add failed");
      }
    });
  }

  function exportCsv() {
    const lines = [
      "full_name,email,cohort,status,profile_email",
      ...visibleRows.map((row) =>
        [
          csvValue(row.full_name),
          csvValue(row.email),
          csvValue(row.cohort),
          csvValue(row.status),
          csvValue(row.profile?.email),
        ].join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeTier}-roster.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-brand-line bg-brand-panel p-1 shadow-sm">
          {ACCESS_TIERS.map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => switchTier(tier)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                activeTier === tier
                  ? "bg-brand-navy text-white"
                  : "text-brand-muted hover:text-brand-navy"
              }`}
            >
              {tierLabel(tier)}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="rounded-full border border-brand-line bg-white/70 px-4 py-2 text-sm font-semibold text-brand-navy hover:border-brand-blue hover:bg-white"
        >
          Export CSV
        </button>
      </div>

      <section className="app-card p-4">
        <h2 className="font-semibold text-brand-navy">Add roster row</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Full name"
            className="app-input rounded-xl px-3 py-2 text-sm"
          />
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Personal Gmail optional"
            type="email"
            className="app-input rounded-xl px-3 py-2 text-sm"
          />
          <select
            value={cohort}
            onChange={(event) => setCohort(event.target.value)}
            className="app-input rounded-xl px-3 py-2 text-sm"
          >
            {COHORT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option.toUpperCase()}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={submit}
            disabled={isPending}
            className="rounded-full bg-brand-navy px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Add
          </button>
        </div>
        {message && <p className="mt-2 text-sm text-emerald-700">{message}</p>}
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      </section>

      <div className="flex flex-wrap items-center gap-3 text-sm text-brand-muted">
        <span>{visibleRows.length} roster rows</span>
        <span>{unsignedCount} not signed in</span>
      </div>

      <div className="app-card overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-brand-line bg-brand-soft text-xs uppercase tracking-wide text-brand-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Student</th>
              <th className="px-4 py-3 font-semibold">Cohort</th>
              <th className="px-4 py-3 font-semibold">Roster status</th>
              <th className="px-4 py-3 font-semibold">Linked profile</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-line">
            {visibleRows.map((row) => {
              const unsigned = row.status === "expected" && !row.profile_id;
              return (
                <tr key={row.id} className={unsigned ? "bg-amber-50/70" : undefined}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-brand-ink">{row.full_name}</p>
                    <p className="text-xs text-brand-muted">{row.email ?? "No email on roster"}</p>
                  </td>
                  <td className="px-4 py-3">{row.cohort.toUpperCase()}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        unsigned
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {unsigned ? "not signed in" : row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {row.profile ? (
                      <Link
                        href={`/admin/accounts/${row.profile.id}`}
                        className="font-medium text-brand-blue hover:underline"
                      >
                        {row.profile.name ?? row.profile.email}
                      </Link>
                    ) : (
                      <span className="text-brand-muted">None</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-brand-muted">
                  No roster rows for {tierLabel(activeTier)}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
