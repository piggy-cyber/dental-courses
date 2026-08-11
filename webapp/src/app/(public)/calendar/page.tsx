import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/PublicHeader";
import { SharedCalendar, type SharedCalendarAccountAction } from "@/components/SharedCalendar";
import { getOptionalSessionProfile } from "@/lib/access";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { getClinicDutyShowcase } from "@/lib/clinic-duty-showcase";
import { buildSharedCalendar } from "@/lib/shared-calendar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "D2 Calendar",
  description: "The Fall 2026 Fourth Canal calendar for Sim Clinic Duty, Sealant Duty, and class closures.",
  robots: { index: false, follow: false, noarchive: true },
};

const ACCOUNT_ACTIONS: SharedCalendarAccountAction[] = [
  {
    title: "View your assigned duties",
    label: "My duties",
    href: "/clinic-duty?view=mine",
    description: "See your Sim Clinic dates, open the shared-space checklist, and submit completion.",
  },
  {
    title: "Claim an available duty",
    label: "Open duties",
    href: "/clinic-duty?view=open",
    description: "Browse released Sim Clinic dates and accept responsibility for an available slot.",
  },
  {
    title: "Release or trade a duty",
    label: "Change responsibility",
    href: "/clinic-duty?view=trades",
    description: "Release a future date or offer a direct swap. Nothing changes until a claim or trade is accepted.",
  },
];

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
                Sim Clinic Duty assignments, Sealant Duty and Clinic Shadowing rotations, and confirmed school closures in one place. Browse and download without signing in.
              </p>
            </div>
            <div className="clinic-duty-hours">
              <span>Sim Clinic</span><b>Mon–Sat</b>
              <span>Sealant</span><b>Selected Mondays</b>
              <span>Calendar</span><b>Aug 14–Dec 16</b>
            </div>
          </header>

          <section className="clinic-duty-rulebar">
            <p><b>Public information:</b> dates, assigned names, group rotations, and completion status may be viewed without an account. Checklists, releases, trades, claims, and photos remain protected.</p>
            <a className="shared-calendar-rulebar-download" href="/api/calendar.ics">Download .ics</a>
          </section>

          {calendar ? (
            <>
              <section className="clinic-duty-showcase-stats" aria-label="Calendar summary">
                <div><span>D2 students</span><b>{calendar.summary.students}</b></div>
                <div><span>Sim Clinic dates</span><b>{calendar.summary.simClinicDates}</b></div>
                <div><span>Sealant rotations</span><b>{calendar.summary.sealantRotations}</b></div>
                <div><span>Confirmed closures</span><b>{calendar.summary.closures}</b></div>
              </section>
              <SharedCalendar
                accountActions={ACCOUNT_ACTIONS}
                calendar={calendar}
                isSignedIn={Boolean(profile)}
                canManageDuty={canManageDuty}
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
              <p><b>Sealant Duty</b> follows the Fall 2026 D2 schedule updated August 7, 2026. That source provides Group A/B rotations, not individual student assignments, so the calendar stays group-level.</p>
              <p><b>Expandable by design</b> means future club meetings, fundraisers, and other class events can be added as new sources without rebuilding the calendar interface or download feed.</p>
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
