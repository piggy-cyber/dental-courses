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

type AccessPrompt = {
  title: string;
  description: string;
  returnTo: string;
};

type RecordingFilter = "all" | "recorded" | "scheduled" | "pending" | "not-scheduled" | "not-found";

export type SharedCalendarAccountAction = {
  title: string;
  description: string;
  label: string;
  href: string;
  returnTo?: string;
};

const EASTERN_TIME_ZONE = "America/New_York";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const EVENT_KIND_LABELS: Record<SharedCalendarEvent["eventKind"], string> = {
  class: "Class",
  exam: "Exam",
  lab: "Lab",
  competency: "Competency",
  zoom: "Zoom",
  "sim-clinic": "Sim Clinic Duty",
  sealant: "Sealant Duty",
  closure: "Closure",
};

export function getEasternDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: EASTERN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatDate(date: string, includeYear = false) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    ...(includeYear ? { year: "numeric" } : {}),
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatClockWindow(start: string | null, end: string | null) {
  if (!start || !end) return null;
  const formatClock = (value: string) => {
    const [hours, minutes] = value.split(":").map(Number);
    return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
  };
  return `${formatClock(start)}–${formatClock(end)}`;
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

export function getSharedCalendarRecordingState(event: SharedCalendarEvent, today: string) {
  if (!event.courseCode) return null;
  if (event.recordingStatus === "recorded") return { key: "recorded", label: "Recorded" };
  if (event.recordingStatus === "scheduled" && event.date < today) return { key: "pending", label: "Confirmation pending" };
  if (event.recordingStatus === "scheduled") return { key: "scheduled", label: "Echo scheduled" };
  if (event.recordingStatus === "not-scheduled") return { key: "not-scheduled", label: "Not scheduled" };
  if (event.recordingStatus === "not-recorded") return { key: "not-scheduled", label: "Not recorded" };
  if (event.recordingStatus === "not-found") return { key: "not-found", label: "No Echo schedule found" };
  return { key: "not-found", label: "Recording needs verification" };
}

function courseClass(courseCode: string | null) {
  if (!courseCode) return "course-other";
  return `course-${courseCode.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function monthIndex(months: string[], month: string) {
  return Math.max(0, months.indexOf(month));
}

export function getSelectedDateForMonth(month: string, today: string, events: SharedCalendarEvent[]) {
  if (today.startsWith(`${month}-`)) return today;
  return events.find((event) => event.date.startsWith(`${month}-`))?.date ?? `${month}-01`;
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
    return action.external ? (
      <a className={className} href={action.href} target="_blank" rel="noreferrer">{action.label}</a>
    ) : (
      <Link className={className} href={action.href} prefetch={false}>{action.label}</Link>
    );
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
  event,
  openDetails,
  source,
  today,
}: {
  event: SharedCalendarEvent;
  openDetails: (event: SharedCalendarEvent) => void;
  source: SharedCalendarSource;
  today: string;
}) {
  const recording = getSharedCalendarRecordingState(event, today);
  return (
    <button
      type="button"
      className={`shared-calendar-event tone-${source.tone} ${courseClass(event.courseCode)}${event.status === "closed" ? " is-closed" : ""}`}
      aria-label={`View details for ${event.title}`}
      onClick={(clickEvent) => {
        clickEvent.stopPropagation();
        openDetails(event);
      }}
    >
      <span className="shared-calendar-event-heading">
        <span>{event.courseCode ?? source.shortLabel}</span>
        <small><EventTime event={event} /></small>
      </span>
      <b>{event.title.replace(`${event.courseCode}: `, "")}</b>
      {recording && <span className={`shared-calendar-recording-badge is-${recording.key}`}>{recording.label}</span>}
    </button>
  );
}

function AgendaEvent({
  canManageDuty,
  event,
  openDetails,
  selectedStudentKey,
  setAccessPrompt,
  source,
  today,
}: {
  canManageDuty: boolean;
  event: SharedCalendarEvent;
  openDetails: (event: SharedCalendarEvent) => void;
  selectedStudentKey: string;
  setAccessPrompt: (prompt: AccessPrompt) => void;
  source: SharedCalendarSource;
  today: string;
}) {
  const recording = getSharedCalendarRecordingState(event, today);
  return (
    <article className={`shared-calendar-agenda-event tone-${source.tone} ${courseClass(event.courseCode)}`}>
      <button type="button" className="shared-calendar-agenda-open" onClick={() => openDetails(event)}>
        <span className="shared-calendar-agenda-time"><EventTime event={event} /></span>
        <span className="shared-calendar-agenda-copy">
          <small>{event.courseCode ?? source.label} · {EVENT_KIND_LABELS[event.eventKind]}</small>
          <b>{event.title.replace(`${event.courseCode}: `, "")}</b>
          {event.location && <span>{event.location}</span>}
        </span>
        {recording && <span className={`shared-calendar-recording-badge is-${recording.key}`}>{recording.label}</span>}
      </button>
      {event.participants.length > 0 && (
        <div className="shared-calendar-participants">
          {event.participants.map((participant) => (
            <span key={participant.key} className={participant.key === selectedStudentKey ? "is-selected" : undefined}>
              {participant.label}
            </span>
          ))}
        </div>
      )}
      {event.actions.length > 0 && !event.courseCode && (
        <div className="shared-calendar-agenda-actions">
          {event.actions.map((action) => (
            <EventAction
              key={`${event.id}-${action.label}`}
              action={action}
              canManageDuty={canManageDuty}
              className="shared-calendar-event-action"
              setAccessPrompt={setAccessPrompt}
            />
          ))}
        </div>
      )}
    </article>
  );
}

export function SharedCalendar({
  accountActions,
  calendar,
  calendarSubscriptionUrl,
  canManageDuty,
  initialToday,
  isSignedIn,
}: {
  accountActions: SharedCalendarAccountAction[];
  calendar: SharedCalendarData;
  calendarSubscriptionUrl: string;
  canManageDuty: boolean;
  initialToday: string;
  isSignedIn: boolean;
}) {
  const months = useMemo(
    () => [...new Set(calendar.events.map((event) => event.date.slice(0, 7)))].sort(),
    [calendar.events],
  );
  const firstMonth = months.find((value) => value >= initialToday.slice(0, 7)) ?? months.at(-1) ?? initialToday.slice(0, 7);
  const [today, setToday] = useState(initialToday);
  const [displayedMonth, setDisplayedMonth] = useState(firstMonth);
  const [selectedDate, setSelectedDate] = useState(() => getSelectedDateForMonth(firstMonth, initialToday, calendar.events));
  const [followsToday, setFollowsToday] = useState(true);
  const [courseCode, setCourseCode] = useState("all");
  const [eventKind, setEventKind] = useState("all");
  const [recordingFilter, setRecordingFilter] = useState<RecordingFilter>("all");
  const [studentKey, setStudentKey] = useState("all");
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

  const courseCodes = useMemo(
    () => [...new Set(calendar.events.map((event) => event.courseCode).filter((value): value is string => Boolean(value)))].sort(),
    [calendar.events],
  );

  const eventKinds = useMemo(
    () => [...new Set(calendar.events.map((event) => event.eventKind))],
    [calendar.events],
  );

  const visibleEvents = useMemo(() => calendar.events.filter((event) => {
    const matchesStudent = studentKey === "all" || event.participants.some((participant) => participant.key === studentKey);
    const matchesCourse = courseCode === "all" || event.courseCode === courseCode;
    const matchesKind = eventKind === "all" || event.eventKind === eventKind;
    const state = getSharedCalendarRecordingState(event, today)?.key;
    const matchesRecording = recordingFilter === "all" || state === recordingFilter;
    return matchesStudent && matchesCourse && matchesKind && matchesRecording;
  }), [calendar.events, courseCode, eventKind, recordingFilter, studentKey, today]);

  const monthEvents = useMemo(
    () => visibleEvents.filter((event) => event.date.startsWith(`${displayedMonth}-`)),
    [displayedMonth, visibleEvents],
  );
  const weeks = useMemo(
    () => buildSharedCalendarMonth(visibleEvents, displayedMonth),
    [displayedMonth, visibleEvents],
  );
  const selectedDayEvents = visibleEvents.filter((event) => event.date === selectedDate);
  const currentMonthIndex = monthIndex(months, displayedMonth);
  const filtersActive = courseCode !== "all" || eventKind !== "all" || recordingFilter !== "all" || studentKey !== "all";

  useEffect(() => {
    const refreshToday = () => {
      const nextToday = getEasternDateKey();
      setToday((currentToday) => {
        if (nextToday === currentToday) return currentToday;
        if (followsToday && months.includes(nextToday.slice(0, 7))) {
          setDisplayedMonth(nextToday.slice(0, 7));
          setSelectedDate(nextToday);
        }
        return nextToday;
      });
    };
    refreshToday();
    const interval = window.setInterval(refreshToday, 60_000);
    return () => window.clearInterval(interval);
  }, [followsToday, months]);

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

  function navigateMonth(direction: -1 | 1) {
    const nextMonth = months[currentMonthIndex + direction];
    if (!nextMonth) return;
    setFollowsToday(false);
    setDisplayedMonth(nextMonth);
    setSelectedDate(getSelectedDateForMonth(nextMonth, today, visibleEvents));
  }

  function returnToToday() {
    const todayMonth = today.slice(0, 7);
    setFollowsToday(true);
    if (months.includes(todayMonth)) setDisplayedMonth(todayMonth);
    setSelectedDate(today);
  }

  function chooseDate(date: string) {
    setSelectedDate(date);
    setFollowsToday(date === today && date.startsWith(`${displayedMonth}-`));
  }

  function resetFilters() {
    setCourseCode("all");
    setEventKind("all");
    setRecordingFilter("all");
    setStudentKey("all");
  }

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

  const selectedRecording = selectedEvent ? getSharedCalendarRecordingState(selectedEvent, today) : null;

  return (
    <div className="shared-calendar-stack">
      <section className="shared-calendar-sources" aria-label="Calendar sources">
        {calendar.sources.map((source) => {
          const count = calendar.events.filter((event) => event.sourceId === source.id).length;
          return (
            <article key={source.id} className={`tone-${source.tone}`}>
              <span aria-hidden="true" />
              <b>{source.label}</b>
              <strong>{count}</strong>
              <small>{source.description}</small>
            </article>
          );
        })}
      </section>

      <section className="shared-calendar-actions" aria-labelledby="calendar-actions-title">
        <div>
          <p className="eyebrow">Calendar access</p>
          <h2 id="calendar-actions-title">One calendar. Your next day at a glance.</h2>
          <p>Subscribe to all 237 events or use your linked D2 account to manage an assigned duty.</p>
        </div>
        <div className="shared-calendar-action-grid">
          <article className="is-public">
            <span>Public</span>
            <h3>Full D2 calendar</h3>
            <p>Classes, recording status, exams, duties, and closures—with a 24-hour reminder.</p>
            <a className="clinic-duty-protected-action" href="/api/calendar.ics">Download all (.ics) →</a>
            <label className="shared-calendar-copy-label" htmlFor="shared-calendar-subscription">Calendar subscription link</label>
            <div className="shared-calendar-copy-row">
              <input ref={calendarLinkRef} id="shared-calendar-subscription" type="text" readOnly value={calendarSubscriptionUrl} onFocus={(event) => event.currentTarget.select()} />
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
                prompt={{ title: action.title, description: action.description, returnTo: action.returnTo ?? action.href }}
                setAccessPrompt={setAccessPrompt}
              />
            </article>
          ))}
        </div>
      </section>

      <section className="shared-calendar-controls" aria-label="Filter the D2 calendar">
        <div className="shared-calendar-controls-heading">
          <p className="eyebrow">Find an event</p>
          <h2>{visibleEvents.length} event{visibleEvents.length === 1 ? "" : "s"} in this view</h2>
        </div>
        <label>
          Course
          <select className="app-input" value={courseCode} onChange={(event) => setCourseCode(event.target.value)}>
            <option value="all">All courses + duties</option>
            {courseCodes.map((code) => <option key={code} value={code}>{code}</option>)}
          </select>
        </label>
        <label>
          Event type
          <select className="app-input" value={eventKind} onChange={(event) => setEventKind(event.target.value)}>
            <option value="all">All event types</option>
            {eventKinds.map((kind) => <option key={kind} value={kind}>{EVENT_KIND_LABELS[kind]}</option>)}
          </select>
        </label>
        <label>
          Recording
          <select className="app-input" value={recordingFilter} onChange={(event) => setRecordingFilter(event.target.value as RecordingFilter)}>
            <option value="all">All recording states</option>
            <option value="recorded">Recorded</option>
            <option value="scheduled">Echo scheduled</option>
            <option value="pending">Confirmation pending</option>
            <option value="not-scheduled">Not scheduled / recorded</option>
            <option value="not-found">No Echo schedule found</option>
          </select>
        </label>
        <details className="shared-calendar-more-filters">
          <summary>More filters</summary>
          <label>
            Student duty
            <select className="app-input" value={studentKey} onChange={(event) => setStudentKey(event.target.value)}>
              <option value="all">All {students.length} students</option>
              {students.map((student) => <option key={student.key} value={student.key}>{student.label}</option>)}
            </select>
          </label>
        </details>
        {filtersActive && <button type="button" className="clinic-duty-reset-button" onClick={resetFilters}>Reset filters</button>}
      </section>

      <section className="shared-calendar-month" aria-labelledby="shared-calendar-month-title">
        <header className="shared-calendar-month-header">
          <div>
            <p className="eyebrow">One month at a time</p>
            <h2 id="shared-calendar-month-title">{monthLabel(displayedMonth)}</h2>
            <p>{monthEvents.length} matching event{monthEvents.length === 1 ? "" : "s"}</p>
          </div>
          <div className="shared-calendar-month-navigation" aria-label="Calendar month navigation">
            <button type="button" disabled={currentMonthIndex === 0} onClick={() => navigateMonth(-1)} aria-label="Previous month">← <span>Previous</span></button>
            <button type="button" className="is-today" onClick={returnToToday}>Today</button>
            <button type="button" disabled={currentMonthIndex === months.length - 1} onClick={() => navigateMonth(1)} aria-label="Next month"><span>Next</span> →</button>
          </div>
        </header>

        <div className="shared-calendar-grid" role="grid" aria-label={`${monthLabel(displayedMonth)} D2 calendar`}>
          {WEEKDAYS.map((weekday) => <div role="columnheader" key={weekday} className="clinic-duty-calendar-weekday">{weekday}</div>)}
          {weeks.flatMap((week, weekNumber) => week.map((day, dayNumber) => {
            if (!day) return <div key={`${weekNumber}-${dayNumber}`} role="gridcell" className="shared-calendar-day is-empty" />;
            const isToday = day.date === today;
            const isSelected = day.date === selectedDate;
            const visibleDayEvents = day.events.slice(0, 3);
            const moreCount = Math.max(0, day.events.length - visibleDayEvents.length);
            return (
              <div
                key={day.date}
                role="gridcell"
                className={`shared-calendar-day${day.events.length === 0 ? " has-no-events" : ""}${isToday ? " is-today" : ""}${isSelected ? " is-selected" : ""}`}
                aria-current={isToday ? "date" : undefined}
              >
                <button type="button" className="shared-calendar-day-select" aria-label={`Show events for ${formatDate(day.date, true)}`} aria-pressed={isSelected} onClick={() => chooseDate(day.date)}>
                  <span className="shared-calendar-day-number">{day.day}</span>
                  {isToday && <span className="shared-calendar-today-badge">Today</span>}
                  <span className="shared-calendar-mobile-count" aria-label={`${day.events.length} events`}>{day.events.length || ""}</span>
                  <span className="shared-calendar-mobile-dots" aria-hidden="true">{day.events.slice(0, 3).map((event) => <i key={event.id} className={courseClass(event.courseCode)} />)}</span>
                </button>
                <div className="shared-calendar-day-events">
                  {visibleDayEvents.map((event) => (
                    <CalendarEvent key={event.id} event={event} openDetails={setSelectedEvent} source={sourceForEvent(calendar.sources, event)} today={today} />
                  ))}
                  {moreCount > 0 && <button type="button" className="shared-calendar-more-button" onClick={() => chooseDate(day.date)}>+{moreCount} more</button>}
                </div>
              </div>
            );
          }))}
        </div>

        <section className="shared-calendar-day-agenda" aria-labelledby="selected-day-heading">
          <header>
            <div>
              <p className="eyebrow">Selected day{selectedDate === today ? " · Today" : ""}</p>
              <h3 id="selected-day-heading">{formatDate(selectedDate, true)}</h3>
            </div>
            <span>{selectedDayEvents.length} event{selectedDayEvents.length === 1 ? "" : "s"}</span>
          </header>
          <div className="shared-calendar-agenda-list">
            {selectedDayEvents.map((event) => (
              <AgendaEvent
                key={event.id}
                canManageDuty={canManageDuty}
                event={event}
                openDetails={setSelectedEvent}
                selectedStudentKey={studentKey}
                setAccessPrompt={setAccessPrompt}
                source={sourceForEvent(calendar.sources, event)}
                today={today}
              />
            ))}
            {selectedDayEvents.length === 0 && (
              <p className="shared-calendar-day-empty">No events match these filters on this day. Choose another date or reset the filters.</p>
            )}
          </div>
        </section>
      </section>

      {selectedEvent && (
        <div className="clinic-duty-access-backdrop" onMouseDown={() => setSelectedEvent(null)}>
          <section className="clinic-duty-access-dialog shared-calendar-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="shared-calendar-detail-title" onMouseDown={(event) => event.stopPropagation()}>
            <button ref={detailCloseButtonRef} type="button" className="clinic-duty-access-close" aria-label="Close event details" onClick={() => setSelectedEvent(null)}>×</button>
            <p className="eyebrow">{selectedEvent.courseCode ?? sourceForEvent(calendar.sources, selectedEvent).label} · {EVENT_KIND_LABELS[selectedEvent.eventKind]}</p>
            <h2 id="shared-calendar-detail-title">{selectedEvent.title}</h2>
            <dl className="shared-calendar-detail-list">
              <div><dt>When</dt><dd>{formatDate(selectedEvent.date, true)} · <EventTime event={selectedEvent} /></dd></div>
              {selectedEvent.location && <div><dt>Location</dt><dd>{selectedEvent.location}</dd></div>}
              {selectedEvent.moduleName && <div><dt>Module</dt><dd>{selectedEvent.moduleName}</dd></div>}
              {selectedRecording && <div><dt>Recording</dt><dd><span className={`shared-calendar-recording-badge is-${selectedRecording.key}`}>{selectedRecording.label}</span>{formatClockWindow(selectedEvent.recordingStart, selectedEvent.recordingEnd) && ` · ${formatClockWindow(selectedEvent.recordingStart, selectedEvent.recordingEnd)}`}</dd></div>}
              {selectedEvent.alternateSchedule && <div><dt>Other source</dt><dd>{selectedEvent.alternateSchedule}. Canvas time is used in this calendar.</dd></div>}
              <div><dt>Source</dt><dd>{selectedEvent.sourceProvenance.join(" · ")}</dd></div>
            </dl>
            <p>{selectedEvent.description}</p>
            {selectedEvent.participants.length > 0 && <p><b>Assigned:</b> {selectedEvent.participants.map((participant) => participant.label).join(" · ")}</p>}
            {selectedEvent.actions.length > 0 && (
              <div className="shared-calendar-detail-actions">
                {selectedEvent.actions.map((action) => (
                  <EventAction key={`${selectedEvent.id}-${action.label}`} action={action} canManageDuty={canManageDuty} className="portal-button" setAccessPrompt={setAccessPrompt} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {accessPrompt && (
        <div className="clinic-duty-access-backdrop" onMouseDown={() => setAccessPrompt(null)}>
          <section className="clinic-duty-access-dialog" role="dialog" aria-modal="true" aria-labelledby="shared-calendar-access-title" onMouseDown={(event) => event.stopPropagation()}>
            <button ref={closeButtonRef} type="button" className="clinic-duty-access-close" aria-label="Close sign-in prompt" onClick={() => setAccessPrompt(null)}>×</button>
            <p className="eyebrow">Protected D2 action</p>
            <h2 id="shared-calendar-access-title">{accessPrompt.title}</h2>
            <p>{accessPrompt.description}</p>
            {isSignedIn ? (
              <div className="clinic-duty-linking-message">
                <b>Your Google account is signed in.</b>
                <p>It still needs to be linked to your approved D2 roster identity before protected class and duty actions can open.</p>
                <Link href="/profile" className="portal-button">View account status</Link>
              </div>
            ) : (
              <SignInPanel returnTo={accessPrompt.returnTo} description="Use your Case Google account. After it is linked to your D2 roster identity, protected class and duty actions can open." />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
