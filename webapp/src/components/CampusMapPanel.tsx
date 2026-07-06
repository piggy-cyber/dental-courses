"use client";

import { useState } from "react";
import Image from "next/image";

const CAMPUS_MAPS = [
  { src: "/campus/samson-pavilion-map.png", alt: "Samson Pavilion — HEC Building Map", label: "Map" },
  { src: "/campus/class-2029-composite.png", alt: "Class of 2029 — CWRU School of Dental Medicine", label: "Class" },
];

export function CampusMapPanel() {
  const [activeMap, setActiveMap] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [hasImages, setHasImages] = useState(true);

  const current = CAMPUS_MAPS[activeMap];

  return (
    <>
      <div className="cockpit-panel flex flex-col">
        <div className="cockpit-section-bar flex items-center justify-between">
          <span>Campus</span>
          <div className="cockpit-toggle">
            {CAMPUS_MAPS.map((m, i) => (
              <button
                key={m.src}
                data-active={i === activeMap}
                onClick={() => setActiveMap(i)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {hasImages ? (
          <button
            type="button"
            className="relative aspect-[4/3] w-full cursor-zoom-in overflow-hidden bg-brand-soft"
            onClick={() => setLightbox(true)}
          >
            <Image
              src={current.src}
              alt={current.alt}
              fill
              className="object-contain"
              onError={() => setHasImages(false)}
              sizes="(max-width: 768px) 100vw, 40vw"
            />
          </button>
        ) : (
          <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 bg-brand-soft p-4">
            <svg className="h-8 w-8 text-brand-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
            </svg>
            <p className="text-center text-xs text-brand-muted">
              Campus map images not yet added.<br />
              Drop images into <code className="text-[10px]">public/campus/</code>
            </p>
          </div>
        )}
      </div>

      {lightbox && hasImages && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(false)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <Image
              src={current.src}
              alt={current.alt}
              width={1200}
              height={900}
              className="h-auto max-h-[85vh] w-auto object-contain"
            />
            <button
              type="button"
              className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center border border-brand-line bg-brand-panel text-brand-ink text-lg font-bold"
              onClick={() => setLightbox(false)}
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </>
  );
}
