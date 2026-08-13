import type { Metadata } from "next";
import Link from "next/link";
import { D2LabProjects } from "@/components/D2LabProjects";
import { PublicHeader } from "@/components/PublicHeader";
import { getOptionalSessionProfile } from "@/lib/access";
import { hasAdminPermission } from "@/lib/admin-permissions";
import {
  d2LabProjectCourseGaps,
  d2LabProjectSessions,
  d2LabProjectsSummary,
} from "@/lib/d2-lab-projects";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "D2 Lab Projects",
  description: "A chronological Fall 2026 list of published D2 lab projects, lecture topics, lab topics, and competencies.",
  robots: { index: false, follow: false, noarchive: true },
};

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

function formatHeroDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

const COURSE_COVERAGE = [
  {
    courseCode: "REHE 257",
    title: "Prosthodontic Technology",
    description: "Full lecture topics and each day’s project/lab work from the REHE 257/267 schedule.",
  },
  {
    courseCode: "REHE 262",
    title: "Basic Restorative Dentistry II",
    description: "All published Group A/B lab and competency dates. Daily project names are not present in the saved Canvas calendar.",
  },
  {
    courseCode: "HWDP 245",
    title: "Musculoskeletal System",
    description: "Published Anatomy Lab and HoloLens topics with Group A/B times.",
  },
] as const;

export default async function LabProjectsPage() {
  const { profile } = await getOptionalSessionProfile();
  const today = easternToday();
  const canOpenCanvas = Boolean(
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
    <div className="fc-site public-core-page lab-projects-page">
      <PublicHeader />
      <main className="clinic-duty-showcase-main">
        <nav className="public-core-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/calendar">Calendar</Link><span aria-hidden="true">/</span><span>Lab projects</span>
        </nav>

        <div className="clinic-duty-shell">
          <header className="clinic-duty-hero lab-projects-hero">
            <div>
              <p className="lab-projects-hero-date" aria-current="date">Today · {formatHeroDate(today)} · Eastern</p>
              <p className="eyebrow">Fall 2026 · D2 project tracker</p>
              <h1>Lab projects, in order.</h1>
              <p>
                Today and future lab sections, competencies, lecture topics, and daily project tasks in one chronological list. Previous dates stay tucked away until you ask to see them.
              </p>
            </div>
            <div className="clinic-duty-hours">
              <span>Today</span><b>{formatHeroDate(today)}</b>
              <span>Published sessions</span><b>{d2LabProjectsSummary.sessions}</b>
              <span>Lab courses</span><b>{d2LabProjectsSummary.courses}</b>
              <span>Detailed sessions</span><b>{d2LabProjectsSummary.detailedSessions}</b>
            </div>
          </header>

          <section className="clinic-duty-rulebar lab-projects-rulebar">
            <p><b>Source boundary:</b> “Project details pending” means the date and section are published, but the saved Canvas calendar does not name that day’s project. This page does not guess.</p>
            <Link href="/calendar">Open calendar →</Link>
          </section>

          <section className="clinic-duty-showcase-stats lab-projects-summary" aria-label="Lab projects summary">
            <div><span>Chronological sessions</span><b>{d2LabProjectsSummary.sessions}</b></div>
            <div><span>Project steps listed</span><b>{d2LabProjectsSummary.projectTasks}</b></div>
            <div><span>Lab topics published</span><b>{d2LabProjectsSummary.publishedTopics}</b></div>
            <div><span>Topics still pending</span><b>{d2LabProjectsSummary.scheduleOnlySessions}</b></div>
          </section>

          <section className="lab-projects-coverage" aria-labelledby="lab-projects-coverage-title">
            <header>
              <p className="eyebrow">What is available</p>
              <h2 id="lab-projects-coverage-title">Three courses have dated lab sections.</h2>
            </header>
            <div className="lab-projects-coverage-grid">
              {COURSE_COVERAGE.map((course) => (
                <article key={course.courseCode} className={`course-${course.courseCode.toLowerCase().replaceAll(" ", "-")}`}>
                  <span>{course.courseCode}</span>
                  <h3>{course.title}</h3>
                  <p>{course.description}</p>
                </article>
              ))}
            </div>
          </section>

          <D2LabProjects
            canOpenCanvas={canOpenCanvas}
            initialToday={today}
            isSignedIn={Boolean(profile)}
            sessions={d2LabProjectSessions}
          />

          <section className="shared-calendar-source-note lab-projects-source-note" aria-labelledby="lab-projects-source-title">
            <div>
              <p className="eyebrow">Publication gaps</p>
              <h2 id="lab-projects-source-title">No dated lab section found yet.</h2>
            </div>
            <div>
              {d2LabProjectCourseGaps.map((course) => (
                <p key={course.courseCode}><b>{course.courseCode} · {course.courseName}:</b> {course.note}</p>
              ))}
              <p><b>Saved source date:</b> Canvas calendar snapshot downloaded August 10, 2026. The Prosth details come from the 2026 REHE 257/267 schedule. Reimporting a newer Canvas file can add newly published lab dates, but project names still require a course schedule or module source.</p>
            </div>
          </section>

          <p className="clinic-duty-footnote">
            This is a student-run planning view, not an official faculty checklist. Canvas, the course syllabus, and faculty instructions override this page.
          </p>
        </div>
      </main>
    </div>
  );
}
