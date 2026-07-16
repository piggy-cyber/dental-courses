import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/access";
import { isAdmin } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { AppShell, type AppShellCourse } from "@/components/AppShell";

export const metadata: Metadata = {
  robots: { index: false, follow: false, noarchive: true },
};

type SidebarMembership = {
  collection_id: string;
  sort_order: number;
  courses:
    | {
        code: string;
        title: string;
        sort_order: number;
      }
    | {
        code: string;
        title: string;
        sort_order: number;
      }[]
    | null;
  resource_collections?:
    | {
        id: string;
        label: string;
        short_label: string;
        sort_order: number;
      }
    | {
        id: string;
        label: string;
        short_label: string;
        sort_order: number;
      }[]
    | null;
};

async function getShellCourses(): Promise<AppShellCourse[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("course_collection_members")
    .select(
      "collection_id, sort_order, courses(code, title, sort_order), resource_collections(id, label, short_label, sort_order)"
    )
    .order("sort_order");

  return ((data as SidebarMembership[] | null) ?? []).flatMap((membership) => {
    const course = Array.isArray(membership.courses) ? membership.courses[0] : membership.courses;
    const collection = Array.isArray(membership.resource_collections)
      ? membership.resource_collections[0]
      : membership.resource_collections;
    if (!course || !collection) return [];

    return {
      code: course.code,
      title: course.title,
      sortOrder: membership.sort_order ?? course.sort_order ?? 0,
      collectionId: membership.collection_id,
      collectionLabel: collection.label,
      collectionShortLabel: collection.short_label,
      collectionSortOrder: collection.sort_order ?? 0,
    };
  });
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await getSessionProfile();

  if (!profile) redirect("/");
  if (profile.status !== "approved") redirect("/");
  if (!isAdmin(profile)) redirect("/home");
  const courses = await getShellCourses();

  return (
    <AppShell profile={profile} courses={courses} adminMode>
      {children}
    </AppShell>
  );
}
