import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/access";
import { getShellCourses } from "@/lib/shell-courses";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  robots: { index: false, follow: false, noarchive: true },
};

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await getSessionProfile();

  if (!profile) redirect("/");
  if (profile.status !== "approved") redirect("/");
  const courses = await getShellCourses();

  return (
    <AppShell profile={profile} courses={courses}>
      {children}
    </AppShell>
  );
}
