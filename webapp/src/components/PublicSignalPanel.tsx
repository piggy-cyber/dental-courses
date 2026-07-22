"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";

const SIGNALS = [
  {
    number: "01",
    label: "Game",
    detail: "Explore Living Atlas",
    href: "/games/living-atlas",
  },
  {
    number: "02",
    label: "Calculator",
    detail: "Plan the grade you need",
    href: "/grade-calculator",
  },
  {
    number: "03",
    label: "Guides",
    detail: "Read the full course",
    href: "/guides",
  },
  {
    number: "04",
    label: "Why Fourth?",
    detail: "Find the canal others miss",
    href: "/#why-fourth-canal",
  },
] as const;

const CANAL_PATHS = [
  "M35 8C22 56 25 104 20 151c-5 51 5 104 10 181 4-75 14-126 11-179C38 104 49 56 35 8Z",
  "M68 4C55 57 62 103 56 150c-6 49 5 105 9 186 5-80 15-134 10-185C71 103 82 54 68 4Z",
  "M101 8C87 54 93 100 87 146c-6 53 5 108 8 187 6-79 16-132 11-185-4-47 9-92-5-140Z",
  "M135 16c-14 43-7 89-13 137-6 52 5 101 5 177 8-77 18-123 14-171-4-50 9-96-6-143Z",
] as const;

export function PublicSignalPanel() {
  const [active, setActive] = useState(3);
  const [paused, setPaused] = useState(false);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      if (document.documentElement.dataset.fcMotion !== "full") return;
      setActive((current) => (current + 1) % SIGNALS.length);
    }, 3600);
    return () => window.clearInterval(timer);
  }, [paused]);

  function movePanel(event: PointerEvent<HTMLElement>) {
    if (document.documentElement.dataset.fcMotion !== "full") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    event.currentTarget.style.setProperty("--signal-rotate-x", `${y * -5}deg`);
    event.currentTarget.style.setProperty("--signal-rotate-y", `${x * 7}deg`);
    event.currentTarget.style.setProperty("--signal-light-x", `${(x + 0.5) * 100}%`);
    event.currentTarget.style.setProperty("--signal-light-y", `${(y + 0.5) * 100}%`);
  }

  function resetPanel() {
    const panel = panelRef.current;
    if (!panel) return;
    panel.style.setProperty("--signal-rotate-x", "0deg");
    panel.style.setProperty("--signal-rotate-y", "0deg");
    panel.style.setProperty("--signal-light-x", "50%");
    panel.style.setProperty("--signal-light-y", "50%");
    setPaused(false);
  }

  const selected = SIGNALS[active];

  return (
    <aside
      ref={panelRef}
      className="public-core-signal"
      aria-label="Four interactive Fourth Canal paths; the fourth canal is highlighted"
      data-active-canal={active + 1}
      data-canal-count="4"
      onPointerMove={movePanel}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={resetPanel}
      style={{
        "--signal-rotate-x": "0deg",
        "--signal-rotate-y": "0deg",
        "--signal-light-x": "50%",
        "--signal-light-y": "50%",
      } as CSSProperties}
    >
      <div className="public-core-signal-surface">
        <div className="public-core-signal-label">
          <span>FOURTH CANAL · LIVE INDEX</span>
          <b>{selected.number} / 04</b>
        </div>

        <svg
          className="public-core-signal-mark"
          viewBox="0 0 180 340"
          role="img"
          aria-labelledby="public-signal-title public-signal-description"
        >
          <title id="public-signal-title">Four anatomical canal strands</title>
          <desc id="public-signal-description">
            Three navy canals and a copper fourth canal respond to pointer and keyboard focus.
          </desc>
          {CANAL_PATHS.map((path, index) => (
            <g
              key={path}
              aria-hidden="true"
              onPointerEnter={() => setActive(index)}
            >
              <path className="public-core-signal-hit" d={path} />
              <path className="public-core-signal-strand" d={path} data-strand={index + 1} />
            </g>
          ))}
        </svg>

        <div className="public-core-signal-reading" aria-live="polite">
          <span>{selected.number}</span>
          <p><strong>{selected.label}</strong><small>{selected.detail}</small></p>
          <b aria-hidden="true">↗</b>
        </div>

        <ol>
          {SIGNALS.map((signal, index) => (
            <li key={signal.number}>
              <Link
                href={signal.href}
                aria-current={active === index ? "true" : undefined}
                onPointerEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
              >
                <span>{signal.number}</span>
                <b>{signal.label}</b>
                <small>{signal.detail}</small>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}
