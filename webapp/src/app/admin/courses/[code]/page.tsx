import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminProfile } from "@/app/admin/actions";
import { getCourseEditorData } from "@/app/admin/course-actions";
import { CourseOrganizer } from "@/components/CourseOrganizer";

export const dynamic = "force-dynamic";

export default async function AdminCourseEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ collection?: string }>;
}) {
  await requireAdminProfile();
  const { code } = await params;
  const { collection: collectionId } = await searchParams;
  const courseCode = decodeURIComponent(code);

  if (!collectionId) {
    return (
      <div className="app-card p-6">
        <p className="text-brand-muted">
          Add <code>?collection=...</code> to the URL. Pick a course from{" "}
          <Link href="/admin/courses" className="portal-link">
            the courses list
          </Link>
          .
        </p>
      </div>
    );
  }

  const data = await getCourseEditorData(courseCode, collectionId);
  if (!data) notFound();

  return (
    <div className="space-y-6">
      <header className="app-card p-6">
        <p className="eyebrow text-brand-gold">Course editor</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-brand-navy">
          {data.course.code}
          <span className="font-normal text-brand-ink"> · {data.course.title}</span>
        </h1>
        <p className="mt-2 text-sm text-brand-muted">
          {data.collection.short_label} · {data.collection.label}
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link href="/admin/courses" className="portal-link">
            All courses
          </Link>
          <Link
            href={`/course/${encodeURIComponent(courseCode)}?collection=${encodeURIComponent(collectionId)}`}
            className="portal-link"
          >
            Student view
          </Link>
        </div>
      </header>

      <CourseOrganizer initial={data} />
    </div>
  );
}
