"use client";

import { useEffect } from "react";

export function GuideTableEnhancer() {
  useEffect(() => {
    const body = document.querySelector<HTMLElement>(".public-guide-body");
    if (!body) return;

    const wrappers = Array.from(body.querySelectorAll<HTMLElement>(".guide-table-scroll"));
    const cleanups: Array<() => void> = [];

    const closeAll = () => {
      wrappers.forEach((wrapper) => {
        wrapper.dataset.fullscreen = "false";
        const button = wrapper.querySelector<HTMLButtonElement>(".guide-table-expand");
        if (button) {
          button.setAttribute("aria-expanded", "false");
          button.textContent = "Open full view";
        }
      });
      document.body.classList.remove("guide-table-open");
    };

    wrappers.forEach((wrapper, index) => {
      const table = wrapper.querySelector("table");
      if (!table) return;
      const columns = Math.max(
        ...Array.from(table.rows).map((row) => row.cells.length),
        1,
      );
      const id = `guide-table-${index + 1}`;
      wrapper.id = id;
      wrapper.dataset.columns = String(columns);
      wrapper.dataset.fullscreen = "false";

      const toolbar = document.createElement("div");
      toolbar.className = "guide-table-toolbar";
      const label = document.createElement("span");
      label.textContent = `Table ${index + 1} · ${columns} ${columns === 1 ? "column" : "columns"}`;
      const button = document.createElement("button");
      button.className = "guide-table-expand";
      button.type = "button";
      button.setAttribute("aria-controls", id);
      button.setAttribute("aria-expanded", "false");
      button.textContent = "Open full view";

      const toggle = () => {
        const willOpen = wrapper.dataset.fullscreen !== "true";
        closeAll();
        wrapper.dataset.fullscreen = String(willOpen);
        button.setAttribute("aria-expanded", String(willOpen));
        button.textContent = willOpen ? "Close full view" : "Open full view";
        document.body.classList.toggle("guide-table-open", willOpen);
        if (willOpen) button.focus();
      };

      button.addEventListener("click", toggle);
      toolbar.append(label, button);
      wrapper.prepend(toolbar);
      cleanups.push(() => {
        button.removeEventListener("click", toggle);
        toolbar.remove();
      });
    });

    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAll();
    };
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("keydown", escape);
      closeAll();
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  return null;
}
