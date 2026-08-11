"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/access";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { CLINIC_DUTY_BUCKET, type ClinicDutyChecklist } from "@/lib/clinic-duty";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function requireClinicDutyAccess(requireRoster = true) {
  const { profile, userId } = await getSessionProfile();
  const isManager = hasAdminPermission(profile, "clinic-duty.manage");
  const isEligibleStudent = Boolean(
    profile?.status === "approved"
      && profile.roster_id
      && profile.graduation_year === 2029
      && profile.roster_access_approved
  );
  if (!profile || !userId || (!isManager && !isEligibleStudent)) {
    throw new Error("Approved D2 access is required.");
  }
  if (requireRoster && !isEligibleStudent) {
    throw new Error("Link this account to an approved D2 roster identity first.");
  }
  return { profile, userId, isManager };
}

async function requireClinicDutyManager() {
  const session = await requireClinicDutyAccess(false);
  if (!session.isManager) throw new Error("Sim Clinic Duty coordinator access is required.");
  return session;
}

function revalidateClinicDuty(date?: string) {
  revalidatePath("/clinic-duty");
  revalidatePath("/admin/clinic-duty");
  if (date) revalidatePath(`/clinic-duty/${date}`);
}

async function callRpc(name: string, params?: Record<string, unknown>) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(name, params);
  if (error) throw new Error(error.message);
  return data;
}

export async function releaseClinicDutySlot(slotId: string) {
  await requireClinicDutyAccess();
  await callRpc("release_sim_clinic_duty_slot", { p_slot_id: slotId });
  revalidateClinicDuty();
}

export async function claimClinicDutyRelease(exchangeId: string) {
  await requireClinicDutyAccess();
  await callRpc("claim_sim_clinic_duty_release", { p_exchange_id: exchangeId });
  revalidateClinicDuty();
}

export async function offerClinicDutyTrade(offeredSlotId: string, requestedSlotId: string) {
  await requireClinicDutyAccess();
  await callRpc("offer_sim_clinic_duty_trade", {
    p_offered_slot_id: offeredSlotId,
    p_requested_slot_id: requestedSlotId,
  });
  revalidateClinicDuty();
}

export async function respondClinicDutyExchange(
  exchangeId: string,
  response: "accepted" | "rejected" | "cancelled"
) {
  await requireClinicDutyAccess(response === "cancelled" ? false : true);
  await callRpc("respond_sim_clinic_duty_exchange", {
    p_exchange_id: exchangeId,
    p_response: response,
  });
  revalidateClinicDuty();
}

export async function prepareClinicDutyPhotoUpload(input: {
  dutyDateId: string;
  mimeType: "image/jpeg" | "image/webp";
  byteSize: number;
}) {
  await requireClinicDutyAccess();
  if (!["image/jpeg", "image/webp"].includes(input.mimeType)) {
    throw new Error("Use a processed JPEG or WebP image.");
  }
  if (!Number.isInteger(input.byteSize) || input.byteSize < 1 || input.byteSize > 5_000_000) {
    throw new Error("The processed photo must be 5 MB or smaller.");
  }

  const extension = input.mimeType === "image/webp" ? "webp" : "jpg";
  const storagePath = `duty/${input.dutyDateId}/${crypto.randomUUID()}.${extension}`;
  const photoId = await callRpc("register_sim_clinic_duty_photo", {
    p_duty_date_id: input.dutyDateId,
    p_storage_path: storagePath,
    p_mime_type: input.mimeType,
    p_byte_size: input.byteSize,
  });

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(CLINIC_DUTY_BUCKET)
    .createSignedUploadUrl(storagePath, { upsert: false });
  if (error || !data?.token) {
    await admin.from("sim_clinic_duty_photos").delete().eq("id", photoId);
    throw new Error(error?.message ?? "Could not prepare the photo upload.");
  }

  return { photoId: String(photoId), storagePath, token: data.token };
}

export async function confirmClinicDutyPhotoUpload(photoId: string) {
  await requireClinicDutyAccess();
  const admin = createAdminClient();
  const { data: photo, error: photoError } = await admin
    .from("sim_clinic_duty_photos")
    .select("id, duty_date_id, storage_path, status, sim_clinic_duty_dates(duty_date)")
    .eq("id", photoId)
    .maybeSingle();
  if (photoError || !photo) throw new Error(photoError?.message ?? "Photo record not found.");
  if (photo.status !== "pending") throw new Error("This photo was already confirmed.");

  const dateRelation = photo.sim_clinic_duty_dates as unknown as { duty_date: string } | null;
  if (!dateRelation?.duty_date) throw new Error("Photo duty date not found.");
  await callRpc("get_sim_clinic_duty_date", { p_duty_date: dateRelation.duty_date });

  const pathParts = photo.storage_path.split("/");
  const filename = pathParts.pop();
  const folder = pathParts.join("/");
  const { data: objects, error: listError } = await admin.storage
    .from(CLINIC_DUTY_BUCKET)
    .list(folder, { search: filename, limit: 2 });
  if (listError || !objects?.some((object) => object.name === filename)) {
    throw new Error(listError?.message ?? "The uploaded photo could not be verified.");
  }

  const { error } = await admin.rpc("confirm_sim_clinic_duty_photo", {
    p_photo_id: photoId,
  });
  if (error) throw new Error(error.message);
  revalidateClinicDuty(dateRelation.duty_date);
}

export async function completeClinicDuty(input: {
  dutyDateId: string;
  dutyDate: string;
  checklist: ClinicDutyChecklist;
  unsafeIssueReported: boolean;
  unsafeIssueType?: string;
  unsafeIssueNote?: string;
}) {
  await requireClinicDutyAccess();
  await callRpc("complete_sim_clinic_duty", {
    p_duty_date_id: input.dutyDateId,
    p_checklist: input.checklist,
    p_unsafe_issue_reported: input.unsafeIssueReported,
    p_unsafe_issue_type: input.unsafeIssueType?.trim() || null,
    p_unsafe_issue_note: input.unsafeIssueNote?.trim() || null,
  });
  revalidateClinicDuty(input.dutyDate);
}

export async function publishClinicDutyTerm(termId: string) {
  await requireClinicDutyManager();
  await callRpc("publish_sim_clinic_duty_term", { p_term_id: termId });
  revalidateClinicDuty();
}

export async function setClinicDutyDateClosed(input: {
  dutyDateId: string;
  dutyDate: string;
  closed: boolean;
  reason: string;
}) {
  await requireClinicDutyManager();
  await callRpc("set_sim_clinic_duty_date_closed", {
    p_duty_date_id: input.dutyDateId,
    p_closed: input.closed,
    p_reason: input.reason,
  });
  revalidateClinicDuty(input.dutyDate);
}

export async function overrideClinicDutySlot(input: {
  slotId: string;
  rosterId: string;
  reason: string;
}) {
  await requireClinicDutyManager();
  await callRpc("override_sim_clinic_duty_slot", {
    p_slot_id: input.slotId,
    p_roster_id: input.rosterId,
    p_reason: input.reason,
  });
  revalidateClinicDuty();
}

export async function waiveClinicDutyPhoto(input: {
  dutyDateId: string;
  dutyDate: string;
  waived: boolean;
  reason: string;
}) {
  await requireClinicDutyManager();
  await callRpc("waive_sim_clinic_duty_photo", {
    p_duty_date_id: input.dutyDateId,
    p_waived: input.waived,
    p_reason: input.reason,
  });
  revalidateClinicDuty(input.dutyDate);
}

export async function reopenClinicDutySubmission(input: {
  dutyDateId: string;
  dutyDate: string;
  reason: string;
}) {
  await requireClinicDutyManager();
  await callRpc("reopen_sim_clinic_duty_submission", {
    p_duty_date_id: input.dutyDateId,
    p_reason: input.reason,
  });
  revalidateClinicDuty(input.dutyDate);
}

export async function updateClinicDutyDateHours(input: {
  dutyDateId: string;
  dutyDate: string;
  opensLocal: string;
  closesLocal: string;
  reason: string;
}) {
  await requireClinicDutyManager();
  await callRpc("update_sim_clinic_duty_date_hours", {
    p_duty_date_id: input.dutyDateId,
    p_opens_local: input.opensLocal,
    p_closes_local: input.closesLocal,
    p_reason: input.reason,
  });
  revalidateClinicDuty(input.dutyDate);
}
