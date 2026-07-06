import "server-only";

import { getSessionProfile } from "@/lib/access";
import { isAdmin } from "@/lib/roles";

export type UploadActor =
  | { kind: "admin"; userId: string }
  | { kind: "bot" };

export async function authorizeCourseUpload(
  request: Request
): Promise<UploadActor | null> {
  const authHeader = request.headers.get("authorization");
  const apiKey = process.env.COURSE_BOT_API_KEY?.trim();

  if (apiKey && authHeader === `Bearer ${apiKey}`) {
    return { kind: "bot" };
  }

  const { profile, userId } = await getSessionProfile();
  if (isAdmin(profile) && userId) {
    return { kind: "admin", userId };
  }

  return null;
}
