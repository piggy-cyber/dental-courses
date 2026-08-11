"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type {
  ClinicDutyDate,
  ClinicDutyExchange,
  ClinicDutyPortal,
  ClinicDutyStatus,
} from "@/lib/clinic-duty";
import {
  claimClinicDutyRelease,
  offerClinicDutyTrade,
  releaseClinicDutySlot,
  respondClinicDutyExchange,
} from "./actions";

type Tab = "mine" | "open" | "trades" | "schedule";

const STATUS_LABELS: Record<ClinicDutyStatus, string> = {
  scheduled: "Scheduled",
  "due-today": "Due today",
  released: "Released",
  "trade-pending": "Trade pending",
  completed: "Completed",
  overdue: "Overdue",
  closed: "Closed",
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function StatusBadge({ status }: { status: ClinicDutyStatus }) {
  return <span className={`clinic-duty-status clinic-duty-status-${status}`}>{STATUS_LABELS[status]}</span>;
}

function DutyCard({
  duty,
  onRelease,
  pending,
  referenceNow,
}: {
  duty: ClinicDutyDate;
  onRelease?: (slotId: string) => void;
  pending: boolean;
  referenceNow: number;
}) {
  const mySlot = duty.slots.find((slot) => slot.isMine);
  const mayRelease = Boolean(
    mySlot
      && duty.dateStatus === "open"
      && !["completed", "closed", "overdue"].includes(duty.completionStatus)
      && new Date(duty.closesAt).getTime() > referenceNow
      && !mySlot.releaseOpen
  );

  return (
    <article className="clinic-duty-card">
      <div className="clinic-duty-card-date">
        <p>{formatDate(duty.date)}</p>
        <span>{formatTime(duty.opensAt)}–{formatTime(duty.closesAt)}</span>
      </div>
      <div className="clinic-duty-pair" aria-label="Assigned duty pair">
        {duty.slots.length > 0
          ? duty.slots.map((slot) => (
              <span key={slot.id} className={slot.isMine ? "is-me" : undefined}>
                {slot.assigneeName}{slot.isMine ? " · You" : ""}
              </span>
            ))
          : <span className="text-brand-muted">No assignments — closed date</span>}
      </div>
      <div className="clinic-duty-card-actions">
        <StatusBadge status={duty.completionStatus} />
        {duty.closureReason && <small>{duty.closureReason}</small>}
        {mySlot && duty.dateStatus === "open" && (
          <Link href={`/clinic-duty/${duty.date}`} className="portal-button px-3 py-2 text-xs font-semibold">
            {duty.completionStatus === "completed" ? "View record" : "Open checklist"}
          </Link>
        )}
        {mayRelease && onRelease && (
          <button
            type="button"
            className="clinic-duty-text-button"
            onClick={() => onRelease(mySlot!.id)}
            disabled={pending}
          >
            Release this duty
          </button>
        )}
        {mySlot?.releaseOpen && <small>You remain responsible until another D2 student claims this duty.</small>}
      </div>
    </article>
  );
}

function ExchangeRow({
  exchange,
  viewerRosterId,
  pending,
  onClaim,
  onRespond,
}: {
  exchange: ClinicDutyExchange;
  viewerRosterId: string | null;
  pending: boolean;
  onClaim: (id: string) => void;
  onRespond: (id: string, response: "accepted" | "rejected" | "cancelled") => void;
}) {
  const isCreator = exchange.createdByRosterId === viewerRosterId;
  const isCounterparty = exchange.counterpartyRosterId === viewerRosterId;
  return (
    <article className="clinic-duty-exchange">
      <div>
        <p className="eyebrow">{exchange.kind === "release" ? "Available duty" : "Trade request"}</p>
        <h3>
          {exchange.kind === "release"
            ? `${formatDate(exchange.offeredDate)} · ${exchange.createdByName}`
            : `${formatDate(exchange.offeredDate)} ⇄ ${exchange.requestedDate ? formatDate(exchange.requestedDate) : ""}`}
        </h3>
        <p>
          {exchange.kind === "release"
            ? "Claiming transfers this slot to you immediately."
            : `${exchange.createdByName} offered a direct two-date swap${exchange.counterpartyName ? ` with ${exchange.counterpartyName}` : ""}.`}
        </p>
      </div>
      <div className="clinic-duty-exchange-actions">
        <span className="clinic-duty-status">{exchange.status}</span>
        {exchange.status === "open" && exchange.kind === "release" && !isCreator && (
          <button className="portal-button-primary px-3 py-2 text-xs font-semibold" disabled={pending} onClick={() => onClaim(exchange.id)}>
            Claim duty
          </button>
        )}
        {exchange.status === "open" && exchange.kind === "trade" && isCounterparty && (
          <>
            <button className="portal-button-primary px-3 py-2 text-xs font-semibold" disabled={pending} onClick={() => onRespond(exchange.id, "accepted")}>Accept</button>
            <button className="portal-button px-3 py-2 text-xs font-semibold" disabled={pending} onClick={() => onRespond(exchange.id, "rejected")}>Decline</button>
          </>
        )}
        {exchange.status === "open" && isCreator && (
          <button className="clinic-duty-text-button" disabled={pending} onClick={() => onRespond(exchange.id, "cancelled")}>Cancel offer</button>
        )}
      </div>
    </article>
  );
}

export function ClinicDutyPortalView({
  portal,
  displayName,
  referenceTime,
}: {
  portal: ClinicDutyPortal;
  displayName: string;
  referenceTime: string;
}) {
  const [tab, setTab] = useState<Tab>("mine");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [offeredSlotId, setOfferedSlotId] = useState("");
  const [requestedSlotId, setRequestedSlotId] = useState("");
  const [isPending, startTransition] = useTransition();
  const referenceNow = new Date(referenceTime).getTime();

  const mine = useMemo(() => portal.dates.filter((date) => date.slots.some((slot) => slot.isMine)), [portal.dates]);
  const openReleases = portal.exchanges.filter((exchange) => exchange.kind === "release" && exchange.status === "open");
  const visibleTrades = portal.exchanges.filter((exchange) => exchange.kind === "trade");
  const futureMySlots = mine.flatMap((date) => date.slots.filter((slot) => slot.isMine).map((slot) => ({ date, slot })));
  const futureOtherSlots = portal.dates.flatMap((date) => date.slots.filter((slot) => !slot.isMine).map((slot) => ({ date, slot })));

  function run(operation: () => Promise<void>, success: string) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        await operation();
        setNotice(success);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "The update could not be completed.");
      }
    });
  }

  if (!portal.term) {
    return (
      <section className="app-card p-6">
        <p className="eyebrow">Student-run accountability</p>
        <h1 className="mt-2 text-3xl font-bold text-brand-navy">Sim Clinic Duty</h1>
        <p className="mt-3 max-w-2xl text-brand-muted">
          The Fall 2026 rotation is being reviewed and has not been published to students yet.
        </p>
      </section>
    );
  }

  return (
    <div className="clinic-duty-shell">
      <header className="clinic-duty-hero">
        <div>
          <p className="eyebrow">Student-run accountability · {portal.term.label}</p>
          <h1>Sim Clinic Duty</h1>
          <p>
            Hi {displayName}. Each duty pair checks shared Lab and Sim Clinic spaces. Every student still cleans their own station.
          </p>
        </div>
        <div className="clinic-duty-hours">
          <span>Mon–Fri</span><b>7 AM–11 PM</b>
          <span>Saturday</span><b>7 AM–7 PM</b>
          <span>Sunday</span><b>Closed</b>
        </div>
      </header>

      <section className="clinic-duty-rulebar">
        <p><b>Shared-space standard:</b> leave floors, surfaces, sinks, and pathways free of debris before it dries.</p>
        {portal.viewer.rosterId && <a href="/api/clinic-duty/calendar.ics" className="portal-link">Download my calendar (.ics)</a>}
      </section>

      <nav className="clinic-duty-tabs" aria-label="Sim Clinic Duty views">
        {([
          ["mine", `My Duties (${mine.length})`],
          ["open", `Open Duties (${openReleases.length})`],
          ["trades", `Trade Requests (${visibleTrades.filter((trade) => trade.status === "open").length})`],
          ["schedule", "Full Schedule"],
        ] as Array<[Tab, string]>).map(([id, label]) => (
          <button key={id} type="button" data-active={tab === id} onClick={() => setTab(id)}>{label}</button>
        ))}
      </nav>

      {(error || notice) && (
        <div className={error ? "clinic-duty-message is-error" : "clinic-duty-message is-success"} role="status">
          {error ?? notice}
        </div>
      )}

      {tab === "mine" && (
        <section className="clinic-duty-grid" aria-label="My duties">
          {mine.map((duty) => (
            <DutyCard
              key={duty.id}
              duty={duty}
              pending={isPending}
              referenceNow={referenceNow}
              onRelease={(slotId) => run(() => releaseClinicDutySlot(slotId), "Duty released. You remain responsible until it is claimed.")}
            />
          ))}
          {mine.length === 0 && <p className="clinic-duty-empty">No assignments are visible for this term.</p>}
        </section>
      )}

      {tab === "open" && (
        <section className="space-y-3" aria-label="Open duties">
          {openReleases.map((exchange) => (
            <ExchangeRow
              key={exchange.id}
              exchange={exchange}
              viewerRosterId={portal.viewer.rosterId}
              pending={isPending}
              onClaim={(id) => run(() => claimClinicDutyRelease(id), "Duty claimed and transferred to your schedule.")}
              onRespond={(id, response) => run(() => respondClinicDutyExchange(id, response), "Exchange updated.")}
            />
          ))}
          {openReleases.length === 0 && <p className="clinic-duty-empty">No released duties are available right now.</p>}
        </section>
      )}

      {tab === "trades" && (
        <div className="space-y-5">
          <section className="app-card p-5">
            <p className="eyebrow">Offer a direct swap</p>
            <h2 className="mt-1 text-xl font-bold text-brand-navy">Trade two future duty slots</h2>
            <p className="mt-2 text-sm text-brand-muted">Nothing changes until the other assigned student accepts.</p>
            <div className="clinic-duty-trade-form">
              <label>
                Your duty
                <select value={offeredSlotId} onChange={(event) => setOfferedSlotId(event.target.value)} className="app-input">
                  <option value="">Choose your date</option>
                  {futureMySlots.filter(({ date }) => new Date(date.opensAt).getTime() > referenceNow).map(({ date, slot }) => (
                    <option key={slot.id} value={slot.id}>{formatDate(date.date)}</option>
                  ))}
                </select>
              </label>
              <label>
                Requested duty
                <select value={requestedSlotId} onChange={(event) => setRequestedSlotId(event.target.value)} className="app-input">
                  <option value="">Choose another student&apos;s slot</option>
                  {futureOtherSlots.filter(({ date }) => new Date(date.opensAt).getTime() > referenceNow).map(({ date, slot }) => (
                    <option key={slot.id} value={slot.id}>{formatDate(date.date)} · {slot.assigneeName}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="portal-button-primary px-4 py-2 text-sm font-semibold"
                disabled={isPending || !offeredSlotId || !requestedSlotId}
                onClick={() => run(
                  () => offerClinicDutyTrade(offeredSlotId, requestedSlotId),
                  "Trade request sent. Assignments stay unchanged until it is accepted."
                )}
              >
                Offer trade
              </button>
            </div>
          </section>
          {visibleTrades.map((exchange) => (
            <ExchangeRow
              key={exchange.id}
              exchange={exchange}
              viewerRosterId={portal.viewer.rosterId}
              pending={isPending}
              onClaim={(id) => run(() => claimClinicDutyRelease(id), "Duty claimed.")}
              onRespond={(id, response) => run(() => respondClinicDutyExchange(id, response), "Trade request updated.")}
            />
          ))}
        </div>
      )}

      {tab === "schedule" && (
        <section className="app-card overflow-hidden">
          <div className="clinic-duty-table-wrap">
            <table className="portal-table clinic-duty-table">
              <thead><tr><th>Date</th><th>Hours</th><th>Duty pair</th><th>Status</th></tr></thead>
              <tbody>
                {portal.dates.map((duty) => (
                  <tr key={duty.id}>
                    <td data-label="Date">{formatDate(duty.date)}</td>
                    <td data-label="Hours">{formatTime(duty.opensAt)}–{formatTime(duty.closesAt)}</td>
                    <td data-label="Duty pair">{duty.slots.map((slot) => slot.assigneeName).join(" + ") || "—"}</td>
                    <td data-label="Status"><StatusBadge status={duty.completionStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <footer className="clinic-duty-footnote">
        Sim Clinic Duty is a student-run accountability tool, not an official CWRU or faculty compliance system. Classmates see dates, assignees, and completion status only; photos and issue notes stay private to the assigned pair and coordinators.
      </footer>
    </div>
  );
}
