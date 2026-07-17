"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { PublicGuideSection } from "@/lib/public-guides";

type GuideTocProps = {
  sections: PublicGuideSection[];
  courseHref: string;
};

export function GuideToc({ sections, courseHref }: GuideTocProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");
  const [progress, setProgress] = useState(0);
  const frameRef = useRef(0);

  useEffect(() => {
    const article = document.querySelector<HTMLElement>(".public-guide-body");
    const headings = sections
      .map((section) => document.getElementById(section.id))
      .filter((heading): heading is HTMLElement => Boolean(heading));

    if (!article || headings.length === 0) return;

    const update = () => {
      const readingLine = 184;
      let current = headings[0].id;
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= readingLine) current = heading.id;
        else break;
      }
      setActiveId(current);

      const rect = article.getBoundingClientRect();
      const travel = Math.max(rect.height - window.innerHeight * 0.55, 1);
      const complete = Math.min(Math.max((readingLine - rect.top) / travel, 0), 1);
      setProgress(Math.round(complete * 100));
    };

    const schedule = () => {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.cancelAnimationFrame(frameRef.current);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [sections]);

  return (
    <aside
      className="public-guide-toc"
      style={{ "--guide-reading-progress": `${progress}%` } as CSSProperties}
    >
      <div className="public-guide-toc-heading">
        <div><p className="eyebrow">On this page</p><strong>{progress}% read</strong></div>
        <div className="public-guide-toc-canals" aria-hidden="true">
          <i /><i /><i /><i><span /></i>
        </div>
      </div>
      <nav aria-label="Guide sections">
        {sections.map((section, index) => (
          <a
            href={`#${section.id}`}
            key={section.id}
            className={section.id === activeId ? "is-active" : undefined}
            aria-current={section.id === activeId ? "location" : undefined}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            {section.title}
          </a>
        ))}
      </nav>
      <a href={courseHref}>Back to all courses</a>
    </aside>
  );
}
