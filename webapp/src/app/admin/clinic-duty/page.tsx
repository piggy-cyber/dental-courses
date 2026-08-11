import type { Metadata } from "next";
import { requireAdminProfile } from "@/app/admin/actions";
import { getClinicDutyAdmin } from "@/lib/clinic-duty";
import { ClinicDutyAdminConsole } from "./ClinicDutyAdminConsole";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sim Clinic Duty Admin | Fourth Canal",
};

export default async function AdminClinicDutyPage() {
  await requireAdminProfile("clinic-duty.manage");
  const data = await getClinicDutyAdmin();
  return <ClinicDutyAdminConsole data={data} />;
}
