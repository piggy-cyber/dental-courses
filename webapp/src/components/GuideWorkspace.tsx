"use client";

import { useState, type ReactNode } from "react";
import { GuideViewToggle, type GuideView } from "@/components/GuideViewToggle";

type GuideWorkspaceProps = {
  children: ReactNode;
  initialView: GuideView;
};

export function GuideWorkspace({ children, initialView }: GuideWorkspaceProps) {
  const [view, setView] = useState<GuideView>(initialView);

  const changeView = (nextView: GuideView) => {
    setView(nextView);
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(".public-guide-reader-hero")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    });
  };

  return (
    <div className="public-guide-workspace" data-guide-view={view}>
      <GuideViewToggle position="top" value={view} onChange={changeView} />
      {children}
      <GuideViewToggle position="bottom" value={view} onChange={changeView} />
    </div>
  );
}
