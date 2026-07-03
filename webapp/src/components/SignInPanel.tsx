"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SignInPanel() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setBusy("google");
    setError(null);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (authError) {
      setError(authError.message);
      setBusy(null);
    }
  }

  async function sendMagicLink(event: React.FormEvent) {
    event.preventDefault();
    setBusy("email");
    setError(null);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (authError) {
      setError(authError.message);
      setBusy(null);
      return;
    }
    setSent(true);
    setBusy(null);
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-left">
        <p className="font-medium text-emerald-900">Check your email</p>
        <p className="mt-1 text-sm text-emerald-800">
          We sent a sign-in link to <strong>{email}</strong>. Click it to
          continue.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-left">
      <form onSubmit={sendMagicLink} className="space-y-3">
        <label className="block text-sm font-medium text-slate-700" htmlFor="email">
          Email sign-in
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none ring-blue-600 focus:ring-2"
        />
        <button
          type="submit"
          disabled={busy !== null}
          className="w-full rounded-lg bg-brand-blue px-4 py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {busy === "email" ? "Sending link..." : "Email me a sign-in link"}
        </button>
      </form>

      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-slate-50 px-2 text-slate-400">or</span>
        </div>
      </div>

      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={busy !== null}
        className="inline-flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
      >
        {busy === "google" ? "Opening Google..." : "Sign in with Google"}
      </button>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
