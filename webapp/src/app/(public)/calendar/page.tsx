import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/PublicHeader";
import { SharedCalendar, type SharedCalendarAccountAction } from "@/components/SharedCalendar";
import { getOptionalSessionProfile } from "@/lib/access";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { getClinicDutyShowcase } from "@/lib/clinic-duty-showcase";
import { d2RecordingCalendar } from "@/lib/d2-recording-calendar";
import { buildSharedCalendar } from "@/lib/shared-calendar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "D2 Calendar",
  description: "The Fall 2026 Fourth Canal calendar for D2 classes, recording status, verified exams, clinic duties, and closures.",
  robots: { index: false, follow: false, noarchive: true },
};

const CALENDAR_SUBSCRIPTION_URL = "https://fourthcanal.com/api/calendar.ics";

const ACCOUNT_ACTIONS: SharedCalendarAccountAction[] = [
  {
    title: "Open the duty schedule",
    label: "Duty schedule",
    href: "/clinic-duty?view=schedule",
    description: "See the date-and-name table, your assigned shifts, open duties, and trade options. Managers edit assignments in the admin schedule.",
  },
];

function easternToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export default async function CalendarPage() {
  const [showcase, { profile }] = await Promise.all([
    getClinicDutyShowcase(),
    getOptionalSessionProfile(),
  ]);
  const canManageDuty = Boolean(
    profile
      && (
        (
          profile.status === "approved"
          && profile.roster_id
          && profile.graduation_year === 2029
          && profile.roster_access_approved
        )
        || hasAdminPermission(profile, "clinic-duty.manage")
      ),
  );
  const calendar = showcase ? buildSharedCalendar(showcase) : null;
  const today = easternToday();

  return (
    <div className="fc-site public-core-page shared-calendar-page">
      <PublicHeader />
      <main className="clinic-duty-showcase-main">
        <nav className="public-core-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link><span aria-hidden="true">/</span><span>Calendar</span>
        </nav>

        <div className="clinic-duty-shell">
          <header className="clinic-duty-hero shared-calendar-hero">
            <div>
              <p className="eyebrow">Fall 2026 · Public class calendar</p>
              <h1>D2 Calendar</h1>
              <p>
                Published D2 classes, Echo360 recording status, verified exams, Sim Clinic Duty, Sealant rotations, and confirmed closures in one place.
              </p>
            </div>
            <div className="clinic-duty-hours">
              <span>Classes</span><b>7 published courses</b>
              <span>Canvas exams</span><b>6 published</b>
              <span>Calendar</span><b>Aug 10–Dec 16</b>
            </div>
          </header>

          <section className="clinic-duty-rulebar">
            <p><b>Public information:</b> class dates, recording status, exams, assigned names, group rotations, and completion status may be viewed without an account. Echo360 links and duty actions remain protected.</p>
            <div className="clinic-duty-rulebar-actions">
              <Link className="shared-calendar-rulebar-download" href="/lab-projects">Lab projects</Link>
              <a className="shared-calendar-rulebar-download" href="/api/calendar.ics">Download .ics</a>
            </div>
          </section>

          {calendar ? (
            <>
              <section className="clinic-duty-showcase-stats shared-calendar-summary" aria-label="Calendar summary">
                <div><span>D2 students</span><b>{calendar.summary.students}</b></div>
                <div><span>Course events</span><b>{calendar.summary.courseEvents}</b></div>
                <div><span>Canvas exams</span><b>{calendar.summary.exams}</b></div>
                <div><span>Sim Clinic dates</span><b>{calendar.summary.simClinicDates}</b></div>
                <div><span>Sealant rotations</span><b>{calendar.summary.sealantRotations}</b></div>
                <div><span>Confirmed closures</span><b>{calendar.summary.closures}</b></div>
              </section>
              <SharedCalendar
                accountActions={ACCOUNT_ACTIONS}
                calendar={calendar}
                calendarSubscriptionUrl={CALENDAR_SUBSCRIPTION_URL}
                isSignedIn={Boolean(profile)}
                canManageDuty={canManageDuty}
                initialToday={today}
              />
            </>
          ) : (
            <section className="clinic-duty-empty">The Fall 2026 calendar is not available yet.</section>
          )}

          <section className="shared-calendar-source-note" aria-labelledby="calendar-source-title">
            <div>
              <p className="eyebrow">Schedule notes</p>
              <h2 id="calendar-source-title">One calendar, separate sources.</h2>
            </div>
            <div>
              <p><b>Sim Clinic Duty</b> uses the current Fourth Canal assignment schedule. Each student remains responsible for their own station; the assigned pair covers shared spaces.</p>
              <p><b>Classes + recordings</b> use the Canvas snapshot downloaded August 10, 2026 and Echo360 status checked August 11, 2026. Canvas controls the class title, date, time, and location; Echo360 supplies the recording window and status.</p>
              <p><b>Canvas exams</b> include all six final and midterm events published in the saved D2 calendar. The Prosth schedule adds module and session context where it can be matched.</p>
              <p><b>Awaiting Canvas publication:</b> {d2RecordingCalendar.unpublishedCourses.map((course) => course.replace(/ \(\d+\/\d+\)$/, "")).join(", ") || "None"}. These courses had no dated class event in the saved Canvas snapshot. A published class without a matching capture is labeled “No Echo schedule found”; a past scheduled capture stays “Confirmation pending” until Echo360 confirms it.</p>
              <p><b>Duty schedule</b> has its own linked-user workspace with a date-and-name table, personal shifts, releases, and trades. Users with manager permission can edit assignments and hours in the separate admin schedule.</p>
              <p><b>Sealant Duty</b> follows the Fall 2026 D2 schedule updated August 7, 2026. That source provides Group A/B rotations, not individual student assignments, so the calendar stays group-level.</p>
            </div>
          </section>

          <p className="clinic-duty-footnote">
            This is a student-run coordination calendar, not an official CWRU or faculty compliance system. Dental-program changes or emergency closures override this view.
          </p>
        </div>
      </main>
    </div>
  );
}
