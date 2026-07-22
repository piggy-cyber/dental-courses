"use client";

/* eslint-disable @next/next/no-img-element -- private short-lived signed URLs cannot use build-time optimization. */

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./LivingAtlasPractice.module.css";

type ClinicalImageViewerProps = {
  src: string;
  alt: string;
  label: string;
  caption?: string | null;
  className?: string;
};

const MIN_SCALE = 1;
const MAX_SCALE = 6;

function clampScale(value: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(value * 100) / 100));
}

export function ClinicalImageViewer({ src, alt, label, caption, className }: ClinicalImageViewerProps) {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(MIN_SCALE);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const pinch = useRef<{ distance: number; scale: number } | null>(null);

  const reset = useCallback(() => {
    setScale(MIN_SCALE);
    setPan({ x: 0, y: 0 });
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    reset();
  }, [reset]);

  const changeScale = useCallback((next: number) => {
    const value = clampScale(next);
    setScale(value);
    if (value === MIN_SCALE) setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      if (event.key === "+" || event.key === "=") changeScale(scale + 0.25);
      if (event.key === "-") changeScale(scale - 0.25);
      if (event.key === "0") reset();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [changeScale, close, open, reset, scale]);

  return (
    <>
      <button type="button" className={`${styles.clinicalImageTrigger} ${className ?? ""}`} onClick={() => setOpen(true)}>
        <img src={src} alt={alt} />
        <span>{label} · magnify</span>
      </button>

      {open ? (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={close}>
          <section className={styles.clinicalImageDialog} role="dialog" aria-modal="true" aria-label={`${label} image viewer`} onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <p>Clinical image viewer</p>
                <h2>{label}</h2>
                {caption ? <span>{caption}</span> : null}
              </div>
              <button type="button" className={styles.imageViewerClose} onClick={close} aria-label="Close image viewer">×</button>
            </header>
            <div className={styles.imageViewerTools} aria-label="Image viewer controls">
              <button type="button" onClick={() => changeScale(scale - 0.25)} disabled={scale <= MIN_SCALE} aria-label="Zoom out">−</button>
              <strong>{Math.round(scale * 100)}%</strong>
              <button type="button" onClick={() => changeScale(scale + 0.25)} disabled={scale >= MAX_SCALE} aria-label="Zoom in">+</button>
              <button type="button" onClick={reset} disabled={scale === MIN_SCALE && pan.x === 0 && pan.y === 0}>Reset</button>
              <small>Scroll or pinch to zoom · drag to pan</small>
            </div>
            <div
              className={styles.imageViewerCanvas}
              onWheel={(event) => {
                event.preventDefault();
                changeScale(scale + (event.deltaY < 0 ? 0.2 : -0.2));
              }}
              onPointerDown={(event) => {
                if (scale <= MIN_SCALE) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
              }}
              onPointerMove={(event) => {
                if (!drag.current) return;
                setPan({ x: drag.current.panX + event.clientX - drag.current.x, y: drag.current.panY + event.clientY - drag.current.y });
              }}
              onPointerUp={() => { drag.current = null; }}
              onPointerCancel={() => { drag.current = null; }}
              onTouchStart={(event) => {
                if (event.touches.length !== 2) return;
                const [first, second] = [event.touches[0], event.touches[1]];
                if (!first || !second) return;
                pinch.current = { distance: Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY), scale };
              }}
              onTouchMove={(event) => {
                if (!pinch.current || event.touches.length !== 2) return;
                const [first, second] = [event.touches[0], event.touches[1]];
                if (!first || !second) return;
                const distance = Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
                changeScale(pinch.current.scale * (distance / pinch.current.distance));
              }}
              onTouchEnd={() => { pinch.current = null; }}
            >
              <img
                src={src}
                alt={alt}
                draggable={false}
                style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
              />
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
