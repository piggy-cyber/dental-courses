"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { addRosterEntry, setRosterAccessApproval } from "@/app/admin/actions";
import { classLabel, cohortStandingLabel } from "@/lib/cohorts";
import type { RosterRow } from "./page";

function csvValue(value: string | null | undefined) {
  const text = value ?? "";
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function RosterTable({ rows }: { rows: RosterRow[] }) {
  const classYears = useMemo(
    () => [...new Set([2029, ...rows.map((row) => row.graduation_year)])].sort((a, b) => a - b),
    [rows]
  );
  const [activeGraduationYear, setActiveGraduationYear] = useState(2029);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [graduationYear, setGraduationYear] = useState(2029);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visibleRows = useMemo(
    () => rows.filter((row) => row.graduation_year === activeGraduationYear),
    [activeGraduationYear, rows]
  );

  const allowedCount = visibleRows.filter((row) => row.access_approved).length;
  const unlinkedCount = visibleRows.filter((row) => !row.profile_id).length;

  function submit() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        await addRosterEntry({ fullName, email, graduationYear });
        setFullName("");
        setEmail("");
        setMessage("Roster row added.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Add failed");
      }
    });
  }

  function updateAccess(row: RosterRow, allowed: boolean) {
    if (
      !allowed &&
      !window.confirm(
        `Remove student access for ${row.full_name}? A linked account will be revoked and its manual collection grants removed.`
      )
    ) {
      return;
    }
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        await setRosterAccessApproval(row.id, allowed);
        setMessage(
          allowed
            ? `${row.full_name} is now allowed to link a Google account.`
            : `${row.full_name}'s student access was removed.`
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Access update failed");
      }
    });
  }

  function exportCsv() {
    const lines = [
      "full_name,email,graduation_year,access_approved,status,profile_email",
      ...visibleRows.map((row) =>
        [
          csvValue(row.full_name),
          csvValue(row.email),
          row.graduation_year,
          row.access_approved ? "true" : "false",
          csvValue(row.status),
          csvValue(row.profile?.email),
        ].join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `class-of-${activeGraduationYear}-roster.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex border border-brand-line bg-brand-panel">
          {classYears.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => {
                setActiveGraduationYear(year);
                setGraduationYear(year);
              }}
              className={`border-r border-brand-line px-4 py-1.5 text-sm font-semibold last:border-r-0 ${
                activeGraduationYear === year
                  ? "bg-brand-navy text-white"
                  : "text-brand-muted hover:text-brand-navy"
              }`}
            >
              {classLabel(year)}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="portal-button px-4 py-2 text-sm"
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
            className="app-input px-3 py-2 text-sm"
          />
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Personal Gmail optional"
            type="email"
            className="app-input px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={2000}
            max={2200}
            value={graduationYear}
            onChange={(event) => setGraduationYear(Number(event.target.value))}
            className="app-input px-3 py-2 text-sm"
            aria-label="Graduating class year"
          />
          <button
            type="button"
            onClick={submit}
            disabled={isPending}
            className="portal-button-primary px-5 py-2 text-sm disabled:opacity-60"
          >
            Add
          </button>
        </div>
        {message && <p className="mt-2 text-sm text-emerald-700">{message}</p>}
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      </section>

      <div className="flex flex-wrap items-center gap-3 text-sm text-brand-muted">
        <span>{visibleRows.length} roster rows</span>
        <span>{allowedCount} allowed</span>
        <span>{unlinkedCount} waiting for Google accounts</span>
      </div>

      <div className="app-card overflow-x-auto">
        <table className="portal-table w-full min-w-[900px] text-sm">
          <thead>
            <tr>
              <th>Student</th>
              <th>Class / standing</th>
              <th>Student access</th>
              <th>Google account</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const waiting = row.access_approved && !row.profile_id;
              return (
                <tr key={row.id} className={waiting ? "bg-amber-50/70" : undefined}>
                  <td>
                    <p className="font-medium text-brand-ink">{row.full_name}</p>
                    <p className="text-xs text-brand-muted">{row.email ?? "No email on roster"}</p>
                  </td>
                  <td>
                    <p className="font-medium text-brand-ink">
                      {cohortStandingLabel(row.graduation_year)}
                    </p>
                    <p className="text-xs text-brand-muted">Permanent class label</p>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => updateAccess(row, !row.access_approved)}
                      disabled={isPending}
                      className={
                        row.access_approved
                          ? "border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 disabled:opacity-50"
                          : "portal-button px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                      }
                    >
                      {row.access_approved ? "Allowed · Remove" : "Allow access"}
                    </button>
                    <p className="mt-1 text-xs text-brand-muted">
                      {row.access_approved
                        ? "May be linked and approved"
                        : "Cannot enter the library"}
                    </p>
                  </td>
                  <td>
                    {row.profile ? (
                      <>
                        <Link
                          href={`/admin/accounts/${row.profile.id}`}
                          className="font-medium text-brand-blue hover:underline"
                        >
                          {row.profile.name ?? row.profile.email}
                        </Link>
                        <p className="text-xs text-brand-muted">{row.profile.email}</p>
                      </>
                    ) : (
                      <span className="text-brand-muted">
                        {row.access_approved ? "Waiting to be linked" : "Not linked"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-brand-muted">
                  No roster rows for {classLabel(activeGraduationYear)}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
