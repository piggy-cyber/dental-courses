import Link from "next/link";

export function CourseBreadcrumb({
  courseCode,
  courseTitle,
}: {
  courseCode: string;
  courseTitle: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-brand-muted">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link href="/home" className="portal-link">
            Home
          </Link>
        </li>
        <li aria-hidden className="text-brand-muted">
          /
        </li>
        <li>
          <Link href="/library" className="portal-link">
            Courses
          </Link>
        </li>
        <li aria-hidden className="text-brand-muted">
          /
        </li>
        <li className="font-medium text-brand-navy">
          {courseCode}
          <span className="hidden font-normal text-brand-muted sm:inline">
            {" "}
            · {courseTitle}
          </span>
        </li>
      </ol>
    </nav>
  );
}
