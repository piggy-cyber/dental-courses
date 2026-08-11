import type { Metadata } from "next";
import { getSessionProfile } from "@/lib/access";
import { getClinicDutyPortal } from "@/lib/clinic-duty";
import { ClinicDutyPortalView } from "./ClinicDutyPortalView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sim Clinic Duty | Fourth Canal",
};

export default async function ClinicDutyPage() {
  const [{ profile }, portal] = await Promise.all([
    getSessionProfile(),
    getClinicDutyPortal(),
  ]);

  return (
    <ClinicDutyPortalView
      portal={portal}
      displayName={profile?.name ?? profile?.email?.split("@")[0] ?? "Student"}
      referenceTime={new Date().toISOString()}
    />
  );
}
