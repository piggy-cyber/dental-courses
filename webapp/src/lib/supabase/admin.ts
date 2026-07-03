import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client. Bypasses row security; never import from client code.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
