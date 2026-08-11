import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClinicDutyPhotoUrls } from "@/lib/clinic-duty-photos";
import { formatClinicDutyDate, getClinicDutyDetail } from "@/lib/clinic-duty";
import { ClinicDutyChecklistView } from "./ClinicDutyChecklistView";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ date: string }>;
}): Promise<Metadata> {
  const { date } = await params;
  return { title: `${formatClinicDutyDate(date)} | Sim Clinic Duty` };
}

export default async function ClinicDutyDatePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!/^2026-\d{2}-\d{2}$/.test(date)) notFound();
  const detail = await getClinicDutyDetail(date);
  if (!detail) notFound();
  const photoUrls = await createClinicDutyPhotoUrls(detail);

  return <ClinicDutyChecklistView detail={detail} photoUrls={photoUrls} />;
}
