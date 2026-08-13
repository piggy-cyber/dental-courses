"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { SignInPanel } from "@/components/SignInPanel";
import type {
  D2LabProjectDetailStatus,
  D2LabProjectSession,
} from "@/lib/d2-lab-projects";
import {
  buildD2LabProjectMonth,
  getD2LabProjectSelectedDate,
} from "@/lib/d2-lab-projects";

type LabProjectView = "month" | "list";

const DETAIL_LABELS: Record<D2LabProjectDetailStatus, string> = {
  detailed: "Projects + topics published",
  "topic-only": "Lab topic published",
  "schedule-only": "Project details pending",
};

const KIND_LABELS: Record<D2LabProjectSession["kind"], string> = {
  "project-work": "Project work",
  lab: "Lab",
  competency: "Competency",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function easternDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatClock(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
}

function monthLabel(month: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(`${month}-15T12:00:00Z`));
}

function courseClass(courseCode: string) {
  return `course-${courseCode.toLowerCase().replaceAll(" ", "-")}`;
}

function timingForDate(date: string, today: string) {
  if (date === today) return "Today";
  if (date < today) return "Earlier";
  return "Upcoming";
}

function LabProjectCard({
  canOpenCanvas,
  session,
  setAccessSession,
  today,
}: {
  canOpenCanvas: boolean;
  session: D2LabProjectSession;
  setAccessSession: (session: D2LabProjectSession) => void;
  today: string;
}) {
  return (
    <article id={session.id} className={`lab-project-card ${courseClass(session.courseCode)}${session.date < today ? " is-earlier" : ""}`}>
      <div className="lab-project-card-heading">
        <div>
          <span className="lab-project-course">{session.courseCode}</span>
          <span className={`lab-project-kind is-${session.kind}`}>{KIND_LABELS[session.kind]}</span>
          <span className={`lab-project-detail-state is-${session.detailStatus}`}>{DETAIL_LABELS[session.detailStatus]}</span>
        </div>
        <span className="lab-project-section">{session.section}</span>
      </div>
      <h3>{session.title}</h3>
      <p className="lab-project-meta">
        {formatClock(session.startsAt)}{session.endsAt ? `–${formatClock(session.endsAt)}` : " · End time not published"}
        {session.location ? ` · ${session.location}` : ""}
        {session.moduleName ? ` · ${session.moduleName}` : ""}
      </p>

      {session.lectureTopics.length > 0 && (
        <section className="lab-project-content-block">
          <h4>{session.detailStatus === "topic-only" ? "Published lab topic" : "Lecture / demonstration topics"}</h4>
          <ul>{session.lectureTopics.map((topic) => <li key={topic}>{topic}</li>)}</ul>
        </section>
      )}

      {session.projectTasks.length > 0 && (
        <section className="lab-project-content-block is-projects">
          <h4>Projects / lab work</h4>
          <ul>{session.projectTasks.map((task) => <li key={task}>{task}</li>)}</ul>
        </section>
      )}

      {session.detailStatus === "schedule-only" && (
        <p className="lab-project-pending-note">
          {session.title === "Project 1"
            ? "Project 1 is identified, but its required steps and deliverables are not available in the saved sources. Check the Canvas event or course module before this lab."
            : "The lab date and section are published, but the daily project/topic is not named in the saved Canvas calendar. Check the Canvas event or course module before this lab."}
        </p>
      )}

      <footer>
        <small>Source: {session.sourceProvenance.join(" · ")}</small>
        {session.canvasUrl && (
          canOpenCanvas ? (
            <a href={session.canvasUrl} target="_blank" rel="noreferrer">Open Canvas event →</a>
          ) : (
            <button type="button" onClick={() => setAccessSession(session)}>Open Canvas event →</button>
          )
        )}
      </footer>
    </article>
  );
}

export function D2LabProjects({
  canOpenCanvas,
  initialToday,
  isSignedIn,
  sessions,
}: {
  canOpenCanvas: boolean;
  initialToday: string;
  isSignedIn: boolean;
  sessions: D2LabProjectSession[];
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const months = useMemo(
    () => [...new Set(sessions.map((session) => session.date.slice(0, 7)))].sort(),
    [sessions],
  );
  const initialMonth = months.find((month) => month >= initialToday.slice(0, 7)) ?? months.at(-1) ?? initialToday.slice(0, 7);
  const [today, setToday] = useState(initialToday);
  const [view, setView] = useState<LabProjectView>("month");
  const [displayedMonth, setDisplayedMonth] = useState(initialMonth);
  const [selectedDate, setSelectedDate] = useState(() => getD2LabProjectSelectedDate(initialMonth, initialToday, sessions));
  const [courseCode, setCourseCode] = useState("all");
  const [section, setSection] = useState("all");
  const [detailStatus, setDetailStatus] = useState<"all" | D2LabProjectDetailStatus>("all");
  const [showPrevious, setShowPrevious] = useState(false);
  const [accessSession, setAccessSession] = useState<D2LabProjectSession | null>(null);

  useEffect(() => {
    const updateToday = () => {
      const nextToday = easternDateKey();
      setToday((currentToday) => {
        if (nextToday === currentToday) return currentToday;
        const todayMonth = nextToday.slice(0, 7);
        if (months.includes(todayMonth)) setDisplayedMonth(todayMonth);
        setSelectedDate(nextToday);
        return nextToday;
      });
    };
    const timer = window.setInterval(updateToday, 60_000);
    return () => window.clearInterval(timer);
  }, [months]);

  useEffect(() => {
    if (!accessSession) return;
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccessSession(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [accessSession]);

  const courseCodes = useMemo(
    () => [...new Set(sessions.map((session) => session.courseCode))].sort(),
    [sessions],
  );

  const filteredSessions = useMemo(() => sessions.filter((session) => (
    (courseCode === "all" || session.courseCode === courseCode)
    && (section === "all" || session.section === section)
    && (detailStatus === "all" || session.detailStatus === detailStatus)
  )), [courseCode, detailStatus, section, sessions]);

  const previousDateCount = useMemo(
    () => new Set(filteredSessions.filter((session) => session.date < today).map((session) => session.date)).size,
    [filteredSessions, today],
  );

  const visibleSessions = useMemo(
    () => showPrevious
      ? filteredSessions
      : filteredSessions.filter((session) => session.date >= today),
    [filteredSessions, showPrevious, today],
  );

  const sessionsByDate = useMemo(() => {
    const dates = new Map<string, D2LabProjectSession[]>();
    for (const session of visibleSessions) {
      const dateSessions = dates.get(session.date) ?? [];
      dateSessions.push(session);
      dates.set(session.date, dateSessions);
    }
    return [...dates.entries()];
  }, [visibleSessions]);

  const nextSession = visibleSessions.find((session) => session.date >= today) ?? null;
  const sessionsToday = filteredSessions.filter((session) => session.date === today);
  const selectedDaySessions = visibleSessions.filter((session) => session.date === selectedDate);
  const monthSessions = visibleSessions.filter((session) => session.date.startsWith(`${displayedMonth}-`));
  const calendarWeeks = useMemo(
    () => buildD2LabProjectMonth(visibleSessions, displayedMonth),
    [displayedMonth, visibleSessions],
  );
  const currentMonthIndex = Math.max(0, months.indexOf(displayedMonth));
  const filtersActive = courseCode !== "all" || section !== "all" || detailStatus !== "all" || showPrevious;

  function resetFilters() {
    setCourseCode("all");
    setSection("all");
    setDetailStatus("all");
    setShowPrevious(false);
  }

  function jumpToNextSession() {
    if (!nextSession) return;
    if (view === "month") {
      setDisplayedMonth(nextSession.date.slice(0, 7));
      setSelectedDate(nextSession.date);
      window.requestAnimationFrame(() => document.getElementById("lab-projects-calendar")?.scrollIntoView({ behavior: "smooth", block: "start" }));
      return;
    }
    document.getElementById(nextSession.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function navigateMonth(direction: -1 | 1) {
    const nextMonth = months[currentMonthIndex + direction];
    if (!nextMonth) return;
    setDisplayedMonth(nextMonth);
    setSelectedDate(getD2LabProjectSelectedDate(nextMonth, today, visibleSessions));
  }

  function returnToToday() {
    const todayMonth = today.slice(0, 7);
    if (months.includes(todayMonth)) setDisplayedMonth(todayMonth);
    setSelectedDate(today);
  }

  return (
    <div className="lab-projects-stack">
      <section className="lab-projects-today" aria-current="date">
        <div className="lab-projects-today-copy">
          <p className="eyebrow">Today · Eastern time</p>
          <h2>{formatDate(today)}</h2>
          {sessionsToday.length > 0 ? (
            <div className="lab-projects-today-sessions">
              {sessionsToday.map((session) => (
                <article key={session.id} className={courseClass(session.courseCode)}>
                  <span>{session.courseCode} · {session.section}</span>
                  <b>{session.title}</b>
                  <small>{formatClock(session.startsAt)}{session.endsAt ? `–${formatClock(session.endsAt)}` : " · End time pending"}{session.location ? ` · ${session.location}` : ""}</small>
                </article>
              ))}
            </div>
          ) : (
            <div className="lab-projects-no-lab-today">
              <b>No lab scheduled today.</b>
              {nextSession && (
                <span>Next: {formatDate(nextSession.date)} · {formatClock(nextSession.startsAt)} · {nextSession.courseCode} · {nextSession.title}</span>
              )}
            </div>
          )}
        </div>
        <div className="lab-projects-view-actions">
          <div className="lab-projects-view-switch" role="group" aria-label="Lab projects view">
            <button type="button" aria-pressed={view === "month"} onClick={() => setView("month")}>Month</button>
            <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>List</button>
          </div>
          <button type="button" className="clinic-duty-protected-action" disabled={!nextSession} onClick={jumpToNextSession}>Go to next lab</button>
          <button
            type="button"
            className="clinic-duty-reset-button"
            aria-controls="lab-projects-schedule"
            aria-expanded={showPrevious}
            disabled={previousDateCount === 0}
            onClick={() => setShowPrevious((current) => !current)}
          >
            {showPrevious ? "Hide previous dates" : `Show previous dates (${previousDateCount})`}
          </button>
        </div>
      </section>

      <div id="lab-projects-schedule">
        {view === "month" ? (
          <section id="lab-projects-calendar" className="lab-projects-month" aria-labelledby="lab-projects-month-title">
            <header className="lab-projects-month-header">
              <div>
                <p className="eyebrow">Month view</p>
                <h2 id="lab-projects-month-title">{monthLabel(displayedMonth)}</h2>
                <p>{monthSessions.length} lab session{monthSessions.length === 1 ? "" : "s"}</p>
              </div>
              <div className="lab-projects-month-navigation" aria-label="Lab project month navigation">
                <button type="button" disabled={currentMonthIndex === 0} onClick={() => navigateMonth(-1)} aria-label="Previous lab month">← <span>Previous</span></button>
                <button type="button" className="is-today" onClick={returnToToday}>Today</button>
                <button type="button" disabled={currentMonthIndex === months.length - 1} onClick={() => navigateMonth(1)} aria-label="Next lab month"><span>Next</span> →</button>
              </div>
            </header>

            <div className="lab-projects-course-legend" aria-label="Lab course color key">
              {courseCodes.map((code) => <span key={code} className={courseClass(code)}><i aria-hidden="true" />{code}</span>)}
            </div>

            <div className="lab-projects-month-grid" role="grid" aria-label={`${monthLabel(displayedMonth)} lab projects`}>
              {WEEKDAYS.map((weekday) => <div role="columnheader" key={weekday}>{weekday}</div>)}
              {calendarWeeks.flatMap((week, weekIndex) => week.map((day, dayIndex) => {
                if (!day) return <div key={`${weekIndex}-${dayIndex}`} role="gridcell" className="lab-projects-month-day is-empty" />;
                const isToday = day.date === today;
                const isSelected = day.date === selectedDate;
                return (
                  <div key={day.date} role="gridcell" className={`lab-projects-month-day${isToday ? " is-today" : ""}${isSelected ? " is-selected" : ""}${day.sessions.length === 0 ? " has-no-sessions" : ""}`} aria-current={isToday ? "date" : undefined}>
                    <button type="button" aria-label={`Show labs for ${formatDate(day.date)}`} aria-pressed={isSelected} onClick={() => setSelectedDate(day.date)}>
                      <span className="lab-projects-month-day-number">{day.day}</span>
                      {isToday && <span className="lab-projects-month-today-badge">Today</span>}
                      <span className="lab-projects-month-count">{day.sessions.length || ""}</span>
                      <span className="lab-projects-month-dots" aria-hidden="true">{day.sessions.slice(0, 3).map((session) => <i key={session.id} className={courseClass(session.courseCode)} />)}</span>
                    </button>
                    <div className="lab-projects-month-previews">
                      {day.sessions.slice(0, 2).map((session) => (
                        <button key={session.id} type="button" className={courseClass(session.courseCode)} onClick={() => setSelectedDate(day.date)}>
                          <span>{session.courseCode}</span>
                          <b>{session.title}</b>
                        </button>
                      ))}
                      {day.sessions.length > 2 && <small>+{day.sessions.length - 2} more</small>}
                    </div>
                  </div>
                );
              }))}
            </div>

            <section className="lab-projects-selected-day" aria-labelledby="lab-projects-selected-day-title">
              <header>
                <div>
                  <p className="eyebrow">Selected day{selectedDate === today ? " · Today" : ""}</p>
                  <h3 id="lab-projects-selected-day-title">{formatDate(selectedDate)}</h3>
                </div>
                <span>{selectedDaySessions.length} session{selectedDaySessions.length === 1 ? "" : "s"}</span>
              </header>
              <div className="lab-projects-selected-day-list">
                {selectedDaySessions.map((session) => (
                  <LabProjectCard key={session.id} canOpenCanvas={canOpenCanvas} session={session} setAccessSession={setAccessSession} today={today} />
                ))}
                {selectedDaySessions.length === 0 && (
                  <p className="lab-projects-selected-day-empty">
                    {selectedDate < today && !showPrevious
                      ? "Previous lab sessions are hidden. Use “Show previous dates” above to include them."
                      : "No lab sessions are scheduled for this date."}
                  </p>
                )}
              </div>
            </section>
          </section>
        ) : (
          <section id="lab-projects-timeline" className="lab-projects-timeline" aria-label="D2 lab projects in chronological order">
            {sessionsByDate.map(([date, dateSessions]) => {
              const timingLabel = timingForDate(date, today);
              return (
                <section key={date} className={`lab-projects-day${date === today ? " is-today" : ""}`} aria-current={date === today ? "date" : undefined}>
                  <header>
                    <div>
                      <span>{timingLabel}</span>
                      <h2>{formatDate(date)}</h2>
                    </div>
                    <b>{dateSessions.length} session{dateSessions.length === 1 ? "" : "s"}</b>
                  </header>
                  <div className="lab-projects-day-list">
                    {dateSessions.map((session) => (
                      <LabProjectCard key={session.id} canOpenCanvas={canOpenCanvas} session={session} setAccessSession={setAccessSession} today={today} />
                    ))}
                  </div>
                </section>
              );
            })}
          </section>
        )}

        {visibleSessions.length === 0 && (
          <div className="clinic-duty-empty">
            <p>No lab sessions match these filters.</p>
            <button type="button" className="clinic-duty-protected-action" onClick={resetFilters}>Show all sessions</button>
          </div>
        )}
      </div>

      <details className="lab-projects-filter-panel">
        <summary>
          <span>Filters</span>
          <small>{filtersActive ? "Filtered" : "All lab courses"} · {visibleSessions.length} sessions shown</small>
        </summary>
        <section className="lab-projects-controls" aria-label="Filter lab projects">
          <label>
            Course
            <select className="app-input" value={courseCode} onChange={(event) => setCourseCode(event.target.value)}>
              <option value="all">All lab courses</option>
              {courseCodes.map((code) => <option key={code} value={code}>{code}</option>)}
            </select>
          </label>
          <label>
            Section
            <select className="app-input" value={section} onChange={(event) => setSection(event.target.value)}>
              <option value="all">All sections</option>
              <option value="Group A">Group A</option>
              <option value="Group B">Group B</option>
              <option value="Whole class">Whole class</option>
            </select>
          </label>
          <label>
            Published detail
            <select className="app-input" value={detailStatus} onChange={(event) => setDetailStatus(event.target.value as "all" | D2LabProjectDetailStatus)}>
              <option value="all">All detail states</option>
              <option value="detailed">Projects + topics</option>
              <option value="topic-only">Lab topic only</option>
              <option value="schedule-only">Project details pending</option>
            </select>
          </label>
          {filtersActive && <button type="button" className="clinic-duty-reset-button" onClick={resetFilters}>Reset filters</button>}
        </section>
      </details>

      {accessSession && (
        <div className="clinic-duty-access-backdrop" onMouseDown={() => setAccessSession(null)}>
          <section className="clinic-duty-access-dialog" role="dialog" aria-modal="true" aria-labelledby="lab-projects-access-title" onMouseDown={(event) => event.stopPropagation()}>
            <button ref={closeButtonRef} type="button" className="clinic-duty-access-close" aria-label="Close sign-in prompt" onClick={() => setAccessSession(null)}>×</button>
            <p className="eyebrow">Protected D2 action</p>
            <h2 id="lab-projects-access-title">Open {accessSession.courseCode} in Canvas</h2>
            <p>Canvas event links are reserved for approved, linked D2 accounts.</p>
            {isSignedIn ? (
              <div className="clinic-duty-linking-message">
                <b>Your Google account is signed in.</b>
                <p>Link it to your approved D2 roster identity to open protected course links.</p>
                <Link href="/profile" className="portal-button">View account status</Link>
              </div>
            ) : (
              <SignInPanel returnTo="/lab-projects" description="Use your Case Google account. Once linked to your approved D2 roster identity, protected Canvas links can open." />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
