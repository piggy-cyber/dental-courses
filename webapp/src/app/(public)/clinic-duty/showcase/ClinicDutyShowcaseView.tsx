"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ClinicDutyShowcase } from "@/lib/clinic-duty-showcase-shared";

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

export function ClinicDutyShowcaseView({ showcase }: { showcase: ClinicDutyShowcase }) {
  const [studentId, setStudentId] = useState("all");
  const [month, setMonth] = useState("all");

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

  const selectedStudent = students.find((student) => student.id === studentId);

  return (
    <div className="clinic-duty-showcase-stack">
      <section className="clinic-duty-showcase-stats" aria-label="Schedule summary">
        <div><span>D2 students</span><b>{showcase.summary.students}</b></div>
        <div><span>Open dates</span><b>{showcase.summary.openDates}</b></div>
        <div><span>Duty slots</span><b>{showcase.summary.dutySlots}</b></div>
        <div><span>Duties each</span><b>{showcase.summary.minimumDuties}–{showcase.summary.maximumDuties}</b></div>
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
        {(studentId !== "all" || month !== "all") && (
          <button type="button" className="portal-button" onClick={() => { setStudentId("all"); setMonth("all"); }}>
            Reset filters
          </button>
        )}
      </section>

      <section className="clinic-duty-grid" aria-label="Randomized Sim Clinic Duty schedule">
        {visibleDates.map((duty) => (
          <article className="clinic-duty-card" key={duty.id}>
            <div className="clinic-duty-card-date">
              <p>{formatDate(duty.date)}</p>
              <span>{formatTime(duty.opensAt)}–{formatTime(duty.closesAt)}</span>
            </div>
            <div className="clinic-duty-pair" aria-label={duty.dateStatus === "open" ? "Assigned duty pair" : "Closed date"}>
              {duty.slots.length > 0
                ? duty.slots.map((slot) => (
                    <span key={slot.id} className={slot.studentKey === studentId ? "is-me" : undefined}>{slot.name}</span>
                  ))
                : <span>School closed</span>}
            </div>
            <div className="clinic-duty-card-actions">
              <span className={`clinic-duty-status clinic-duty-status-${duty.dateStatus === "closed" ? "closed" : "scheduled"}`}>
                {duty.dateStatus === "closed" ? "Closed" : "Scheduled"}
              </span>
              <small>{duty.closureReason ?? "Two students share responsibility for Lab and Sim Clinic common areas."}</small>
            </div>
          </article>
        ))}
        {visibleDates.length === 0 && <p className="clinic-duty-empty">No dates match these filters.</p>}
      </section>

      <section className="clinic-duty-showcase-activation" aria-labelledby="activation-title">
        <div>
          <p className="eyebrow">Account linking comes later</p>
          <h2 id="activation-title">The schedule already belongs to roster identities.</h2>
          <p>
            When a student signs in with Case Google, Rick or a student delegate links that account to the matching roster name once. My Duties, trades, checklists, and photo submission then unlock for that student.
          </p>
        </div>
        <ol>
          <li><span>1</span><p><b>Schedule now</b> Two randomized students per open date.</p></li>
          <li><span>2</span><p><b>Link later</b> Match the Case Google account to the existing name.</p></li>
          <li><span>3</span><p><b>Activate</b> Personal duties and protected actions appear.</p></li>
        </ol>
        <Link href="/signin" className="public-core-primary-action">Preview sign-in <span aria-hidden="true">→</span></Link>
      </section>
    </div>
  );
}
