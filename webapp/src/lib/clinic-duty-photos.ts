import "server-only";
import { CLINIC_DUTY_BUCKET, type ClinicDutyDetail } from "@/lib/clinic-duty";
import { createAdminClient } from "@/lib/supabase/admin";

export type ClinicDutyPhotoUrl = {
  id: string;
  url: string;
  createdAt: string;
};

export async function createClinicDutyPhotoUrls(
  detail: ClinicDutyDetail
): Promise<ClinicDutyPhotoUrl[]> {
  const photoIds = detail.photos.map((photo) => photo.id);
  if (photoIds.length === 0) return [];

  const admin = createAdminClient();
  const { data: records, error } = await admin
    .from("sim_clinic_duty_photos")
    .select("id, storage_path, created_at")
    .eq("duty_date_id", detail.id)
    .eq("status", "ready")
    .in("id", photoIds);
  if (error) throw new Error(error.message);

  return Promise.all(
    (records ?? []).map(async (record) => {
      const { data, error: signedError } = await admin.storage
        .from(CLINIC_DUTY_BUCKET)
        .createSignedUrl(record.storage_path, 60 * 10);
      if (signedError || !data?.signedUrl) {
        throw new Error(signedError?.message ?? "Could not open a duty photo.");
      }
      return { id: record.id, url: data.signedUrl, createdAt: record.created_at };
    })
  );
}
