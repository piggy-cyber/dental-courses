import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/PublicHeader";
import { getOptionalSessionProfile } from "@/lib/access";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { getClinicDutyShowcase } from "@/lib/clinic-duty-showcase";
import { ClinicDutyShowcaseView } from "./ClinicDutyShowcaseView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sim Clinic Duty Showcase",
  description: "Public Fall 2026 Sim Clinic Duty calendar with protected student actions for the D2 class.",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function ClinicDutyShowcasePage() {
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

  return (
    <div className="fc-site public-core-page clinic-duty-showcase-page">
      <PublicHeader />
      <main className="clinic-duty-showcase-main">
        <nav className="public-core-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link><span aria-hidden="true">/</span><span>Sim Clinic Duty showcase</span>
        </nav>

        <div className="clinic-duty-shell">
          <header className="clinic-duty-hero">
            <div>
              <p className="eyebrow">Student-run accountability · Public schedule</p>
              <h1>Sim Clinic Duty</h1>
              <p>
                A balanced Fall 2026 rotation assigns two D2 students to check the shared Lab and Sim Clinic spaces on every open date. No sign-in is needed to view this showcase.
              </p>
            </div>
            <div className="clinic-duty-hours">
              <span>Mon–Fri</span><b>7 AM–11 PM</b>
              <span>Saturday</span><b>7 AM–7 PM</b>
              <span>Sunday</span><b>Closed</b>
            </div>
          </header>

          <section className="clinic-duty-rulebar">
            <p><b>Public schedule:</b> browse the calendar and filter by name without signing in. Personal checklists, releases, trades, claims, and photos stay protected.</p>
            <span className="clinic-duty-status">Actions gated</span>
          </section>

          {showcase ? (
            <ClinicDutyShowcaseView
              showcase={showcase}
              isSignedIn={Boolean(profile)}
              canManageDuty={canManageDuty}
            />
          ) : (
            <section className="clinic-duty-empty">
              The Fall 2026 schedule is not available for showcase yet.
            </section>
          )}

          <p className="clinic-duty-footnote">
            Sim Clinic Duty is a student-run coordination tool, not an official CWRU or faculty compliance system. Every student remains responsible for their own station; assigned pairs cover shared spaces only.
          </p>
        </div>
      </main>
    </div>
  );
}
