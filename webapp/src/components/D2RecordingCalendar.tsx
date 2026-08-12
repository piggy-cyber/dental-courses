"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  courses,
  d2RecordingCalendar,
  type CourseId,
  type D2RecordingEvent,
  type RecordingStatus,
} from "@/lib/d2-recording-calendar";
import styles from "./D2RecordingCalendar.module.css";

const STORAGE_KEY = "fourth-canal-d2-recording-calendar-v1";

const STATUS_LABELS: Record<RecordingStatus, string> = {
  recorded: "Recorded",
  scheduled: "Scheduled to record",
  "not-recorded": "Not recorded",
  "not-scheduled": "No recording scheduled",
  unknown: "Unknown / needs checking",
};

const STATUS_CLASSES: Record<RecordingStatus, string> = {
  recorded: styles.statusRecorded,
  scheduled: styles.statusScheduled,
  "not-recorded": styles.statusNotRecorded,
  "not-scheduled": styles.statusNotScheduled,
  unknown: styles.statusUnknown,
};

type EventOverride = {
  recordingStatus?: RecordingStatus;
  moduleName?: string;
  notes?: string;
};

type EventOverrides = Record<string, EventOverride>;
type DisplayEvent = D2RecordingEvent & { notes?: string };

function readOverrides(): EventOverrides {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as EventOverrides;
  } catch {
    return {};
  }
}

function formatTime(time: string | null) {
  if (!time) return "—";
  const [hours, minutes] = time.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour = hours % 12 || 12;
  return `${hour}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function dateFromIso(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(dateFromIso(date));
}

function isoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function initialMonth() {
  const today = new Date();
  if (today.getFullYear() === 2026 && today.getMonth() >= 7 && today.getMonth() <= 9) {
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }
  return new Date(2026, 7, 1);
}

export function D2RecordingCalendar({ initialEventId }: { initialEventId?: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [visibleMonth, setVisibleMonth] = useState(initialMonth);
  const [courseFilter, setCourseFilter] = useState<"all" | CourseId>("all");
  const [overrides, setOverrides] = useState<EventOverrides>({});
  const initialEvent = d2RecordingCalendar.events.find((event) => event.id === initialEventId);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(initialEvent?.id ?? null);
  const [draftStatus, setDraftStatus] = useState<RecordingStatus>(initialEvent?.recordingStatus ?? "unknown");
  const [draftModule, setDraftModule] = useState(initialEvent?.moduleName ?? "");
  const [draftNotes, setDraftNotes] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setOverrides(readOverrides()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!initialEvent) return;
    const timer = window.setTimeout(() => {
      setSelectedEventId(initialEvent.id);
      setDraftStatus(initialEvent.recordingStatus);
      setDraftModule(initialEvent.moduleName);
      setDraftNotes("");
      setSaveMessage("");
      dialogRef.current?.showModal();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialEvent]);

  const events = useMemo(
    () =>
      d2RecordingCalendar.events
        .map((event) => ({ ...event, ...(overrides[event.id] ?? {}) }) as DisplayEvent)
        .filter((event) => courseFilter === "all" || event.courseId === courseFilter)
        .sort(
          (a, b) =>
            a.date.localeCompare(b.date) || a.classStart.localeCompare(b.classStart)
        ),
    [courseFilter, overrides]
  );

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const monthEvents = events.filter((event) => {
    const date = dateFromIso(event.date);
    return date.getFullYear() === year && date.getMonth() === month;
  });

  const firstDay = new Date(year, month, 1);
  const gridStart = new Date(year, month, 1 - firstDay.getDay());
  const days = Array.from({ length: 42 }, (_, offset) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + offset);
    const date = isoDate(day);
    return {
      date,
      day,
      events: events.filter((event) => event.date === date),
    };
  });

  function openEvent(event: DisplayEvent) {
    setSelectedEventId(event.id);
    setDraftStatus(event.recordingStatus);
    setDraftModule(event.moduleName);
    setDraftNotes(event.notes ?? "");
    setSaveMessage("");
    requestAnimationFrame(() => dialogRef.current?.showModal());
  }

  function saveEvent() {
    if (!selectedEventId) return;
    const nextOverrides = {
      ...overrides,
      [selectedEventId]: {
        ...(overrides[selectedEventId] ?? {}),
        recordingStatus: draftStatus,
        moduleName: draftModule.trim() || "Module not mapped yet",
        notes: draftNotes.trim(),
      },
    };
    setOverrides(nextOverrides);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextOverrides));
    setSaveMessage("Saved on this browser.");
  }

  return (
    <div className={styles.calendarPage}>
      <header className={styles.header}>
        <div>
          <p className="eyebrow">Fall 2026 · D2 workspace</p>
          <h1 className="portal-title text-3xl font-bold sm:text-4xl">Recording calendar</h1>
          <p className={styles.subtitle}>
            Class schedule, recording availability, Echo360 access, and module details in one view.
          </p>
        </div>
        <div className={styles.sourceNote} aria-label="Schedule source timestamp">
          <span>Schedule checked</span>
          <strong>August 11, 2026 · 8:49 AM EDT</strong>
          <small>{d2RecordingCalendar.sourceLabel}</small>
        </div>
      </header>

      <section className={styles.controls} aria-label="Calendar controls">
        <div className={styles.monthControls}>
          <button
            className={styles.secondaryButton}
            type="button"
            aria-label="Previous month"
            onClick={() => setVisibleMonth(new Date(year, month - 1, 1))}
          >
            ←
          </button>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={() => setVisibleMonth(initialMonth())}
          >
            Today
          </button>
          <button
            className={styles.secondaryButton}
            type="button"
            aria-label="Next month"
            onClick={() => setVisibleMonth(new Date(year, month + 1, 1))}
          >
            →
          </button>
          <h2 aria-live="polite">
            {new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
              visibleMonth
            )}
          </h2>
        </div>
        <label className={styles.courseFilter}>
          <span>Course</span>
          <select
            value={courseFilter}
            onChange={(event) => setCourseFilter(event.target.value as "all" | CourseId)}
          >
            <option value="all">All D2 courses</option>
            {Object.entries(courses)
              .sort(([, a], [, b]) => a.code.localeCompare(b.code))
              .map(([id, course]) => (
                <option key={id} value={id}>
                  {course.code} — {course.name}
                </option>
              ))}
          </select>
        </label>
      </section>

      <section className={styles.summaryRow} aria-label="Visible recording totals">
        <div><span>Classes</span><strong>{monthEvents.length}</strong></div>
        <div><span>Recorded</span><strong>{monthEvents.filter((event) => event.recordingStatus === "recorded").length}</strong></div>
        <div><span>Scheduled</span><strong>{monthEvents.filter((event) => event.recordingStatus === "scheduled").length}</strong></div>
        <div><span>No recording listed</span><strong>{monthEvents.filter((event) => event.recordingStatus === "not-scheduled" || event.recordingStatus === "not-recorded").length}</strong></div>
      </section>

      <div className={styles.legend} aria-label="Recording status legend">
        {(Object.entries(STATUS_LABELS) as [RecordingStatus, string][]).map(([status, label]) => (
          <span key={status}>
            <i className={`${styles.statusDot} ${STATUS_CLASSES[status]}`} aria-hidden="true" />
            {label}
          </span>
        ))}
      </div>

      <p className={styles.localNotice}>
        Status, module, and note changes are private to this browser. They do not update Canvas or Echo360.
      </p>

      <section className={styles.calendarWrap} aria-label="D2 monthly recording calendar">
        <div className={styles.weekdayRow} aria-hidden="true">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}
        </div>
        <div className={styles.calendarGrid}>
          {days.map(({ date, day, events: dayEvents }) => {
            const outsideMonth = day.getMonth() !== month;
            const today = date === isoDate(new Date());
            return (
              <article
                key={date}
                className={`${styles.dayCell} ${outsideMonth ? styles.outsideMonth : ""} ${dayEvents.length === 0 ? styles.dayEmpty : ""} ${today ? styles.today : ""}`}
              >
                <div className={styles.dayNumber}>
                  <span>{day.getDate()}</span>
                  <small>{new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(day)}</small>
                </div>
                <div className={styles.dayEvents}>
                  {dayEvents.map((event) => {
                    const course = courses[event.courseId];
                    return (
                      <button
                        key={event.id}
                        type="button"
                        className={styles.eventButton}
                        aria-label={`${course.code}, ${event.title}, ${STATUS_LABELS[event.recordingStatus]}`}
                        onClick={() => openEvent(event)}
                      >
                        <i className={`${styles.statusDot} ${STATUS_CLASSES[event.recordingStatus]}`} aria-hidden="true" />
                        <span className={styles.eventCopy}>
                          <span className={styles.eventTime}>{formatTime(event.classStart)}</span>
                          <span className={styles.eventCourse}>{course.code}</span>
                          <span className={styles.eventTitle}>{event.title}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.awaitingPublication} aria-labelledby="awaiting-title">
        <div>
          <p className="eyebrow">Canvas status</p>
          <h2 id="awaiting-title">D2 courses awaiting publication</h2>
        </div>
        <ul>
          {d2RecordingCalendar.unpublishedCourses.map((course) => <li key={course}>{course}</li>)}
        </ul>
      </section>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby="recording-dialog-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        {selectedEvent && (
          <>
            <div className={styles.dialogHeader}>
              <div>
                <p className="eyebrow">{courses[selectedEvent.courseId].code} · {courses[selectedEvent.courseId].name}</p>
                <h2 id="recording-dialog-title">{selectedEvent.title}</h2>
                <p>{formatDate(selectedEvent.date)}</p>
              </div>
              <button className={styles.iconButton} type="button" aria-label="Close class details" onClick={() => dialogRef.current?.close()}>×</button>
            </div>

            <div className={styles.detailGrid}>
              <section>
                <h3>Class and recording</h3>
                <dl className={styles.facts}>
                  <div><dt>Class time</dt><dd>{formatTime(selectedEvent.classStart)}–{formatTime(selectedEvent.classEnd)}</dd></div>
                  <div><dt>Recording window</dt><dd>{selectedEvent.recordingStart ? `${formatTime(selectedEvent.recordingStart)}–${formatTime(selectedEvent.recordingEnd)}` : "No Echo360 recording is currently listed"}</dd></div>
                  <div><dt>Source</dt><dd>{selectedEvent.source}</dd></div>
                </dl>
              </section>
              <section>
                <h3>Module association</h3>
                <label className={styles.fieldLabel} htmlFor="recording-module">Module / folder</label>
                <input id="recording-module" className={styles.textInput} value={draftModule} onChange={(event) => setDraftModule(event.target.value)} />
                <p className={styles.fieldHelp}>Schedule folder: {selectedEvent.scheduleFolder}</p>
                {selectedEvent.moduleDir && <p className={styles.moduleFolder}>Course folder: {selectedEvent.moduleDir}</p>}
              </section>
            </div>

            {selectedEvent.lecture.length > 0 && (
              <section className={styles.detailSection}>
                <h3>Lecture topics</h3>
                <ul>{selectedEvent.lecture.map((topic) => <li key={topic}>{topic}</li>)}</ul>
              </section>
            )}
            {selectedEvent.lab.length > 0 && (
              <section className={styles.detailSection}>
                <h3>Lab / deliverables</h3>
                <ul>{selectedEvent.lab.map((item) => <li key={item}>{item}</li>)}</ul>
              </section>
            )}

            <section className={styles.statusEditor}>
              <label className={styles.fieldLabel} htmlFor="recording-status">Recording status</label>
              <select id="recording-status" value={draftStatus} onChange={(event) => setDraftStatus(event.target.value as RecordingStatus)}>
                {(Object.entries(STATUS_LABELS) as [RecordingStatus, string][]).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
              </select>
              <label className={styles.fieldLabel} htmlFor="recording-notes">Notes</label>
              <textarea id="recording-notes" rows={3} value={draftNotes} placeholder="Add a reminder, room note, or recording update…" onChange={(event) => setDraftNotes(event.target.value)} />
            </section>

            <div className={styles.dialogActions}>
              <div className={styles.externalLinks}>
                {selectedEvent.echoUrl && <a href={selectedEvent.echoUrl} target="_blank" rel="noreferrer">Open Echo360</a>}
                <a href={selectedEvent.canvasUrl} target="_blank" rel="noreferrer">Open Canvas course</a>
              </div>
              <button className={styles.primaryButton} type="button" onClick={saveEvent}>Save changes</button>
            </div>
            <p className={styles.saveMessage} role="status" aria-live="polite">{saveMessage}</p>
          </>
        )}
      </dialog>
    </div>
  );
}
