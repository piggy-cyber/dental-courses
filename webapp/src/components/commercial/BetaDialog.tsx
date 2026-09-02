"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./CommercialSite.module.css";

export function BetaButton({
  label = "Join the private beta",
  secondary = false,
  className = "",
}: {
  label?: string;
  secondary?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [complete, setComplete] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={`${secondary ? styles.buttonSecondary : styles.button} ${className}`}
        onClick={() => {
          setComplete(false);
          setOpen(true);
        }}
      >
        {label}
      </button>
      {open ? (
        <div className={styles.dialogBackdrop} role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}>
          <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="beta-dialog-title">
            <div className={styles.dialogHeader}>
              <div>
                <h2 id="beta-dialog-title">Join the private beta</h2>
                <p>This preview keeps your entry on this device only. It does not send or save your email.</p>
              </div>
              <button ref={closeRef} type="button" className={styles.closeButton} aria-label="Close beta dialog" onClick={() => setOpen(false)}>
                <span aria-hidden="true">×</span>
              </button>
            </div>
            {complete ? (
              <div className={styles.success} role="status">
                <strong>Preview complete.</strong>
                <p>No information was transmitted. A real beta list will be enabled only after release approval.</p>
              </div>
            ) : (
              <form className={styles.formStack} onSubmit={(event) => {
                event.preventDefault();
                setComplete(true);
              }}>
                <label className={styles.field}>
                  Email address
                  <input name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
                </label>
                <button type="submit" className={styles.button}>Test beta request</button>
              </form>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
