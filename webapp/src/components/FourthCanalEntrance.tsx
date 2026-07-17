"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type MotionMode = "full" | "less" | "off";

const SEQUENCE_LENGTH = 4;
const SEQUENCE_WINDOW_MS = 3000;

/**
 * This component is rendered by the server only for profiles with workspace
 * access. The interaction is a discovery affordance, never an authorization
 * mechanism; /home continues to enforce its own server-side access checks.
 */
export function FourthCanalEntrance() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [motion, setMotion] = useState<MotionMode>("full");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    setCount(0);
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const advance = useCallback(() => {
    if (open) return;

    setCount((previous) => {
      const next = Math.min(previous + 1, SEQUENCE_LENGTH);

      if (timer.current) clearTimeout(timer.current);
      if (next === SEQUENCE_LENGTH) {
        setOpen(true);
        timer.current = null;
        return next;
      }

      timer.current = setTimeout(reset, SEQUENCE_WINDOW_MS);
      return next;
    });
  }, [open, reset]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const saved = window.localStorage.getItem("fourth-canal-motion");
      if (saved === "off" || saved === "less" || saved === "full") {
        setMotion(saved);
      } else if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setMotion("less");
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditable = target?.matches(
        "input, textarea, select, [contenteditable=true], [contenteditable='']",
      );

      if (
        event.repeat ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isEditable
      ) {
        return;
      }

      if (event.key !== "4") {
        reset();
        return;
      }

      advance();
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", reset);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [advance, reset]);

  return (
    <div
      className="fc-fourth-entrance"
      data-count={count}
      data-motion={motion}
      data-open={open}
      aria-live="polite"
    >
      <button
        type="button"
        className="fc-fourth-seal"
        aria-label="Anatomical trace"
        onClick={advance}
      >
        <span className="fc-fourth-number" aria-hidden="true">04</span>
        <span className="fc-fourth-field" aria-hidden="true" />
        <svg className="fc-fourth-strands" viewBox="0 0 190 210" fill="none" aria-hidden="true">
          {[46, 77, 108, 139].map((x, index) => (
            <path
              key={x}
              className={`fc-fourth-strand fc-fourth-strand-${index + 1}`}
              pathLength="1"
              d={`M ${x - 14} 197 C ${x - 3} 151, ${x + 14} 130, ${x} 81 C ${x - 8} 51, ${x + 8} 33, ${x + 3} 11`}
            />
          ))}
        </svg>
        <span className="fc-fourth-hairline" aria-hidden="true" />
      </button>

      <div className="fc-fourth-aperture" aria-hidden={!open}>
        <span>PRIVATE STUDY WORKSPACE</span>
        <Link href="/home" tabIndex={open ? 0 : -1}>
          Enter the fourth canal <b aria-hidden="true">→</b>
        </Link>
      </div>
    </div>
  );
}
