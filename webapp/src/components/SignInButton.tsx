"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SignInButton() {
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: true,
      },
    });
    if (error || !data.url) {
      setBusy(false);
      return;
    }
    window.location.assign(data.url);
  }

  return (
    <button
      onClick={signIn}
      disabled={busy}
      className="portal-button-primary inline-flex items-center gap-3 px-6 py-3 text-base font-semibold disabled:opacity-60"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          fill="currentColor"
          d="M21.35 11.1h-9.17v2.98h5.3c-.23 1.24-.93 2.29-1.99 3v2.49h3.22c1.89-1.74 2.98-4.3 2.98-7.34 0-.7-.06-1.22-.34-1.13z"
        />
        <path
          fill="currentColor"
          d="M12.18 22c2.7 0 4.96-.89 6.62-2.42l-3.22-2.5c-.9.6-2.04.96-3.4.96-2.6 0-4.81-1.76-5.6-4.13H3.25v2.58A9.99 9.99 0 0 0 12.18 22z"
          opacity=".8"
        />
        <path
          fill="currentColor"
          d="M6.58 13.9a6 6 0 0 1 0-3.8V7.52H3.25a10 10 0 0 0 0 8.96l3.33-2.58z"
          opacity=".6"
        />
        <path
          fill="currentColor"
          d="M12.18 5.96c1.47 0 2.79.5 3.83 1.5l2.85-2.86C17.13 2.99 14.88 2 12.18 2A9.99 9.99 0 0 0 3.25 7.52l3.33 2.58c.79-2.37 3-4.14 5.6-4.14z"
          opacity=".4"
        />
      </svg>
      {busy ? "Opening Google..." : "Sign in with Google"}
    </button>
  );
}
