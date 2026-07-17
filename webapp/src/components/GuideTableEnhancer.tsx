"use client";

import { useEffect } from "react";

export function GuideTableEnhancer() {
  useEffect(() => {
    const workspace = document.querySelector<HTMLElement>(".public-guide-workspace");
    if (!workspace) return;

    const wrappers = Array.from(workspace.querySelectorAll<HTMLElement>(".guide-table-scroll"));

    wrappers.forEach((wrapper) => {
      const table = wrapper.querySelector("table");
      if (!table) return;
      const columns = Math.max(
        ...Array.from(table.rows).map((row) => row.cells.length),
        1,
      );
      wrapper.dataset.columns = String(columns);

      const toolbar = document.createElement("div");
      toolbar.className = "guide-table-toolbar";
      const label = document.createElement("span");
      const headers = Array.from(table.querySelectorAll("thead th"))
        .map((cell) => cell.textContent?.trim())
        .filter((value): value is string => Boolean(value));
      let context = "Reference table";
      let sibling = wrapper.previousElementSibling;
      while (sibling) {
        if (/^H[2-4]$/.test(sibling.tagName) && sibling.textContent?.trim()) {
          context = sibling.textContent.trim();
          break;
        }
        sibling = sibling.previousElementSibling;
      }
      const headerSummary = headers.length > 0 ? headers.slice(0, 3).join(" · ") : "Key comparison";
      label.textContent = `${context} — ${headerSummary}`;
      label.title = label.textContent;

      toolbar.append(label);
      wrapper.prepend(toolbar);
    });

    return () => {
      wrappers.forEach((wrapper) => wrapper.querySelector(".guide-table-toolbar")?.remove());
    };
  }, []);

  return null;
}
