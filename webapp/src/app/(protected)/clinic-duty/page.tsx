import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/access";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { getClinicDutyPortal } from "@/lib/clinic-duty";
import { ClinicDutyPortalView, type ClinicDutyPortalTab } from "./ClinicDutyPortalView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sim Clinic Duty | Fourth Canal",
};

const PORTAL_TABS = new Set<ClinicDutyPortalTab>(["mine", "open", "trades", "schedule"]);

export default async function ClinicDutyPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const params = await searchParams;
  const requestedView = typeof params.view === "string" ? params.view : "mine";
  const initialTab = PORTAL_TABS.has(requestedView as ClinicDutyPortalTab)
    ? requestedView as ClinicDutyPortalTab
    : "mine";
  const { profile } = await getSessionProfile();
  if (!profile) redirect("/");

  const isEligibleStudent = Boolean(
    profile.status === "approved"
      && profile.roster_id
      && profile.graduation_year === 2029
      && profile.roster_access_approved
  );
  const canManageSchedule = hasAdminPermission(profile, "clinic-duty.manage");
  if (!isEligibleStudent && !canManageSchedule) {
    notFound();
  }

  const portal = await getClinicDutyPortal();

  return (
    <ClinicDutyPortalView
      portal={portal}
      displayName={profile?.name ?? profile?.email?.split("@")[0] ?? "Student"}
      initialTab={initialTab}
      referenceTime={new Date().toISOString()}
      canManageSchedule={canManageSchedule}
    />
  );
}
