"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function FourthCanalEntrance({ enabled }: { enabled: boolean }) {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const reset = () => { setCount(0); if (timer.current) clearTimeout(timer.current); };
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey || target?.matches("input, textarea, select, [contenteditable=true]")) return;
      if (event.key !== "4") return reset();
      setCount((previous) => {
        const next = previous + 1;
        if (timer.current) clearTimeout(timer.current);
        if (next >= 4) { setOpen(true); return 4; }
        timer.current = setTimeout(reset, 3000);
        return next;
      });
    };
    window.addEventListener("keydown", onKey); window.addEventListener("blur", reset);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("blur", reset); if (timer.current) clearTimeout(timer.current); };
  }, [enabled]);
  if (!enabled) return null;
  return <div className="fc-fourth-entrance" aria-live="polite">
    <button type="button" aria-label="Trace the fourth canal" onClick={() => setCount((value) => { const next = value + 1; if (next >= 4) setOpen(true); return Math.min(next, 4); })}>
      {[1, 2, 3, 4].map((strand) => <i key={strand} className={strand <= count ? "active" : ""} />)}
    </button>
    {open && <div className="fc-fourth-door"><p>The fourth canal is open.</p><Link href="/home">Open student workspace →</Link></div>}
  </div>;
}
