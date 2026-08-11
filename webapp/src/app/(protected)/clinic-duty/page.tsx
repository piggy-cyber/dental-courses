import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/access";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { getClinicDutyPortal } from "@/lib/clinic-duty";
import { ClinicDutyPortalView } from "./ClinicDutyPortalView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sim Clinic Duty | Fourth Canal",
};

export default async function ClinicDutyPage() {
  const { profile } = await getSessionProfile();
  if (!profile) redirect("/");

  const isEligibleStudent = Boolean(
    profile.status === "approved"
      && profile.roster_id
      && profile.graduation_year === 2029
      && profile.roster_access_approved
  );
  if (!isEligibleStudent && !hasAdminPermission(profile, "clinic-duty.manage")) {
    notFound();
  }

  const portal = await getClinicDutyPortal();

  return (
    <ClinicDutyPortalView
      portal={portal}
      displayName={profile?.name ?? profile?.email?.split("@")[0] ?? "Student"}
      referenceTime={new Date().toISOString()}
    />
  );
}
