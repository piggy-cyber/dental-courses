"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function RootError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="fc-site grid min-h-[70vh] place-items-center px-4 py-12 text-brand-ink">
      <section className="app-card max-w-xl p-8 text-center">
        <p className="eyebrow">Temporary problem</p>
        <h1 className="mt-2 text-3xl font-bold text-brand-navy">That page did not load.</h1>
        <p className="mt-3 text-brand-muted">Try again, return to the study desk, or let us know if the problem continues.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => unstable_retry()} className="portal-button-primary px-5 py-2.5">Try again</button>
          <Link href="/" className="portal-button px-5 py-2.5">Home</Link>
          <Link href="/support" className="portal-button px-5 py-2.5">Support</Link>
        </div>
      </section>
    </main>
  );
}
