import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { D2RecordingCalendar } from "@/components/D2RecordingCalendar";
import { getSessionProfile } from "@/lib/access";
import { canViewAllCourseData } from "@/lib/admin-permissions";
import { currentCurriculumYear } from "@/lib/cohorts";

export const metadata: Metadata = {
  title: "D2 Recording Calendar | Fourth Canal",
  description: "Private D2 class and Echo360 recording schedule.",
};

export default async function RecordingsPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string | string[] }>;
}) {
  const eventParam = (await searchParams).event;
  const initialEventId = Array.isArray(eventParam) ? eventParam[0] : eventParam;
  const { profile } = await getSessionProfile();
  if (!profile) return null;

  const canView =
    canViewAllCourseData(profile) || currentCurriculumYear(profile.graduation_year) === 2;

  if (!canView) notFound();

  return <D2RecordingCalendar initialEventId={initialEventId} />;
}
