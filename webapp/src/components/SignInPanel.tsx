"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SignInPanel() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: true,
      },
    });
    if (authError) {
      setError(authError.message);
      setBusy(false);
      return;
    }
    if (!data.url) {
      setError("Google sign-in did not return a login URL.");
      setBusy(false);
      return;
    }
    window.location.assign(data.url);
  }

  return (
    <div className="space-y-4 text-left">
      <button
        type="button"
        aria-label="Continue with Google"
        onClick={signInWithGoogle}
        disabled={busy}
        className="portal-button inline-flex w-full gap-3 px-4 py-2.5 disabled:opacity-60"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0">
          <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.55h3.24c1.9-1.75 2.98-4.33 2.98-7.42Z" />
          <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.64-2.42l-3.24-2.55c-.9.6-2.05.96-3.4.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
          <path fill="#FBBC05" d="M6.39 13.86A6 6 0 0 1 6.08 12c0-.65.11-1.28.31-1.86V7.52H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.48l3.35-2.62Z" />
          <path fill="#EA4335" d="M12 6.01c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.52l3.35 2.62C7.18 7.77 9.39 6.01 12 6.01Z" />
        </svg>
        {busy ? "Opening Google..." : "Continue with Google"}
      </button>

      <p className="text-sm leading-relaxed text-brand-muted">
        Sign in with Google to save progress and manage your profile.
      </p>

      {error && (
        <p className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
