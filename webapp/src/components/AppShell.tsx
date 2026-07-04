import Link from "next/link";
import type { ReactNode } from "react";
import type { Profile } from "@/lib/access";
import { BrandMark } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserAvatar } from "@/components/UserAvatar";

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
  { href: "/home", label: "Home" },
  { href: "/library", label: "Courses" },
  { href: "/profile", label: "Profile" },
  { href: "/about", label: "About" },
];

const ADMIN_LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/accounts", label: "Accounts" },
  { href: "/admin/roster", label: "Roster" },
  { href: "/admin/team", label: "Team" },
  { href: "/admin/collections", label: "Collections" },
  { href: "/admin/operations", label: "Operations" },
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

export function AppShell({
  profile,
  courses,
  adminMode = false,
  children,
}: AppShellProps) {
  const collections = groupedCollections(courses);
  const displayName = profile.name ?? profile.email.split("@")[0] ?? "Student";
  const navLinks = adminMode ? ADMIN_LINKS : STUDENT_LINKS;
  const canOpenAdmin = profile.role === "owner";
  const courseScopeLabel = canOpenAdmin ? "All available" : "Granted";

  return (
    <div className="app-shell-bg min-h-screen text-brand-ink">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-brand-line bg-brand-sidebar text-brand-ink sm:flex xl:w-72">
        <div className="border-b border-brand-line px-4 py-4">
          <BrandMark />
          <p className="mt-2 text-[11px] leading-relaxed text-brand-muted">
            {courseScopeLabel} course resources, videos, transcripts, and files.
          </p>
          <div className="mt-3">
            <ThemeToggle compact />
          </div>
        </div>

        <div className="sidebar-scroll flex-1 overflow-y-auto">
          <nav className="border-b border-brand-line p-3" aria-label="Primary">
            <p className="mb-2 border-b border-brand-line bg-brand-soft px-2 py-1 text-[11px] font-bold uppercase text-brand-navy">
              Navigation
            </p>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block border-l-4 border-transparent px-2 py-1.5 text-sm font-semibold text-brand-blue hover:border-brand-blue hover:bg-brand-sidebar-soft hover:text-brand-navy"
              >
                {link.label}
              </Link>
            ))}
            {canOpenAdmin && !adminMode && (
              <Link
                href="/admin"
                className="mt-1 block border-l-4 border-transparent px-2 py-1.5 text-sm font-semibold text-brand-blue hover:border-brand-blue hover:bg-brand-sidebar-soft hover:text-brand-navy"
              >
                Admin portal
              </Link>
            )}
            {adminMode && (
              <Link
                href="/home"
                className="mt-1 block border-l-4 border-transparent px-2 py-1.5 text-sm font-semibold text-brand-blue hover:border-brand-blue hover:bg-brand-sidebar-soft hover:text-brand-navy"
              >
                Student library
              </Link>
            )}
          </nav>

          <nav className="p-3" aria-label="Course tree">
            <div className="mb-2 flex items-center justify-between border-b border-brand-line bg-brand-soft px-2 py-1">
              <p className="text-[11px] font-bold uppercase text-brand-navy">
                Course Tree
              </p>
              <span className="text-[11px] font-semibold text-brand-muted">
                {courses.length}
              </span>
            </div>
            {collections.length > 0 ? (
              <div className="space-y-3">
                {collections.map((collection) => (
                  <section key={collection.id}>
                    <div className="border border-brand-line bg-brand-panel">
                      <div className="flex items-center justify-between bg-brand-soft px-2 py-1 font-mono text-[11px] font-bold text-brand-navy">
                        <span className="truncate">[-] {collection.shortLabel}</span>
                        <span className="text-brand-muted">{collection.courses.length}</span>
                      </div>
                      <div>
                        {collection.courses.map((course) => (
                          <Link
                            key={`${collection.id}-${course.code}`}
                            href={`/course/${encodeURIComponent(course.code)}?collection=${encodeURIComponent(collection.id)}`}
                            className="block border-l-4 border-transparent px-2 py-1.5 pl-4 text-xs leading-snug text-brand-blue hover:border-brand-blue hover:bg-brand-sidebar-soft hover:text-brand-navy"
                            title={`${course.code} - ${course.title}`}
                          >
                            <span className="font-mono text-brand-muted">+-- </span>
                            <span className="font-semibold">{course.code}</span>
                            <span className="text-brand-muted"> - {course.title}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <p className="border border-brand-line bg-brand-panel px-3 py-3 text-sm text-brand-muted">
                {canOpenAdmin
                  ? "No course collections are loaded yet."
                  : "No course collections are assigned yet."}
              </p>
            )}
          </nav>
        </div>

        <div className="border-t border-brand-line bg-brand-soft px-3 py-3">
          <Link
            href="/profile"
            className="flex min-w-0 items-center gap-3 border-l-4 border-transparent px-2 py-2 hover:border-brand-blue hover:bg-brand-sidebar-soft"
          >
            <UserAvatar
              name={profile.name}
              email={profile.email}
              avatarUrl={profile.avatar_url}
              size="sm"
            />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-brand-navy">
                {displayName}
              </span>
              <span className="block truncate text-xs text-brand-muted">
                {profile.username ? `@${profile.username}` : profile.email}
              </span>
            </span>
          </Link>
        </div>
      </aside>

      <div className="sm:pl-64 xl:pl-72">
        <header className="sticky top-0 z-20 border-b border-brand-line bg-brand-panel">
          <div className="flex min-h-14 items-center justify-between gap-4 px-4 py-2 sm:px-6 xl:px-8">
            <div className="flex min-w-0 items-center gap-3 sm:hidden">
              <BrandMark showWordmark={false} />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-brand-navy">
                  Course Library
                </p>
                <p className="truncate text-xs text-brand-muted">
                  {adminMode ? "Admin portal" : "Student library"}
                </p>
              </div>
            </div>

            <Link
              href="/library"
              className="hidden min-w-0 max-w-xl flex-1 items-center border border-brand-line bg-brand-panel px-3 py-1.5 text-sm text-brand-blue hover:border-brand-blue hover:bg-brand-soft hover:text-brand-navy md:flex"
            >
              Search courses, transcripts, videos, and files
            </Link>

            <div className="flex shrink-0 items-center gap-2">
              <div className="sm:hidden">
                <ThemeToggle compact />
              </div>
              <Link
                href="/profile"
                className="flex items-center gap-2 border border-brand-line bg-brand-panel py-1 pl-1 pr-3 text-sm font-semibold text-brand-blue hover:border-brand-blue hover:bg-brand-soft hover:text-brand-navy"
              >
                <UserAvatar
                  name={profile.name}
                  email={profile.email}
                  avatarUrl={profile.avatar_url}
                  size="sm"
                />
                <span className="hidden sm:inline">
                  {profile.username ? `@${profile.username}` : "Profile"}
                </span>
              </Link>
              <form action="/auth/signout" method="post">
                <button className="border border-brand-line bg-brand-panel px-3 py-2 text-sm font-semibold text-brand-blue hover:border-brand-blue hover:bg-brand-soft hover:text-brand-navy">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 xl:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
