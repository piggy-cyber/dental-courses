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

function initials(code: string) {
  return code
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

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

  return (
    <div className="app-shell-bg min-h-screen text-brand-ink">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-brand-sidebar text-white sm:flex xl:w-72">
        <div className="border-b border-white/10 px-5 py-5">
          <BrandMark inverse />
          <p className="mt-3 text-xs leading-relaxed text-white/60">
            Organized course resources, videos, transcripts, and files for the
            collections you have been granted.
          </p>
          <div className="mt-4">
            <ThemeToggle compact />
          </div>
        </div>

        <div className="sidebar-scroll flex-1 overflow-y-auto px-4 py-5">
          <div className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            {canOpenAdmin && !adminMode && (
              <Link
                href="/admin"
                className="mt-2 flex items-center justify-between rounded-xl border border-brand-gold/30 bg-brand-gold/10 px-3 py-2 text-sm font-semibold text-brand-gold transition hover:bg-brand-gold/20"
              >
                Admin portal
              </Link>
            )}
            {adminMode && (
              <Link
                href="/home"
                className="mt-2 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                Student library
              </Link>
            )}
          </div>

          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between px-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/40">
                Classes
              </p>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/50">
                {courses.length}
              </span>
            </div>
            {collections.length > 0 ? (
              <div className="space-y-5">
                {collections.map((collection) => (
                  <section key={collection.id}>
                    <p className="mb-2 truncate px-2 text-xs font-bold text-brand-gold">
                      {collection.shortLabel}
                    </p>
                    <div className="space-y-1">
                      {collection.courses.slice(0, 8).map((course) => (
                        <Link
                          key={`${collection.id}-${course.code}`}
                          href={`/course/${encodeURIComponent(course.code)}?collection=${encodeURIComponent(collection.id)}`}
                          className="group flex min-w-0 items-center gap-3 rounded-xl px-2.5 py-2 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
                          title={`${course.code} - ${course.title}`}
                        >
                          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 font-mono text-[11px] font-semibold text-white/70 group-hover:bg-brand-gold group-hover:text-brand-sidebar">
                            {initials(course.code)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">
                              {course.code}
                            </span>
                            <span className="block truncate text-xs text-white/50">
                              {course.title}
                            </span>
                          </span>
                        </Link>
                      ))}
                      {collection.courses.length > 8 && (
                        <Link
                          href="/library"
                          className="ml-2 inline-flex text-xs font-semibold text-brand-gold hover:underline"
                        >
                          View all {collection.courses.length} courses
                        </Link>
                      )}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/50">
                No course collections are assigned yet.
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-white/10 px-4 py-4">
          <Link
            href="/profile"
            className="flex min-w-0 items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white/10"
          >
            <UserAvatar
              name={profile.name}
              email={profile.email}
              avatarUrl={profile.avatar_url}
              size="sm"
              className="ring-2 ring-white/10"
            />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-white">
                {displayName}
              </span>
              <span className="block truncate text-xs text-white/50">
                {profile.username ? `@${profile.username}` : profile.email}
              </span>
            </span>
          </Link>
        </div>
      </aside>

      <div className="sm:pl-64 xl:pl-72">
        <header className="sticky top-0 z-20 border-b border-brand-line/80 bg-brand-panel/90 backdrop-blur-xl">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 sm:px-6 xl:px-8">
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
              className="hidden min-w-0 max-w-xl flex-1 items-center rounded-full border border-brand-line bg-white/70 px-4 py-2 text-sm text-brand-muted shadow-sm transition hover:border-brand-blue hover:text-brand-navy md:flex"
            >
              Search courses, transcripts, videos, and files
            </Link>

            <div className="flex shrink-0 items-center gap-2">
              <div className="sm:hidden">
                <ThemeToggle compact />
              </div>
              <div className="hidden gap-1">
                {STUDENT_LINKS.slice(0, 3).map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-full px-3 py-1.5 text-sm font-semibold text-brand-muted hover:bg-brand-soft hover:text-brand-navy"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-full border border-brand-line bg-white/70 py-1 pl-1 pr-3 text-sm font-semibold text-brand-navy shadow-sm hover:border-brand-blue"
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
                <button className="rounded-full px-3 py-2 text-sm font-semibold text-brand-muted hover:bg-brand-soft hover:text-brand-navy">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 xl:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
