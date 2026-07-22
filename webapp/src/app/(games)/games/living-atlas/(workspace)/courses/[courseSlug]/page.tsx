import { notFound } from "next/navigation";
import { LivingAtlasDashboardView } from "@/components/games/LivingAtlasDashboard";
import { getLivingAtlasCourseDashboard } from "@/app/(games)/games/living-atlas/actions";

export const dynamic = "force-dynamic";

export default async function LivingAtlasCoursePage({ params }: { params: Promise<{ courseSlug: string }> }) {
  const { courseSlug } = await params;
  const result = await getLivingAtlasCourseDashboard(courseSlug);
  if (!result.ok) notFound();
  return <LivingAtlasDashboardView dashboard={result.value} />;
}
