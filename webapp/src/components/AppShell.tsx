import Link from "next/link";
import type { ReactNode } from "react";
import type { Profile } from "@/lib/access";
import { BrandMark } from "@/components/BrandMark";
import { ActiveNavLink, LivingCanalIndicator } from "@/components/SiteNavigation";
import { UserAvatar } from "@/components/UserAvatar";
import {
  canOpenAdmin,
  canViewAllCourseData,
  hasAdminPermission,
  hasFullCouncilAccess,
  type AdminPermission,
} from "@/lib/admin-permissions";

export type AppShellCourse = {
  code: string;
  title: string;
  collectionId: string;
  collectionLabel: string;
  collectionShortLabel: string;
  collectionSortOrder: number;
  sortOrder: number;
};

type AppShellProps = {
  profile: Profile;
  courses: AppShellCourse[];
  adminMode?: boolean;
  children: ReactNode;
};

const STUDENT_LINKS = [
  { href: "/home", label: "Today" },
  { href: "/library", label: "Courses" },
  { href: "/contacts", label: "Contacts" },
  { href: "/grade-calculator", label: "Grade Calculator" },
  { href: "/profile", label: "Profile" },
  { href: "/about", label: "About" },
];

const ADMIN_LINKS: Array<{
  href: string;
  label: string;
  permission?: AdminPermission;
  fullOnly?: boolean;
}> = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/accounts", label: "Student access", permission: "accounts.manage" },
  { href: "/admin/roster", label: "Roster", permission: "roster.manage" },
  { href: "/admin/team", label: "Council access", fullOnly: true },
  { href: "/admin/collections", label: "Collections", permission: "collections.manage" },
  { href: "/admin/courses", label: "Courses & files", permission: "courses.manage" },
  { href: "/admin/operations", label: "Operations", permission: "operations.manage" },
];

function groupedCollections(courses: AppShellCourse[]) {
  const byId = new Map<
    string,
    {
      id: string;
      label: string;
      shortLabel: string;
      sortOrder: number;
      courses: AppShellCourse[];
    }
  >();

  for (const course of courses) {
    const existing = byId.get(course.collectionId);
    if (existing) {
      existing.courses.push(course);
      continue;
    }
    byId.set(course.collectionId, {
      id: course.collectionId,
      label: course.collectionLabel,
      shortLabel: course.collectionShortLabel,
      sortOrder: course.collectionSortOrder,
      courses: [course],
    });
  }

  return [...byId.values()]
    .map((collection) => ({
      ...collection,
      courses: collection.courses
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code)),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
}

function NavigationLinks({ links }: { links: Array<{ href: string; label: string }> }) {
  return (
    <>
      {links.map((link) => (
        <ActiveNavLink key={link.href} href={link.href}>{link.label}</ActiveNavLink>
      ))}
    </>
  );
}

export function AppShell({ profile, courses, adminMode = false, children }: AppShellProps) {
  const collections = groupedCollections(courses);
  const displayName = profile.name ?? profile.email.split("@")[0] ?? "Student";
  const adminLinks = ADMIN_LINKS.filter((link) => {
    if (link.fullOnly) return hasFullCouncilAccess(profile);
    return !link.permission || hasAdminPermission(profile, link.permission);
  });
  const navLinks = adminMode ? adminLinks : STUDENT_LINKS;
  const mayOpenAdmin = canOpenAdmin(profile);
  const managesCourseData = canViewAllCourseData(profile);
  const courseScopeLabel = managesCourseData ? "Administrative" : "Your";

  return (
    <div className="fc-site fc-shell text-brand-ink">
      <aside className="fc-rail">
        <div className="fc-rail-inner">
          <div className="fc-rail-brand">
            <BrandMark />
            <p>{courseScopeLabel} lectures, transcripts, guides, and course files.</p>
            <LivingCanalIndicator />
          </div>

          <div className="fc-rail-scroll sidebar-scroll">
            <nav className="fc-primary-nav" aria-label="Primary navigation">
              <p className="fc-nav-label">{adminMode ? "Administration" : "Workspace"}</p>
              <NavigationLinks links={navLinks} />
              {mayOpenAdmin && !adminMode && <ActiveNavLink href="/admin">Admin portal</ActiveNavLink>}
              {adminMode && <ActiveNavLink href="/home">Student workspace</ActiveNavLink>}
            </nav>

            <nav className="fc-course-tree" aria-label="Course tree">
              <div className="fc-tree-heading">
                <p>Course index</p>
                <span>{courses.length}</span>
              </div>
              {collections.length > 0 ? (
                <div className="fc-tree-groups">
                  {collections.map((collection) => (
                    <section key={collection.id}>
                      <div className="fc-tree-collection">
                        <div><span>{collection.shortLabel}</span><small>{collection.courses.length}</small></div>
                        {collection.courses.map((course) => (
                          <Link
                            key={`${collection.id}-${course.code}`}
                            href={`/course/${encodeURIComponent(course.code)}?collection=${encodeURIComponent(collection.id)}`}
                            className="fc-course-link"
                            title={`${course.code} — ${course.title}`}
                          >
                            <span>{course.code}</span>
                            <small>{course.title}</small>
                            <i aria-hidden="true">→</i>
                          </Link>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <p className="fc-tree-empty">
                  {managesCourseData ? "No course collections are loaded yet." : "No course collections are assigned yet."}
                </p>
              )}
            </nav>
          </div>

          <Link href="/profile" className="fc-profile-chip">
            <UserAvatar name={profile.name} email={profile.email} avatarUrl={profile.avatar_url} size="sm" />
            <span><b>{displayName}</b><small>{profile.username ? `@${profile.username}` : profile.email}</small></span>
            <i aria-hidden="true">→</i>
          </Link>
        </div>
      </aside>

      <div className="fc-shell-main">
        <header className="fc-topbar">
          <div className="fc-mobile-brand"><BrandMark /></div>
          <Link href="/library" className="fc-search-entry">
            <span aria-hidden="true">⌕</span>
            <span><b>Find study material</b><small>Search courses, lectures, transcripts, and files</small></span>
            <i aria-hidden="true">→</i>
          </Link>
          <div className="fc-topbar-actions">
            <Link href="/profile" className="fc-topbar-profile">
              <UserAvatar name={profile.name} email={profile.email} avatarUrl={profile.avatar_url} size="sm" />
              <span>{profile.username ? `@${profile.username}` : "Profile"}</span>
            </Link>
            <form action="/auth/signout" method="post">
              <button className="fc-signout-button">Sign out</button>
            </form>
          </div>

          <details className="fc-mobile-menu">
            <summary>Menu</summary>
            <nav aria-label="Mobile navigation">
              <NavigationLinks links={navLinks} />
              {mayOpenAdmin && !adminMode && <ActiveNavLink href="/admin">Admin portal</ActiveNavLink>}
              {adminMode && <ActiveNavLink href="/home">Student workspace</ActiveNavLink>}
              <ActiveNavLink href="/library">Search library</ActiveNavLink>
            </nav>
          </details>
        </header>

        <main className="fc-main">{children}</main>
      </div>
    </div>
  );
}
