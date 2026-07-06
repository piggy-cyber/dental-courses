import { requireAdminProfile } from "@/app/admin/actions";
import { listCoursesForAdmin } from "@/app/admin/course-actions";
import { CourseListTable } from "@/components/CourseListTable";

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage() {
  await requireAdminProfile();
  const courses = await listCoursesForAdmin();

  return (
    <div className="space-y-8">
      <header className="app-card p-6">
        <p className="eyebrow text-brand-gold">Admin portal</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-brand-navy">Courses</h1>
        <p className="mt-2 text-brand-muted">
          Create courses from a template, upload files to the inbox, and assign them to syllabus
          slots or lectures — no database or coding required.
        </p>
      </header>

      <CourseListTable courses={courses} />
    </div>
  );
}
