import Link from "next/link";
import { requireAdminProfile } from "@/app/admin/actions";
import { listResourceCollections } from "@/app/admin/course-actions";
import { CourseWizard } from "@/components/CourseWizard";

export const dynamic = "force-dynamic";

export default async function NewCoursePage() {
  await requireAdminProfile();
  const collections = await listResourceCollections();

  return (
    <div className="space-y-6">
      <header className="app-card p-6">
        <p className="eyebrow text-brand-gold">Admin portal</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-brand-navy">Add new course</h1>
        <p className="mt-2 text-sm text-brand-muted">
          Pick a collection, enter basics, and apply the standard lecture template. You can upload and
          organize files on the next screen.
        </p>
        <Link href="/admin/courses" className="mt-3 inline-block text-sm font-semibold text-brand-blue hover:underline">
          Back to courses
        </Link>
      </header>

      <CourseWizard collections={collections} />
    </div>
  );
}
