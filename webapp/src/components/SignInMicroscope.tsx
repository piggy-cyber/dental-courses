"use client";

import Image from "next/image";
import type { PointerEvent } from "react";

const TRACES = [
  ["01", "Visible"],
  ["02", "Visible"],
  ["03", "Visible"],
  ["04", "Located"],
] as const;

export function SignInMicroscope() {
  function moveLens(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(8, Math.min(92, ((event.clientX - bounds.left) / bounds.width) * 100));
    const y = Math.max(10, Math.min(90, ((event.clientY - bounds.top) / bounds.height) * 100));
    event.currentTarget.style.setProperty("--fc-lens-x", `${x}%`);
    event.currentTarget.style.setProperty("--fc-lens-y", `${y}%`);
  }

  function resetLens(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.style.setProperty("--fc-lens-x", "69%");
    event.currentTarget.style.setProperty("--fc-lens-y", "68%");
  }

  return (
    <figure className="fc-microscope" aria-labelledby="microscope-caption">
      <div className="fc-microscope-toolbar">
        <span>Specimen FC–04</span>
        <b>Live enamel scan</b>
        <i aria-hidden="true" />
      </div>

      <div
        className="fc-microscope-field"
        onPointerMove={moveLens}
        onPointerLeave={resetLens}
      >
        <Image
          src="/brand/fourth-canal-hero-brand-image-v2.png"
          alt="Microscopy field showing four anatomical canal strands, with the fourth in copper"
          fill
          priority
          sizes="(max-width: 900px) 100vw, 56vw"
        />
        <div className="fc-microscope-grid" aria-hidden="true" />
        <div className="fc-microscope-scan" aria-hidden="true" />
        <div className="fc-microscope-lens" aria-hidden="true">
          <span>04</span>
          <i />
        </div>
        <div className="fc-microscope-callout" aria-hidden="true">
          <span>Fourth canal</span>
          <strong>Context located</strong>
        </div>
        <div className="fc-trace-readings" aria-hidden="true">
          {TRACES.map(([number, status]) => (
            <span key={number} className={number === "04" ? "fc-trace-active" : undefined}>
              <i />
              <b>{number}</b>
              <small>{status}</small>
            </span>
          ))}
        </div>
      </div>

      <figcaption id="microscope-caption">
        <span>Move across the specimen to trace the hidden layer.</span>
        <strong>04 / 04 · signal acquired</strong>
      </figcaption>
    </figure>
  );
}
