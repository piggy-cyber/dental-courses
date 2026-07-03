import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/access";

export type ResourceUrlResult =
  | {
      ok: true;
      signedUrl: string;
      name: string;
      ext: string | null;
      kind: string | null;
      courseCode: string;
      storagePath: string;
    }
  | { ok: false; status: 403 | 404 | 500; error: string };

export async function getResourceSignedUrl(
  resourceId: number,
  options: { inline?: boolean } = {}
): Promise<ResourceUrlResult> {
  const { profile } = await getSessionProfile();
  if (!profile || profile.status !== "approved") {
    return { ok: false, status: 403, error: "Not authorized" };
  }

  const supabase = await createClient();
  const { data: resource } = await supabase
    .from("resources")
    .select("name, ext, kind, course_code, storage_path")
    .eq("id", resourceId)
    .single();

  if (!resource?.storage_path) {
    return { ok: false, status: 404, error: "File not available" };
  }

  const admin = createAdminClient();
  const { data: signed, error } = await admin.storage
    .from("course-files")
    .createSignedUrl(resource.storage_path, 60 * 10, {
      download: options.inline ? false : resource.name,
    });

  if (error || !signed?.signedUrl) {
    return { ok: false, status: 500, error: "Could not sign URL" };
  }

  return {
    ok: true,
    signedUrl: signed.signedUrl,
    name: resource.name,
    ext: resource.ext,
    kind: resource.kind,
    courseCode: resource.course_code,
    storagePath: resource.storage_path,
  };
}

export async function getResourceForDownload(
  resourceId: number
): Promise<
  | { ok: true; name: string; storagePath: string }
  | { ok: false; status: 403 | 404 | 500; error: string }
> {
  const { profile } = await getSessionProfile();
  if (!profile || profile.status !== "approved") {
    return { ok: false, status: 403, error: "Not authorized" };
  }

  const supabase = await createClient();
  const { data: resource } = await supabase
    .from("resources")
    .select("name, storage_path")
    .eq("id", resourceId)
    .single();

  if (!resource?.storage_path) {
    return { ok: false, status: 404, error: "File not available" };
  }

  return { ok: true, name: resource.name, storagePath: resource.storage_path };
}
