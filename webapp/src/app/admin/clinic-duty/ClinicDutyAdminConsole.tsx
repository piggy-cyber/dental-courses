"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type { ClinicDutyAdmin } from "@/lib/clinic-duty";
import {
  overrideClinicDutySlot,
  publishClinicDutyTerm,
  reopenClinicDutySubmission,
  setClinicDutyDateClosed,
  updateClinicDutyDateHours,
  waiveClinicDutyPhoto,
} from "@/app/(protected)/clinic-duty/actions";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

function localInput(iso: string) {
  const date = new Date(iso);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

type AdminDate = ClinicDutyAdmin["dates"][number];

function DateControls({
  date,
  roster,
  pending,
  run,
}: {
  date: AdminDate;
  roster: ClinicDutyAdmin["workload"];
  pending: boolean;
  run: (operation: () => Promise<void>, success: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [opensAt, setOpensAt] = useState(localInput(date.opensAt));
  const [closesAt, setClosesAt] = useState(localInput(date.closesAt));
  const eligibleRoster = roster.filter((student) => student.status !== "withdrawn");
  const reasonReady = reason.trim().length >= 3;

  return (
    <div className="clinic-duty-admin-controls">
      <label className="col-span-full">
        Logged reason
        <input className="app-input" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Required for every coordinator change" />
      </label>
      <div className="clinic-duty-admin-action">
        <b>Calendar status</b>
        <button
          type="button"
          className="portal-button px-3 py-2 text-xs font-semibold"
          disabled={pending || !reasonReady}
          onClick={() => run(
            () => setClinicDutyDateClosed({ dutyDateId: date.id, dutyDate: date.date, closed: date.status === "open", reason }),
            date.status === "open" ? "Date closed and open exchanges cancelled." : "Date reopened."
          )}
        >
          {date.status === "open" ? "Close date" : "Reopen date"}
        </button>
      </div>
      <div className="clinic-duty-admin-action">
        <b>Photo requirement</b>
        <button
          type="button"
          className="portal-button px-3 py-2 text-xs font-semibold"
          disabled={pending || !reasonReady}
          onClick={() => run(
            () => waiveClinicDutyPhoto({ dutyDateId: date.id, dutyDate: date.date, waived: !date.photoWaived, reason }),
            date.photoWaived ? "Photo waiver removed." : "Photo requirement waived with an audit reason."
          )}
        >
          {date.photoWaived ? "Remove waiver" : "Waive photo"}
        </button>
      </div>
      {date.submissionStatus === "completed" && (
        <div className="clinic-duty-admin-action">
          <b>Completion record</b>
          <button
            type="button"
            className="portal-button px-3 py-2 text-xs font-semibold"
            disabled={pending || !reasonReady}
            onClick={() => run(
              () => reopenClinicDutySubmission({ dutyDateId: date.id, dutyDate: date.date, reason }),
              "Completion reopened. The assigned pair can edit and resubmit."
            )}
          >
            Reopen submission
          </button>
        </div>
      )}
      <div className="clinic-duty-admin-hours">
        <label>Opens<input type="datetime-local" className="app-input" value={opensAt} onChange={(event) => setOpensAt(event.target.value)} /></label>
        <label>Closes<input type="datetime-local" className="app-input" value={closesAt} onChange={(event) => setClosesAt(event.target.value)} /></label>
        <button
          type="button"
          className="portal-button px-3 py-2 text-xs font-semibold"
          disabled={pending || !reasonReady}
          onClick={() => run(
            () => updateClinicDutyDateHours({
              dutyDateId: date.id,
              dutyDate: date.date,
              opensLocal: opensAt,
              closesLocal: closesAt,
              reason,
            }),
            "Clinic hours corrected."
          )}
        >
          Save hours
        </button>
      </div>
      {date.slots.map((slot) => (
        <label key={slot.id} className="clinic-duty-admin-override">
          Replace {slot.assigneeName}
          <select
            className="app-input"
            defaultValue={slot.assigneeRosterId}
            disabled={pending || !reasonReady}
            onChange={(event) => {
              if (event.target.value === slot.assigneeRosterId) return;
              run(
                () => overrideClinicDutySlot({ slotId: slot.id, rosterId: event.target.value, reason }),
                "Assignment overridden and conflicting offers cancelled."
              );
            }}
          >
            {eligibleRoster.map((student) => <option key={student.rosterId} value={student.rosterId}>{student.name} · {student.dutyCount} duties</option>)}
          </select>
        </label>
      ))}
    </div>
  );
}

export function ClinicDutyAdminConsole({ data }: { data: ClinicDutyAdmin }) {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [publishPhrase, setPublishPhrase] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "open" | "closed" | "completed" | "overdue">("all");
  const [isPending, startTransition] = useTransition();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());

  const visibleDates = useMemo(() => data.dates.filter((date) => {
    if (dateFilter === "all") return true;
    if (dateFilter === "open") return date.status === "open";
    if (dateFilter === "closed") return date.status === "closed";
    if (dateFilter === "completed") return date.submissionStatus === "completed";
    return date.status === "open" && date.date < today && date.submissionStatus !== "completed";
  }), [data.dates, dateFilter, today]);

  function run(operation: () => Promise<void>, success: string) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        await operation();
        setNotice(success);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Coordinator update failed.");
      }
    });
  }

  if (!data.term) return <section className="app-card p-6">No Sim Clinic Duty term is configured.</section>;

  return (
    <div className="space-y-6">
      <header className="app-card p-6">
        <p className="eyebrow">Narrow delegated permission · student-run accountability</p>
        <div className="clinic-duty-admin-title">
          <div>
            <h1>Sim Clinic Duty</h1>
            <p>Calendar corrections, assignment exceptions, private photo waivers, overdue review, and audit history.</p>
          </div>
          <Link href="/clinic-duty" className="portal-button px-4 py-2 text-sm font-semibold">Student view</Link>
        </div>
      </header>

      <section className="clinic-duty-admin-stats">
        <div><span>Open dates</span><b>{data.summary.openDates}</b></div>
        <div><span>Duty slots</span><b>{data.summary.slots}</b></div>
        <div><span>Completed</span><b>{data.summary.completedDates}</b></div>
        <div><span>Overdue</span><b>{data.summary.overdueDates}</b></div>
        <div><span>Closed</span><b>{data.summary.closedDates}</b></div>
      </section>

      {data.term.status === "draft" && (
        <section className="clinic-duty-publish-gate">
          <div>
            <p className="eyebrow">Final release gate</p>
            <h2>Schedule is draft-only</h2>
            <p>Publish only after Rick’s explicit final approval and confirmation that the required-photo policy is acceptable for the class and school.</p>
          </div>
          <div>
            <input className="app-input" value={publishPhrase} onChange={(event) => setPublishPhrase(event.target.value)} placeholder="Type PUBLISH FALL 2026" />
            <button
              type="button"
              className="portal-button-primary px-4 py-2 text-sm font-semibold"
              disabled={isPending || publishPhrase !== "PUBLISH FALL 2026"}
              onClick={() => run(() => publishClinicDutyTerm(data.term!.id), "Fall 2026 rotation published.")}
            >
              Publish rotation
            </button>
          </div>
        </section>
      )}

      {(error || notice) && <div className={error ? "clinic-duty-message is-error" : "clinic-duty-message is-success"}>{error ?? notice}</div>}

      <section className="app-card overflow-hidden">
        <div className="clinic-duty-admin-section-bar">
          <div><p className="eyebrow">Calendar and exceptions</p><h2>Fall 2026 dates</h2></div>
          <select className="app-input" value={dateFilter} onChange={(event) => setDateFilter(event.target.value as typeof dateFilter)}>
            <option value="all">All dates</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
        <div className="clinic-duty-admin-dates">
          {visibleDates.map((date) => (
            <details key={date.id}>
              <summary>
                <span><b>{formatDate(date.date)}</b><small>{date.slots.map((slot) => slot.assigneeName).join(" + ") || date.closureReason || "No assignments"}</small></span>
                <span className="clinic-duty-status">{date.submissionStatus ?? date.status}{date.photoWaived ? " · photo waived" : ""}</span>
              </summary>
              <DateControls date={date} roster={data.workload} pending={isPending} run={run} />
            </details>
          ))}
        </div>
      </section>

      <section className="app-card overflow-hidden">
        <div className="clinic-duty-admin-section-bar"><div><p className="eyebrow">Balance review</p><h2>82-student workload</h2></div></div>
        <div className="clinic-duty-table-wrap">
          <table className="portal-table clinic-duty-table">
            <thead><tr><th>Student</th><th>Status</th><th>Total duties</th><th>Future duties</th></tr></thead>
            <tbody>{data.workload.map((student) => (
              <tr key={student.rosterId}><td data-label="Student">{student.name}</td><td data-label="Status">{student.status}</td><td data-label="Total">{student.dutyCount}</td><td data-label="Future">{student.futureDutyCount}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      <section className="app-card overflow-hidden">
        <div className="clinic-duty-admin-section-bar"><div><p className="eyebrow">Append-only history</p><h2>Recent audit events</h2></div></div>
        <div className="clinic-duty-audit-list">
          {data.events.map((event) => (
            <article key={event.id}>
              <div><b>{event.eventType.replaceAll(".", " · ")}</b><span>{event.dutyDate ? formatDate(event.dutyDate) : data.term?.label}</span></div>
              <p>{event.reason ?? "System-recorded action"}</p>
              <small>{event.actorName ?? "System"} · {new Date(event.createdAt).toLocaleString()}</small>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
