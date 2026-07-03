import Link from "next/link";

export function CourseBreadcrumb({
  courseCode,
  courseTitle,
}: {
  courseCode: string;
  courseTitle: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-white/70">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link href="/home" className="hover:text-white hover:underline">
            Home
          </Link>
        </li>
        <li aria-hidden className="text-white/40">
          /
        </li>
        <li>
          <Link href="/library" className="hover:text-white hover:underline">
            Courses
          </Link>
        </li>
        <li aria-hidden className="text-white/40">
          /
        </li>
        <li className="font-medium text-white">
          {courseCode}
          <span className="hidden font-normal text-white/80 sm:inline">
            {" "}
            · {courseTitle}
          </span>
        </li>
      </ol>
    </nav>
  );
}
