"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { SignInPanel } from "@/components/SignInPanel";
import {
  buildClinicDutyShowcaseCalendar,
  type ClinicDutyShowcase,
  type ClinicDutyShowcaseDate,
} from "@/lib/clinic-duty-showcase-shared";

type ViewMode = "calendar" | "list";

type AccessPrompt = {
  title: string;
  description: string;
  returnTo: string;
};

type ProtectedActionProps = {
  canManageDuty: boolean;
  className: string;
  description: string;
  href: string;
  label: string;
  onLocked: (prompt: AccessPrompt) => void;
  returnTo?: string;
  title: string;
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

function monthKey(date: string) {
  return date.slice(0, 7);
}

function monthLabel(key: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(`${key}-15T12:00:00Z`));
}

function ProtectedAction({
  canManageDuty,
  className,
  description,
  href,
  label,
  onLocked,
  returnTo = href,
  title,
}: ProtectedActionProps) {
  if (canManageDuty) {
    return href.startsWith("/api/") ? (
      <a href={href} className={className}>{label}</a>
    ) : (
      <Link href={href} prefetch={false} className={className}>{label}</Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={() => onLocked({ title, description, returnTo })}
    >
      {label}
    </button>
  );
}

function DutyPair({ duty, selectedStudentKey }: { duty: ClinicDutyShowcaseDate; selectedStudentKey: string }) {
  if (duty.slots.length === 0) return <span>School closed</span>;

  return duty.slots.map((slot) => (
    <span key={slot.id} className={slot.studentKey === selectedStudentKey ? "is-me" : undefined}>
      {slot.name}
    </span>
  ));
}

export function ClinicDutyShowcaseView({
  canManageDuty,
  isSignedIn,
  showcase,
}: {
  canManageDuty: boolean;
  isSignedIn: boolean;
  showcase: ClinicDutyShowcase;
}) {
  const [studentId, setStudentId] = useState("all");
  const [month, setMonth] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [accessPrompt, setAccessPrompt] = useState<AccessPrompt | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const students = useMemo(() => {
    const byId = new Map<string, string>();
    showcase.dates.forEach((date) => date.slots.forEach((slot) => byId.set(slot.studentKey, slot.name)));
    return [...byId.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [showcase.dates]);

  const months = useMemo(
    () => [...new Set(showcase.dates.map((date) => monthKey(date.date)))],
    [showcase.dates],
  );

  const visibleDates = showcase.dates.filter((date) => {
    const matchesStudent = studentId === "all" || date.slots.some((slot) => slot.studentKey === studentId);
    const matchesMonth = month === "all" || monthKey(date.date) === month;
    return matchesStudent && matchesMonth;
  });

  const visibleMonthKeys = new Set(visibleDates.map((date) => monthKey(date.date)));
  const calendarMonths = visibleDates.length === 0
    ? []
    : month === "all"
      ? months.filter((value) => visibleMonthKeys.has(value))
      : [month];
  const selectedStudent = students.find((student) => student.id === studentId);

  useEffect(() => {
    if (!accessPrompt) return;
    closeButtonRef.current?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setAccessPrompt(null);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [accessPrompt]);

  const protectedActions = [
    {
      title: "View your assigned duties",
      description: "Sign in to highlight your assignments, open a checklist, or release one of your future duties.",
      label: "My duties",
      href: "/clinic-duty?view=mine",
      copy: "See only your dates, open the shared-space checklist, and submit completion.",
    },
    {
      title: "Claim an available duty",
      description: "Sign in to see duties classmates have released and accept responsibility for an available slot.",
      label: "Open duties",
      href: "/clinic-duty?view=open",
      copy: "Browse released dates. Responsibility transfers only after a valid claim.",
    },
    {
      title: "Change responsibility",
      description: "Sign in to release your date or offer a direct swap with another future assignment.",
      label: "Change responsibility",
      href: "/clinic-duty?view=trades",
      copy: "A release keeps you responsible until claimed; a trade changes only after acceptance.",
    },
    {
      title: "Download your duty calendar",
      description: "Sign in to download a private calendar containing your current assignments and reminders.",
      label: "My calendar (.ics)",
      href: "/api/clinic-duty/calendar.ics",
      returnTo: "/clinic-duty?view=mine",
      copy: "Add your current assignments and a 24-hour reminder to your calendar app.",
    },
  ];

  return (
    <div className="clinic-duty-showcase-stack">
      <section className="clinic-duty-showcase-stats" aria-label="Schedule summary">
        <div><span>D2 students</span><b>{showcase.summary.students}</b></div>
        <div><span>Open dates</span><b>{showcase.summary.openDates}</b></div>
        <div><span>Duty slots</span><b>{showcase.summary.dutySlots}</b></div>
        <div><span>Duties each</span><b>{showcase.summary.minimumDuties}–{showcase.summary.maximumDuties}</b></div>
      </section>

      <section className="clinic-duty-showcase-actions" aria-labelledby="duty-actions-title">
        <div className="clinic-duty-showcase-actions-heading">
          <div>
            <p className="eyebrow">What students can do</p>
            <h2 id="duty-actions-title">The full workflow is visible.</h2>
            <p>Schedule browsing is public. Personal records and every responsibility-changing action require a linked D2 account.</p>
          </div>
          <span className="clinic-duty-status">{canManageDuty ? "Account linked" : "Sign in required"}</span>
        </div>
        <div className="clinic-duty-showcase-action-grid">
          {protectedActions.map((action) => (
            <article key={action.label}>
              <h3>{action.label}</h3>
              <p>{action.copy}</p>
              <ProtectedAction
                canManageDuty={canManageDuty}
                className="clinic-duty-protected-action"
                description={action.description}
                href={action.href}
                label={`${action.label} →`}
                onLocked={setAccessPrompt}
                returnTo={action.returnTo}
                title={action.title}
              />
            </article>
          ))}
        </div>
      </section>

      <section className="clinic-duty-showcase-controls" aria-label="Filter the duty schedule">
        <div>
          <p className="eyebrow">Find an assignment</p>
          <h2>{selectedStudent ? `${selectedStudent.name}'s duties` : "Full class schedule"}</h2>
          <p>{visibleDates.length} date{visibleDates.length === 1 ? "" : "s"} shown</p>
        </div>
        <label>
          Student
          <select className="app-input" value={studentId} onChange={(event) => setStudentId(event.target.value)}>
            <option key="all-students" value="all">All 82 students</option>
            {students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
          </select>
        </label>
        <label>
          Month
          <select className="app-input" value={month} onChange={(event) => setMonth(event.target.value)}>
            <option key="all-months" value="all">All months</option>
            {months.map((value) => <option key={value} value={value}>{monthLabel(value)}</option>)}
          </select>
        </label>
        <div className="clinic-duty-showcase-view-toggle" aria-label="Schedule format">
          <button type="button" aria-pressed={viewMode === "calendar"} onClick={() => setViewMode("calendar")}>Calendar</button>
          <button type="button" aria-pressed={viewMode === "list"} onClick={() => setViewMode("list")}>List</button>
        </div>
        {(studentId !== "all" || month !== "all") && (
          <button type="button" className="clinic-duty-reset-button" onClick={() => { setStudentId("all"); setMonth("all"); }}>
            Reset filters
          </button>
        )}
      </section>

      {viewMode === "calendar" ? (
        <section className="clinic-duty-calendar-stack" aria-label="Calendar view of the randomized Sim Clinic Duty schedule">
          {calendarMonths.map((calendarMonth) => {
            const weeks = buildClinicDutyShowcaseCalendar(visibleDates, calendarMonth);
            return (
              <section className="clinic-duty-calendar-month" key={calendarMonth} aria-labelledby={`calendar-${calendarMonth}`}>
                <header>
                  <div>
                    <p className="eyebrow">Calendar view</p>
                    <h3 id={`calendar-${calendarMonth}`}>{monthLabel(calendarMonth)}</h3>
                  </div>
                  <span>{weeks.flat().filter(Boolean).length} visible date{weeks.flat().filter(Boolean).length === 1 ? "" : "s"}</span>
                </header>
                <div className="clinic-duty-calendar-scroll">
                  <div className="clinic-duty-calendar" role="grid" aria-label={`${monthLabel(calendarMonth)} duty calendar`}>
                    {WEEKDAYS.map((weekday) => <div role="columnheader" key={weekday} className="clinic-duty-calendar-weekday">{weekday}</div>)}
                    {weeks.flatMap((week, weekIndex) => week.map((duty, dayIndex) => {
                      if (!duty) return <div key={`${weekIndex}-${dayIndex}`} role="gridcell" className="clinic-duty-calendar-day is-empty" />;
                      return (
                        <article key={duty.id} role="gridcell" className={`clinic-duty-calendar-day${duty.dateStatus === "closed" ? " is-closed" : ""}`}>
                          <div className="clinic-duty-calendar-date">
                            <b>{Number(duty.date.slice(-2))}</b>
                            <span>{duty.dateStatus === "closed" ? "Closed" : formatTime(duty.closesAt)}</span>
                          </div>
                          <div className="clinic-duty-calendar-pair">
                            <DutyPair duty={duty} selectedStudentKey={studentId} />
                          </div>
                          {duty.dateStatus === "open" && (
                            <ProtectedAction
                              canManageDuty={canManageDuty}
                              className="clinic-duty-calendar-action"
                              description={`Sign in to open your duty tools for ${formatDate(duty.date)}. Only an assigned student can release or trade this responsibility.`}
                              href={`/clinic-duty?view=mine&date=${duty.date}`}
                              label="Change duty"
                              onLocked={setAccessPrompt}
                              title={`Change responsibility for ${formatDate(duty.date)}`}
                            />
                          )}
                        </article>
                      );
                    }))}
                  </div>
                </div>
              </section>
            );
          })}
          {visibleDates.length === 0 && <p className="clinic-duty-empty">No dates match these filters.</p>}
        </section>
      ) : (
        <section className="clinic-duty-grid" aria-label="List view of the randomized Sim Clinic Duty schedule">
          {visibleDates.map((duty) => (
            <article className="clinic-duty-card" key={duty.id}>
              <div className="clinic-duty-card-date">
                <p>{formatDate(duty.date)}</p>
                <span>{formatTime(duty.opensAt)}–{formatTime(duty.closesAt)}</span>
              </div>
              <div className="clinic-duty-pair" aria-label={duty.dateStatus === "open" ? "Assigned duty pair" : "Closed date"}>
                <DutyPair duty={duty} selectedStudentKey={studentId} />
              </div>
              <div className="clinic-duty-card-actions">
                <span className={`clinic-duty-status clinic-duty-status-${duty.dateStatus === "closed" ? "closed" : "scheduled"}`}>
                  {duty.dateStatus === "closed" ? "Closed" : "Scheduled"}
                </span>
                <small>{duty.closureReason ?? "Two students share responsibility for Lab and Sim Clinic common areas."}</small>
                {duty.dateStatus === "open" && (
                  <ProtectedAction
                    canManageDuty={canManageDuty}
                    className="clinic-duty-protected-action is-compact"
                    description={`Sign in to open your duty tools for ${formatDate(duty.date)}. Only an assigned student can release or trade this responsibility.`}
                    href={`/clinic-duty?view=mine&date=${duty.date}`}
                    label="Change duty"
                    onLocked={setAccessPrompt}
                    title={`Change responsibility for ${formatDate(duty.date)}`}
                  />
                )}
              </div>
            </article>
          ))}
          {visibleDates.length === 0 && <p className="clinic-duty-empty">No dates match these filters.</p>}
        </section>
      )}

      <section className="clinic-duty-showcase-activation" aria-labelledby="activation-title">
        <div>
          <p className="eyebrow">Account linking</p>
          <h2 id="activation-title">The schedule already belongs to roster identities.</h2>
          <p>
            When a student signs in with Case Google, Rick or a student delegate links that account to the matching roster name once. My Duties, trades, checklists, and photo submission then unlock for that student.
          </p>
        </div>
        <ol>
          <li><span>1</span><p><b>Browse publicly</b> Calendar, list, names, dates, and hours stay visible.</p></li>
          <li><span>2</span><p><b>Sign in once</b> Match the Case Google account to the existing roster identity.</p></li>
          <li><span>3</span><p><b>Manage privately</b> Release, trade, claim, complete, or download personal duties.</p></li>
        </ol>
        <ProtectedAction
          canManageDuty={canManageDuty}
          className="public-core-primary-action"
          description="Sign in to open your personal Sim Clinic Duty workspace."
          href="/clinic-duty?view=mine"
          label={canManageDuty ? "Open my duty workspace →" : "Sign in to manage duties →"}
          onLocked={setAccessPrompt}
          title="Open your Sim Clinic Duty workspace"
        />
      </section>

      {accessPrompt && (
        <div className="clinic-duty-access-backdrop" onMouseDown={() => setAccessPrompt(null)}>
          <section
            className="clinic-duty-access-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="clinic-duty-access-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button ref={closeButtonRef} type="button" className="clinic-duty-access-close" aria-label="Close sign-in prompt" onClick={() => setAccessPrompt(null)}>×</button>
            <p className="eyebrow">Protected student action</p>
            <h2 id="clinic-duty-access-title">{accessPrompt.title}</h2>
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
