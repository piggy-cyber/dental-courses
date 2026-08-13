"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { SignInPanel } from "@/components/SignInPanel";
import type {
  D2LabProjectDetailStatus,
  D2LabProjectSession,
} from "@/lib/d2-lab-projects";

type TimingFilter = "all" | "upcoming";

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

function courseClass(courseCode: string) {
  return `course-${courseCode.toLowerCase().replaceAll(" ", "-")}`;
}

function timingForDate(date: string, today: string) {
  if (date === today) return "Today";
  if (date < today) return "Earlier";
  return "Upcoming";
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
  const [today, setToday] = useState(initialToday);
  const [courseCode, setCourseCode] = useState("all");
  const [section, setSection] = useState("all");
  const [detailStatus, setDetailStatus] = useState<"all" | D2LabProjectDetailStatus>("all");
  const [timing, setTiming] = useState<TimingFilter>("all");
  const [accessSession, setAccessSession] = useState<D2LabProjectSession | null>(null);

  useEffect(() => {
    const updateToday = () => setToday(easternDateKey());
    const timer = window.setInterval(updateToday, 60_000);
    return () => window.clearInterval(timer);
  }, []);

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

  const visibleSessions = useMemo(() => sessions.filter((session) => (
    (courseCode === "all" || session.courseCode === courseCode)
    && (section === "all" || session.section === section)
    && (detailStatus === "all" || session.detailStatus === detailStatus)
    && (timing === "all" || session.date >= today)
  )), [courseCode, detailStatus, section, sessions, timing, today]);

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
  const filtersActive = courseCode !== "all" || section !== "all" || detailStatus !== "all" || timing !== "all";

  function resetFilters() {
    setCourseCode("all");
    setSection("all");
    setDetailStatus("all");
    setTiming("all");
  }

  function jumpToNextSession() {
    if (!nextSession) return;
    document.getElementById(nextSession.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="lab-projects-stack">
      <section className="lab-projects-controls" aria-label="Filter lab projects">
        <div className="lab-projects-controls-heading">
          <p className="eyebrow">Chronological work list</p>
          <h2>{visibleSessions.length} session{visibleSessions.length === 1 ? "" : "s"}</h2>
          <p>All dates remain visible by default. Earlier sessions are never marked complete automatically.</p>
        </div>
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
        <label>
          Timing
          <select className="app-input" value={timing} onChange={(event) => setTiming(event.target.value as TimingFilter)}>
            <option value="all">All dates</option>
            <option value="upcoming">Today + upcoming</option>
          </select>
        </label>
        <div className="lab-projects-control-actions">
          <button type="button" className="clinic-duty-protected-action" disabled={!nextSession} onClick={jumpToNextSession}>Jump to next</button>
          {filtersActive && <button type="button" className="clinic-duty-reset-button" onClick={resetFilters}>Reset</button>}
        </div>
      </section>

      <section className="lab-projects-timeline" aria-label="D2 lab projects in chronological order">
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
                  <article id={session.id} key={session.id} className={`lab-project-card ${courseClass(session.courseCode)}${session.date < today ? " is-earlier" : ""}`}>
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
                        The lab date and section are published, but the daily project/topic is not named in the saved Canvas calendar. Check the Canvas event or course module before this lab.
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
                ))}
              </div>
            </section>
          );
        })}

        {visibleSessions.length === 0 && (
          <div className="clinic-duty-empty">
            <p>No lab sessions match these filters.</p>
            <button type="button" className="clinic-duty-protected-action" onClick={resetFilters}>Show all sessions</button>
          </div>
        )}
      </section>

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
