"use client";

import { useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import type {
  Dentition,
  Tooth,
  ToothCatalog,
  ToothMorphologyTemplate,
  ToothQuadrant,
} from "@/lib/games/tooth-types";
import styles from "./ToothQuest.module.css";

type ToothArchProps = {
  catalog: ToothCatalog;
  dentition: Dentition;
  labelsVisible: boolean;
  highlightedCode?: string | null;
  selectedCode?: string | null;
  revealedCode?: string | null;
  selectionCorrect?: boolean | null;
  disabled?: boolean;
  onSelect: (tooth: Tooth) => void;
};

const QUADRANTS: Array<{ id: ToothQuadrant; short: string; label: string }> = [
  { id: "maxillary-right", short: "UR", label: "Upper right" },
  { id: "maxillary-left", short: "UL", label: "Upper left" },
  { id: "mandibular-left", short: "LL", label: "Lower left" },
  { id: "mandibular-right", short: "LR", label: "Lower right" },
];

function curveFor(index: number, count: number) {
  if (count < 2) return 0;
  const midpoint = (count - 1) / 2;
  const centerWeight = 1 - Math.abs(index - midpoint) / midpoint;
  return Math.round(centerWeight * (count > 12 ? 38 : 26));
}

function toothAriaLabel(tooth: Tooth) {
  const arch = tooth.arch === "maxillary" ? "upper" : "lower";
  return `Tooth ${tooth.code}, ${tooth.side} ${arch} ${tooth.name}`;
}

type CrownProps = {
  tooth: Tooth;
  template: ToothMorphologyTemplate;
};

function Crown({ tooth, template }: CrownProps) {
  return (
    <span
      className={`${styles.crown} ${tooth.mirrorX ? styles.mirroredCrown : ""}`}
      data-type={tooth.toothType}
      data-profile={template.cssProfile}
      data-cusps={template.cusps.typical}
      aria-hidden="true"
    >
      <span className={`${styles.cusp} ${styles.cuspOne}`} />
      <span className={`${styles.cusp} ${styles.cuspTwo}`} />
      <span className={`${styles.cusp} ${styles.cuspThree}`} />
      <span className={`${styles.cusp} ${styles.cuspFour}`} />
      <span className={`${styles.cusp} ${styles.cuspFive}`} />
      <span className={styles.mainGroove} />
      <span className={styles.crossGroove} />
      <span className={styles.centralPit} />
      <span className={styles.incisalEdge} />
    </span>
  );
}

type ToothButtonProps = {
  tooth: Tooth;
  template: ToothMorphologyTemplate;
  index: number;
  count: number;
  direction: "upper" | "lower";
  labelsVisible: boolean;
  highlightedCode?: string | null;
  selectedCode?: string | null;
  revealedCode?: string | null;
  selectionCorrect?: boolean | null;
  disabled?: boolean;
  onSelect: (tooth: Tooth) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
};

function ToothButton({
  tooth,
  template,
  index,
  count,
  direction,
  labelsVisible,
  highlightedCode,
  selectedCode,
  revealedCode,
  selectionCorrect,
  disabled,
  onSelect,
  onKeyDown,
}: ToothButtonProps) {
  const isHighlighted = highlightedCode === tooth.code;
  const isSelected = selectedCode === tooth.code;
  const isRevealed = revealedCode === tooth.code;
  const stateClass = isSelected
    ? selectionCorrect === true
      ? styles.toothCorrect
      : selectionCorrect === false
        ? styles.toothWrong
        : styles.toothSelected
    : isRevealed
      ? styles.toothRevealed
      : "";
  const style = {
    "--curve": `${curveFor(index, count)}px`,
  } as CSSProperties;

  return (
    <button
      type="button"
      className={`${styles.toothTarget} ${styles[direction]} ${isHighlighted ? styles.toothHighlighted : ""} ${stateClass}`}
      style={style}
      data-tooth-button
      data-code={tooth.code}
      aria-label={`${toothAriaLabel(tooth)}${isHighlighted ? ", highlighted target" : ""}`}
      aria-current={isHighlighted ? "true" : undefined}
      aria-pressed={isSelected}
      disabled={disabled}
      onClick={() => onSelect(tooth)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(tooth);
          return;
        }
        onKeyDown(event);
      }}
    >
      <Crown tooth={tooth} template={template} />
      <span className={`${styles.toothLabel} ${labelsVisible ? styles.labelVisible : ""}`}>
        {tooth.code}
      </span>
    </button>
  );
}

export function ToothArch({
  catalog,
  dentition,
  labelsVisible,
  highlightedCode,
  selectedCode,
  revealedCode,
  selectionCorrect,
  disabled,
  onSelect,
}: ToothArchProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [mobileQuadrant, setMobileQuadrant] = useState<ToothQuadrant>("maxillary-right");
  const templates = useMemo(
    () => new Map(catalog.morphologyTemplates.map((template) => [template.id, template])),
    [catalog.morphologyTemplates],
  );
  const teeth = useMemo(
    () => catalog.teeth.filter((tooth) => tooth.dentition === dentition),
    [catalog.teeth, dentition],
  );
  const maxillary = teeth
    .filter((tooth) => tooth.arch === "maxillary")
    .sort((a, b) => toothSortValue(a.code) - toothSortValue(b.code));
  const mandibular = teeth
    .filter((tooth) => tooth.arch === "mandibular")
    .sort((a, b) => toothSortValue(b.code) - toothSortValue(a.code));
  const highlightedTooth = teeth.find((tooth) => tooth.code === highlightedCode);
  const activeMobileQuadrant = highlightedTooth?.quadrant ?? mobileQuadrant;
  const mobileTeeth = teeth
    .filter((tooth) => tooth.quadrant === activeMobileQuadrant)
    .sort((a, b) => b.positionFromMidline - a.positionFromMidline);

  function focusTooth(code: string) {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const matchingButtons = Array.from(
          rootRef.current?.querySelectorAll<HTMLButtonElement>(
            `button[data-tooth-button][data-code="${code}"]`,
          ) ?? [],
        );
        matchingButtons.find((button) => button.offsetParent !== null)?.focus();
      });
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!rootRef.current || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      return;
    }
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (isMobile && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      const currentTooth = teeth.find((tooth) => tooth.code === event.currentTarget.dataset.code);
      const targetArch = event.key === "ArrowUp" ? "maxillary" : "mandibular";
      if (!currentTooth || currentTooth.arch === targetArch) return;
      const targetTooth = teeth.find(
        (tooth) =>
          tooth.arch === targetArch &&
          tooth.side === currentTooth.side &&
          tooth.positionFromMidline === currentTooth.positionFromMidline,
      );
      if (!targetTooth) return;
      event.preventDefault();
      setMobileQuadrant(targetTooth.quadrant);
      focusTooth(targetTooth.code);
      return;
    }

    const buttons = Array.from(
      rootRef.current.querySelectorAll<HTMLButtonElement>("button[data-tooth-button]:not(:disabled)"),
    ).filter((button) => button.offsetParent !== null);
    const currentIndex = buttons.indexOf(event.currentTarget);
    if (currentIndex < 0) return;

    let nextIndex = currentIndex;
    if (event.key === "ArrowLeft") nextIndex -= 1;
    if (event.key === "ArrowRight") nextIndex += 1;
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      const rowLength = dentition === "permanent" ? 16 : 10;
      nextIndex += event.key === "ArrowDown" ? rowLength : -rowLength;
    }
    if (nextIndex < 0 || nextIndex >= buttons.length) return;
    event.preventDefault();
    buttons[nextIndex]?.focus();
  }

  function handleQuadrantKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    quadrant: ToothQuadrant,
  ) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    const currentIndex = QUADRANTS.findIndex((item) => item.id === quadrant);
    let target = QUADRANTS[currentIndex];
    if (event.key === "ArrowLeft") {
      target = QUADRANTS[(currentIndex - 1 + QUADRANTS.length) % QUADRANTS.length];
    } else if (event.key === "ArrowRight") {
      target = QUADRANTS[(currentIndex + 1) % QUADRANTS.length];
    } else {
      const [arch, side] = quadrant.split("-") as ["maxillary" | "mandibular", "right" | "left"];
      const targetArch = event.key === "ArrowUp" ? "maxillary" : "mandibular";
      if (arch === targetArch) return;
      target = QUADRANTS.find((item) => item.id === `${targetArch}-${side}`) ?? target;
    }
    if (!target || target.id === quadrant) return;
    event.preventDefault();
    setMobileQuadrant(target.id);
    window.requestAnimationFrame(() => {
      document.getElementById(`quadrant-tab-${target.id}`)?.focus();
    });
  }

  function renderTooth(tooth: Tooth, index: number, count: number, direction: "upper" | "lower") {
    const template = templates.get(tooth.templateId);
    if (!template) return null;
    return (
      <ToothButton
        key={tooth.code}
        tooth={tooth}
        template={template}
        index={index}
        count={count}
        direction={direction}
        labelsVisible={labelsVisible}
        highlightedCode={highlightedCode}
        selectedCode={selectedCode}
        revealedCode={revealedCode}
        selectionCorrect={selectionCorrect}
        disabled={disabled}
        onSelect={onSelect}
        onKeyDown={handleKeyDown}
      />
    );
  }

  return (
    <div ref={rootRef} className={styles.archRoot}>
      <div className={styles.desktopArch} role="group" aria-label={`${dentition} dentition chart`}>
        <div className={styles.archOrientation} aria-hidden="true">
          <span>Patient right</span>
          <span>Patient left</span>
        </div>
        <div className={`${styles.archRow} ${styles.maxillaryRow}`}>
          {maxillary.map((tooth, index) => renderTooth(tooth, index, maxillary.length, "upper"))}
        </div>
        <div className={styles.midline} aria-hidden="true">
          <span>Maxillary</span>
          <i />
          <span>Mandibular</span>
        </div>
        <div className={`${styles.archRow} ${styles.mandibularRow}`}>
          {mandibular.map((tooth, index) => renderTooth(tooth, index, mandibular.length, "lower"))}
        </div>
      </div>

      <div className={styles.mobileArch}>
        <div className={styles.quadrantTabs} role="tablist" aria-label="Choose a mouth quadrant">
          {QUADRANTS.map((quadrant) => (
            <button
              key={quadrant.id}
              id={`quadrant-tab-${quadrant.id}`}
              type="button"
              role="tab"
              aria-controls="mobile-quadrant-panel"
              aria-selected={activeMobileQuadrant === quadrant.id}
              className={activeMobileQuadrant === quadrant.id ? styles.activeQuadrant : ""}
              disabled={Boolean(highlightedTooth)}
              tabIndex={activeMobileQuadrant === quadrant.id ? 0 : -1}
              onClick={() => setMobileQuadrant(quadrant.id)}
              onKeyDown={(event) => handleQuadrantKeyDown(event, quadrant.id)}
            >
              <span aria-hidden="true">{quadrant.short}</span>
              <small>{quadrant.label}</small>
            </button>
          ))}
        </div>
        <div
          id="mobile-quadrant-panel"
          className={styles.mobileQuadrantPanel}
          role="tabpanel"
          aria-labelledby={`quadrant-tab-${activeMobileQuadrant}`}
        >
          <p>{QUADRANTS.find((quadrant) => quadrant.id === activeMobileQuadrant)?.label}</p>
          <div className={styles.mobileToothRow}>
            {mobileTeeth.map((tooth, index) =>
              renderTooth(
                tooth,
                index,
                mobileTeeth.length,
                tooth.arch === "maxillary" ? "upper" : "lower",
              ),
            )}
          </div>
          <span className={styles.mobileOrientation}>Posterior → midline</span>
        </div>
      </div>
    </div>
  );
}

function toothSortValue(code: string) {
  const numericCode = Number(code);
  if (Number.isFinite(numericCode)) return numericCode;
  return code.charCodeAt(0);
}
