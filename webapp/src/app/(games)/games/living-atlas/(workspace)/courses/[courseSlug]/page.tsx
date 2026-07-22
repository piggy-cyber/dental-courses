import { notFound } from "next/navigation";
import { LivingAtlasDashboardView } from "@/components/games/LivingAtlasDashboard";
import { getLivingAtlasCourseDashboard } from "@/app/(games)/games/living-atlas/actions";
import { getOptionalSessionProfile } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function LivingAtlasCoursePage({ params }: { params: Promise<{ courseSlug: string }> }) {
  const { courseSlug } = await params;
  const [{ profile, userId }, result] = await Promise.all([getOptionalSessionProfile(), getLivingAtlasCourseDashboard(courseSlug)]);
  if (!result.ok) notFound();
  const isFounder = Boolean(userId && profile?.id === userId && profile.role === "owner" && profile.status === "approved");
  return <LivingAtlasDashboardView dashboard={result.value} showFounderControls={isFounder} />;
}
