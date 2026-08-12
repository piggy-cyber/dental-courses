"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { SignInPanel } from "@/components/SignInPanel";
import {
  buildSharedCalendarMonth,
  type SharedCalendarAction,
  type SharedCalendarData,
  type SharedCalendarEvent,
  type SharedCalendarSource,
} from "@/lib/shared-calendar";

type ViewMode = "calendar" | "list";

type AccessPrompt = {
  title: string;
  description: string;
  returnTo: string;
};

export type SharedCalendarAccountAction = {
  title: string;
  description: string;
  label: string;
  href: string;
  returnTo?: string;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

function monthLabel(key: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(`${key}-15T12:00:00Z`));
}

function sourceForEvent(sources: SharedCalendarSource[], event: SharedCalendarEvent) {
  return sources.find((source) => source.id === event.sourceId) ?? sources[0];
}

function EventTime({ event }: { event: SharedCalendarEvent }) {
  if (event.allDay) return <>All day</>;
  return <>{formatTime(event.startsAt)}–{formatTime(event.endsAt)}</>;
}

function AccountAction({
  canManageDuty,
  className,
  href,
  label,
  prompt,
  setAccessPrompt,
}: {
  canManageDuty: boolean;
  className: string;
  href: string;
  label: string;
  prompt: AccessPrompt;
  setAccessPrompt: (prompt: AccessPrompt) => void;
}) {
  if (canManageDuty) {
    return href.startsWith("/api/") ? (
      <a className={className} href={href}>{label}</a>
    ) : (
      <Link className={className} href={href} prefetch={false}>{label}</Link>
    );
  }

  return (
    <button type="button" className={className} onClick={() => setAccessPrompt(prompt)}>
      {label}
    </button>
  );
}

function EventAction({
  action,
  canManageDuty,
  className,
  setAccessPrompt,
}: {
  action: SharedCalendarAction;
  canManageDuty: boolean;
  className: string;
  setAccessPrompt: (prompt: AccessPrompt) => void;
}) {
  if (!action.requiresLinkedD2 || canManageDuty) {
    return <Link className={className} href={action.href} prefetch={false}>{action.label}</Link>;
  }

  return (
    <button
      type="button"
      className={className}
      onClick={() => setAccessPrompt({
        title: action.promptTitle,
        description: action.promptDescription,
        returnTo: action.href,
      })}
    >
      {action.label}
    </button>
  );
}

function CalendarEvent({
  canManageDuty,
  event,
  openDetails,
  selectedStudentKey,
  setAccessPrompt,
  source,
}: {
  canManageDuty: boolean;
  event: SharedCalendarEvent;
  openDetails: (event: SharedCalendarEvent) => void;
  selectedStudentKey: string;
  setAccessPrompt: (prompt: AccessPrompt) => void;
  source: SharedCalendarSource;
}) {
  const hasClassDetails = event.sourceId === "class-recording" || event.sourceId === "exam";

  return (
    <article
      className={`shared-calendar-event tone-${source.tone}${event.status === "closed" ? " is-closed" : ""}${hasClassDetails ? " has-details" : ""}`}
      role={hasClassDetails ? "button" : undefined}
      tabIndex={hasClassDetails ? 0 : undefined}
      aria-label={hasClassDetails ? `View details for ${event.title}` : undefined}
      onClick={hasClassDetails ? () => openDetails(event) : undefined}
      onKeyDown={hasClassDetails ? (keyboardEvent) => {
        if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
          keyboardEvent.preventDefault();
          openDetails(event);
        }
      } : undefined}
    >
      <div className="shared-calendar-event-heading">
        <span>{source.shortLabel}</span>
        <small><EventTime event={event} /></small>
      </div>
      <b>{event.title}</b>
      {event.participants.length > 0 && (
        <div className="shared-calendar-participants">
          {event.participants.map((participant) => (
            <span key={participant.key} className={participant.key === selectedStudentKey ? "is-selected" : undefined}>
              {participant.label}
            </span>
          ))}
        </div>
      )}
      {event.action && !hasClassDetails && (
        <EventAction
          action={event.action}
          canManageDuty={canManageDuty}
          className="shared-calendar-event-action"
          setAccessPrompt={setAccessPrompt}
        />
      )}
      {hasClassDetails && <span className="shared-calendar-detail-cue">View details →</span>}
    </article>
  );
}

export function SharedCalendar({
  accountActions,
  calendar,
  calendarSubscriptionUrl,
  canManageDuty,
  isSignedIn,
}: {
  accountActions: SharedCalendarAccountAction[];
  calendar: SharedCalendarData;
  calendarSubscriptionUrl: string;
  canManageDuty: boolean;
  isSignedIn: boolean;
}) {
  const [studentKey, setStudentKey] = useState("all");
  const [sourceId, setSourceId] = useState("all");
  const [month, setMonth] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [accessPrompt, setAccessPrompt] = useState<AccessPrompt | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<SharedCalendarEvent | null>(null);
  const [copyFeedback, setCopyFeedback] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const detailCloseButtonRef = useRef<HTMLButtonElement>(null);
  const calendarLinkRef = useRef<HTMLInputElement>(null);

  const students = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const event of calendar.events) {
      for (const participant of event.participants) {
        if (participant.kind === "student") byKey.set(participant.key, participant.label);
      }
    }
    return [...byKey.entries()]
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [calendar.events]);

  const months = useMemo(
    () => [...new Set(calendar.events.map((event) => event.date.slice(0, 7)))],
    [calendar.events],
  );

  const visibleEvents = calendar.events.filter((event) => {
    const matchesStudent = studentKey === "all"
      || event.participants.some((participant) => participant.key === studentKey);
    const matchesSource = sourceId === "all" || event.sourceId === sourceId;
    const matchesMonth = month === "all" || event.date.startsWith(`${month}-`);
    return matchesStudent && matchesSource && matchesMonth;
  });
  const monthsWithEvents = new Set(visibleEvents.map((event) => event.date.slice(0, 7)));
  const calendarMonths = month === "all"
    ? months.filter((calendarMonth) => monthsWithEvents.has(calendarMonth))
    : visibleEvents.length > 0 ? [month] : [];
  const selectedStudent = students.find((student) => student.key === studentKey);
  const selectedSource = calendar.sources.find((source) => source.id === sourceId);

  useEffect(() => {
    if (!accessPrompt) return;
    closeButtonRef.current?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setAccessPrompt(null);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [accessPrompt]);

  useEffect(() => {
    if (!selectedEvent) return;
    detailCloseButtonRef.current?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedEvent(null);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedEvent]);

  async function copyCalendarLink() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(calendarSubscriptionUrl);
      setCopyFeedback("Calendar link copied.");
    } catch {
      calendarLinkRef.current?.focus();
      calendarLinkRef.current?.select();
      setCopyFeedback("The link is selected. Use Copy on your device.");
    }
  }

  return (
    <div className="shared-calendar-stack">
      <section className="shared-calendar-sources" aria-label="Calendar sources">
        {calendar.sources.map((source) => (
          <button
            key={source.id}
            type="button"
            className={`tone-${source.tone}`}
            aria-pressed={sourceId === source.id}
            onClick={() => setSourceId(sourceId === source.id ? "all" : source.id)}
          >
            <span aria-hidden="true" />
            <b>{source.label}</b>
            <small>{source.description}</small>
          </button>
        ))}
      </section>

      <section className="shared-calendar-actions" aria-labelledby="calendar-actions-title">
        <div>
          <p className="eyebrow">Calendar controls</p>
          <h2 id="calendar-actions-title">View everything. Manage only your own duty.</h2>
          <p>The complete class calendar and combined calendar download are public. Responsibility changes require a linked D2 account.</p>
        </div>
        <div className="shared-calendar-action-grid">
          <article className="is-public">
            <span>Public</span>
            <h3>Full D2 calendar</h3>
            <p>Classes, recording status, exams, duties, and closures—with a 24-hour reminder.</p>
            <a className="clinic-duty-protected-action" href="/api/calendar.ics">Download all (.ics) →</a>
            <label className="shared-calendar-copy-label" htmlFor="shared-calendar-subscription">Calendar subscription link</label>
            <div className="shared-calendar-copy-row">
              <input
                ref={calendarLinkRef}
                id="shared-calendar-subscription"
                type="text"
                readOnly
                value={calendarSubscriptionUrl}
                onFocus={(event) => event.currentTarget.select()}
              />
              <button type="button" onClick={copyCalendarLink}>Copy link</button>
            </div>
            <small className="shared-calendar-copy-feedback" role="status" aria-live="polite">{copyFeedback}</small>
          </article>
          {accountActions.map((action) => (
            <article key={action.label}>
              <span>{canManageDuty ? "Linked" : "Sign in"}</span>
              <h3>{action.label}</h3>
              <p>{action.description}</p>
              <AccountAction
                canManageDuty={canManageDuty}
                className="clinic-duty-protected-action"
                href={action.href}
                label={`${action.label} →`}
                prompt={{
                  title: action.title,
                  description: action.description,
                  returnTo: action.returnTo ?? action.href,
                }}
                setAccessPrompt={setAccessPrompt}
              />
            </article>
          ))}
        </div>
      </section>

      <section className="shared-calendar-controls" aria-label="Filter the D2 calendar">
        <div className="shared-calendar-controls-heading">
          <p className="eyebrow">Find an event</p>
          <h2>{selectedStudent?.label ?? selectedSource?.label ?? "Full D2 calendar"}</h2>
          <p>{visibleEvents.length} event{visibleEvents.length === 1 ? "" : "s"} shown</p>
        </div>
        <label>
          Event type
          <select className="app-input" value={sourceId} onChange={(event) => setSourceId(event.target.value)}>
            <option value="all">All event types</option>
            {calendar.sources.map((source) => <option key={source.id} value={source.id}>{source.label}</option>)}
          </select>
        </label>
        <label>
          Student
          <select className="app-input" value={studentKey} onChange={(event) => setStudentKey(event.target.value)}>
            <option value="all">All {students.length} students</option>
            {students.map((student) => <option key={student.key} value={student.key}>{student.label}</option>)}
          </select>
        </label>
        <label>
          Month
          <select className="app-input" value={month} onChange={(event) => setMonth(event.target.value)}>
            <option value="all">All months</option>
            {months.map((value) => <option key={value} value={value}>{monthLabel(value)}</option>)}
          </select>
        </label>
        <div className="clinic-duty-showcase-view-toggle" aria-label="Calendar format">
          <button type="button" aria-pressed={viewMode === "calendar"} onClick={() => setViewMode("calendar")}>Calendar</button>
          <button type="button" aria-pressed={viewMode === "list"} onClick={() => setViewMode("list")}>List</button>
        </div>
        {(studentKey !== "all" || sourceId !== "all" || month !== "all") && (
          <button
            type="button"
            className="clinic-duty-reset-button"
            onClick={() => { setStudentKey("all"); setSourceId("all"); setMonth("all"); }}
          >
            Reset filters
          </button>
        )}
      </section>

      {viewMode === "calendar" ? (
        <section className="clinic-duty-calendar-stack" aria-label="Calendar view of D2 events">
          {calendarMonths.map((calendarMonth) => {
            const weeks = buildSharedCalendarMonth(visibleEvents, calendarMonth);
            const monthEventCount = visibleEvents.filter((event) => event.date.startsWith(`${calendarMonth}-`)).length;
            return (
              <section className="clinic-duty-calendar-month" key={calendarMonth} aria-labelledby={`calendar-${calendarMonth}`}>
                <header>
                  <div>
                    <p className="eyebrow">Calendar view</p>
                    <h3 id={`calendar-${calendarMonth}`}>{monthLabel(calendarMonth)}</h3>
                  </div>
                  <span>{monthEventCount} event{monthEventCount === 1 ? "" : "s"}</span>
                </header>
                <div className="clinic-duty-calendar-scroll">
                  <div className="shared-calendar-grid" role="grid" aria-label={`${monthLabel(calendarMonth)} D2 calendar`}>
                    {WEEKDAYS.map((weekday) => <div role="columnheader" key={weekday} className="clinic-duty-calendar-weekday">{weekday}</div>)}
                    {weeks.flatMap((week, weekIndex) => week.map((day, dayIndex) => {
                      if (!day) return <div key={`${weekIndex}-${dayIndex}`} role="gridcell" className="shared-calendar-day is-empty" />;
                      return (
                        <section key={day.date} role="gridcell" className={`shared-calendar-day${day.events.length === 0 ? " has-no-events" : ""}`}>
                          <b className="shared-calendar-day-number">{day.day}</b>
                          <div className="shared-calendar-day-events">
                            {day.events.map((event) => (
                              <CalendarEvent
                                key={event.id}
                                canManageDuty={canManageDuty}
                                event={event}
                                openDetails={setSelectedEvent}
                                selectedStudentKey={studentKey}
                                setAccessPrompt={setAccessPrompt}
                                source={sourceForEvent(calendar.sources, event)}
                              />
                            ))}
                          </div>
                        </section>
                      );
                    }))}
                  </div>
                </div>
              </section>
            );
          })}
          {visibleEvents.length === 0 && <p className="clinic-duty-empty">No events match these filters.</p>}
        </section>
      ) : (
        <section className="shared-calendar-list" aria-label="List view of D2 events">
          {visibleEvents.map((event) => {
            const source = sourceForEvent(calendar.sources, event);
            return (
              <article className={`shared-calendar-list-item tone-${source.tone}`} key={event.id}>
                <div>
                  <p>{formatDate(event.date)}</p>
                  <span><EventTime event={event} /></span>
                </div>
                <div>
                  <span className="shared-calendar-source-label">{source.label}</span>
                  <h3>{event.title}</h3>
                  {event.participants.length > 0 && (
                    <p className="shared-calendar-list-participants">
                      {event.participants.map((participant) => participant.label).join(" · ")}
                    </p>
                  )}
                  <p>{event.description}</p>
                </div>
                {event.action && (
                  <EventAction
                    action={event.action}
                    canManageDuty={canManageDuty}
                    className="clinic-duty-protected-action is-compact"
                    setAccessPrompt={setAccessPrompt}
                  />
                )}
              </article>
            );
          })}
          {visibleEvents.length === 0 && <p className="clinic-duty-empty">No events match these filters.</p>}
        </section>
      )}

      {selectedEvent && (
        <div className="clinic-duty-access-backdrop" onMouseDown={() => setSelectedEvent(null)}>
          <section
            className="clinic-duty-access-dialog shared-calendar-detail-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shared-calendar-detail-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button ref={detailCloseButtonRef} type="button" className="clinic-duty-access-close" aria-label="Close class details" onClick={() => setSelectedEvent(null)}>×</button>
            <p className="eyebrow">{sourceForEvent(calendar.sources, selectedEvent).label}</p>
            <h2 id="shared-calendar-detail-title">{selectedEvent.title}</h2>
            <p className="shared-calendar-detail-time">{formatDate(selectedEvent.date)} · <EventTime event={selectedEvent} /></p>
            <p>{selectedEvent.description}</p>
            {selectedEvent.action && (
              <EventAction
                action={selectedEvent.action}
                canManageDuty={canManageDuty}
                className="portal-button"
                setAccessPrompt={setAccessPrompt}
              />
            )}
          </section>
        </div>
      )}

      {accessPrompt && (
        <div className="clinic-duty-access-backdrop" onMouseDown={() => setAccessPrompt(null)}>
          <section
            className="clinic-duty-access-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shared-calendar-access-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button ref={closeButtonRef} type="button" className="clinic-duty-access-close" aria-label="Close sign-in prompt" onClick={() => setAccessPrompt(null)}>×</button>
            <p className="eyebrow">Protected student action</p>
            <h2 id="shared-calendar-access-title">{accessPrompt.title}</h2>
            <p>{accessPrompt.description}</p>
            {isSignedIn ? (
              <div className="clinic-duty-linking-message">
                <b>Your Google account is signed in.</b>
                <p>It still needs to be linked to your approved D2 roster identity before duty controls can open.</p>
                <Link href="/profile" className="portal-button">View account status</Link>
              </div>
            ) : (
              <SignInPanel
                returnTo={accessPrompt.returnTo}
                description="Use your Case Google account. After it is linked to your D2 roster identity, you can manage this duty."
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
