import "server-only";
import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdminKey() {
  return process.env.SUPABASE_SECRET_KEY?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    || "";
}

// Service-role client. Bypasses row security; never import from client code.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = getSupabaseAdminKey();
  if (!url || !key) throw new Error("Supabase server credentials are not configured.");
  return createClient(
    url,
    key,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
