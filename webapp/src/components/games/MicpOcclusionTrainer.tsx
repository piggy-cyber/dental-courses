"use client";

import Link from "next/link";
import { useState, type KeyboardEvent } from "react";
import toothCatalogJson from "@/data/games/tooth-data.json";
import { micpOcclusionDataset } from "@/data/games/micp-occlusion-data";
import {
  isPermanentTooth,
  type PermanentTooth,
  type ToothArch,
  type ToothCatalog,
} from "@/lib/games/tooth-types";
import {
  isCourseVerifiedMicpRelationship,
  type MicpOcclusionDataset,
} from "@/lib/games/micp-types";
import styles from "./MicpOcclusionTrainer.module.css";

const catalog = toothCatalogJson as ToothCatalog;
const permanentTeeth = catalog.teeth.filter(isPermanentTooth);

const DISPLAY_ORDER: Record<ToothArch, PermanentTooth[]> = {
  maxillary: permanentTeeth
    .filter((tooth) => tooth.arch === "maxillary")
    .sort((a, b) => Number(a.code) - Number(b.code)),
  mandibular: permanentTeeth
    .filter((tooth) => tooth.arch === "mandibular")
    .sort((a, b) => Number(b.code) - Number(a.code)),
};

type ArrowKey = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown";

function qualifiedName(tooth: PermanentTooth) {
  return `${tooth.side} ${tooth.arch} ${tooth.name.toLowerCase()}`;
}

function archPosition(index: number, count: number, arch: ToothArch) {
  const progress = index / (count - 1);
  const centerWeight = 1 - Math.abs(progress * 2 - 1);
  const x = 62 + progress * 836;
  const y = arch === "maxillary" ? 45 + centerWeight * 108 : 167 - centerWeight * 108;
  const angle = (progress - 0.5) * (arch === "maxillary" ? -50 : 50);
  return { x, y, angle };
}

function toothScale(tooth: PermanentTooth) {
  if (tooth.toothType === "molar") return tooth.name.startsWith("Third") ? 0.96 : 1.08;
  if (tooth.toothType === "premolar") return 0.92;
  if (tooth.toothType === "canine") return 0.88;
  return tooth.name.startsWith("Lateral") ? 0.78 : 0.84;
}

function CrownShape({ tooth }: { tooth: PermanentTooth }) {
  if (tooth.toothType === "incisor") {
    const lateral = tooth.name.startsWith("Lateral");
    return (
      <>
        <path
          d={
            lateral
              ? "M-15-25 C-20-13-18 12-11 25 C-5 30 6 30 12 24 C18 10 19-13 14-24 C6-30-7-30-15-25Z"
              : "M-19-25 C-22-10-20 15-13 27 C-5 31 6 31 14 27 C20 15 22-10 18-25 C8-31-9-31-19-25Z"
          }
        />
        <path className={styles.svgDetail} d="M-11 14 Q0 19 11 14" />
        <path className={styles.svgDetail} d="M-13-18 Q0-23 13-18" />
      </>
    );
  }

  if (tooth.toothType === "canine") {
    return (
      <>
        <path d="M0-31 C-8-28-18-17-20-2 C-19 13-12 25 0 30 C12 25 19 13 20-2 C18-17 8-28 0-31Z" />
        <path className={styles.svgDetail} d="M0-23 L0 20" />
        <path className={styles.svgDetail} d="M-12 7 Q0-2 12 7" />
      </>
    );
  }

  if (tooth.toothType === "premolar") {
    const second = tooth.name.startsWith("Second");
    return (
      <>
        <path
          d={
            second
              ? "M0-29 C-15-28-24-16-23 1 C-22 18-13 29 0 31 C14 29 22 18 23 1 C24-16 15-28 0-29Z"
              : "M0-31 C-13-30-24-17-22 2 C-21 18-12 28 0 30 C12 28 21 18 22 2 C24-17 13-30 0-31Z"
          }
        />
        <path className={styles.svgDetail} d="M-15 0 Q0-11 15 0 Q0 11-15 0Z" />
        <circle className={styles.svgPit} cx="0" cy="0" r="2.5" />
      </>
    );
  }

  const third = tooth.name.startsWith("Third");
  const second = tooth.name.startsWith("Second");
  return (
    <>
      <path
        d={
          third
            ? "M-21-25 C-30-13-27 10-18 24 C-7 32 11 29 21 18 C29 4 27-15 17-25 C6-31-10-31-21-25Z"
            : second
              ? "M-24-26 C-31-13-29 12-19 26 C-7 32 8 31 20 25 C29 12 31-13 23-26 C10-32-11-32-24-26Z"
              : "M-25-26 C-32-12-29 13-19 27 C-8 32 9 32 21 25 C31 11 31-13 22-27 C9-32-12-32-25-26Z"
        }
      />
      <path className={styles.svgDetail} d="M-17-12 Q0 0 17-12 M-17 13 Q0 0 17 13 M0-20 L0 20" />
      <circle className={styles.svgPit} cx="0" cy="0" r="3" />
      {!third ? <circle className={styles.svgPit} cx="-10" cy="9" r="2" /> : null}
    </>
  );
}

type ArchDiagramProps = {
  arch: ToothArch;
  focusedCode: string;
  selectedCode: string | null;
  onFocus: (tooth: PermanentTooth) => void;
  onSelect: (tooth: PermanentTooth) => void;
  onNavigate: (tooth: PermanentTooth, key: ArrowKey) => void;
};

function ArchDiagram({
  arch,
  focusedCode,
  selectedCode,
  onFocus,
  onSelect,
  onNavigate,
}: ArchDiagramProps) {
  const teeth = DISPLAY_ORDER[arch];
  const label = arch === "maxillary" ? "Maxillary arch" : "Mandibular arch";

  function handleKeyDown(event: KeyboardEvent<SVGGElement>, tooth: PermanentTooth) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(tooth);
      return;
    }
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      onNavigate(tooth, event.key as ArrowKey);
    }
  }

  return (
    <section className={styles.archSection} aria-labelledby={`${arch}-arch-label`}>
      <div className={styles.archHeading}>
        <h2 id={`${arch}-arch-label`}>{label}</h2>
        <span>{arch === "maxillary" ? "Above" : "Below"} · permanent dentition</span>
      </div>
      <div className={styles.archScroller}>
        <svg
          className={styles.archSvg}
          viewBox="0 0 960 220"
          role="group"
          aria-label={`${label}, selectable Universal teeth`}
        >
          <path
            className={styles.archGuide}
            d={
              arch === "maxillary"
                ? "M46 39 C210 39 246 174 480 174 C714 174 750 39 914 39"
                : "M46 181 C210 181 246 46 480 46 C714 46 750 181 914 181"
            }
          />
          <line className={styles.midline} x1="480" x2="480" y1="13" y2="207" />
          {teeth.map((tooth, index) => {
            const { x, y, angle } = archPosition(index, teeth.length, arch);
            const selected = tooth.code === selectedCode;
            const scale = toothScale(tooth);
            return (
              <g
                key={tooth.code}
                id={`micp-tooth-${tooth.code}`}
                className={`${styles.toothGroup} ${selected ? styles.toothSelected : ""}`}
                role="button"
                tabIndex={tooth.code === focusedCode ? 0 : -1}
                aria-label={`Tooth ${tooth.code}, ${qualifiedName(tooth)}`}
                aria-pressed={selected}
                transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}
                onClick={() => onSelect(tooth)}
                onFocus={() => onFocus(tooth)}
                onKeyDown={(event) => handleKeyDown(event, tooth)}
              >
                <circle className={styles.svgHitArea} r="35" />
                <CrownShape tooth={tooth} />
              </g>
            );
          })}
          <g aria-hidden="true">
            {teeth.map((tooth, index) => {
              const { x, y } = archPosition(index, teeth.length, arch);
              const labelY = arch === "maxillary" ? Math.min(209, y + 46) : Math.max(13, y - 41);
              return (
                <text key={`label-${tooth.code}`} className={styles.svgLabel} x={x} y={labelY}>
                  {tooth.code}
                </text>
              );
            })}
          </g>
        </svg>
      </div>
    </section>
  );
}

function focusTooth(code: string) {
  window.requestAnimationFrame(() => {
    document.getElementById(`micp-tooth-${code}`)?.focus();
  });
}

function moduleStateFrom(dataset: MicpOcclusionDataset) {
  const verifiedRelationshipCount = dataset.relationships.filter(
    isCourseVerifiedMicpRelationship,
  ).length;

  if (dataset.status === "ready") {
    return {
      statusLabel: "Course-verified map staged",
      heading: "Reviewed MICP relationship data is staged",
      explanation:
        "The reviewed dataset is present, but Study and Challenge mechanics are not implemented in this placeholder.",
      heroCopy:
        "Explore the arch shell. Reviewed relationship details remain hidden until the learning mechanic is built.",
      selectionCopy:
        "Selection confirmed. Reviewed relationship details are not exposed in this placeholder.",
      relationshipState: "Staged, not shown",
      explanationState: "Locked in placeholder",
      clinicalNoteState: "Locked in placeholder",
      evidenceState: `${verifiedRelationshipCount} verified record${verifiedRelationshipCount === 1 ? "" : "s"} staged`,
      feedbackSuffix: "Relationship details are not exposed in this placeholder.",
      footer: `${verifiedRelationshipCount} runtime-validated relationship record${verifiedRelationshipCount === 1 ? " is" : "s are"} staged; modes remain unavailable.`,
    };
  }

  return {
    statusLabel: "Clinical map in review",
    heading: "MICP relationship data will be added next",
    explanation:
      "The evidence set is being reviewed tooth by tooth before any relationship appears here.",
    heroCopy:
      "Explore the arch shell now. Reviewed tooth relationships will unlock the learning mechanic later.",
    selectionCopy:
      "Selection confirmed. No opposing contact, cusp, fossa or embrasure, or contact type has been assigned.",
    relationshipState: "Pending review",
    explanationState: "Not authored",
    clinicalNoteState: "Not authored",
    evidenceState: "Needs review",
    feedbackSuffix: "Relationship details remain locked for clinical review.",
    footer: "No relationship records are available in Study or Challenge mode.",
  };
}

export function MicpOcclusionTrainer() {
  const [focusedCode, setFocusedCode] = useState("1");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const selectedTooth = permanentTeeth.find((tooth) => tooth.code === selectedCode) ?? null;
  const moduleState = moduleStateFrom(micpOcclusionDataset);

  function selectTooth(tooth: PermanentTooth) {
    setFocusedCode(tooth.code);
    setSelectedCode(tooth.code);
  }

  function navigateFrom(tooth: PermanentTooth, key: ArrowKey) {
    if (key === "ArrowUp" || key === "ArrowDown") {
      const targetArch: ToothArch = key === "ArrowUp" ? "maxillary" : "mandibular";
      if (targetArch === tooth.arch) return;
      const counterpart = permanentTeeth.find(
        (candidate) =>
          candidate.arch === targetArch &&
          candidate.side === tooth.side &&
          candidate.positionFromMidline === tooth.positionFromMidline,
      );
      if (counterpart) {
        setFocusedCode(counterpart.code);
        focusTooth(counterpart.code);
      }
      return;
    }

    const teeth = DISPLAY_ORDER[tooth.arch];
    const currentIndex = teeth.findIndex((candidate) => candidate.code === tooth.code);
    const nextIndex = currentIndex + (key === "ArrowLeft" ? -1 : 1);
    const nextTooth = teeth[nextIndex];
    if (nextTooth) {
      setFocusedCode(nextTooth.code);
      focusTooth(nextTooth.code);
    }
  }

  return (
    <main id="game-content" className={styles.page}>
      <header className={styles.hero}>
        <div>
          <Link href="/games" className={styles.backLink}>
            <span aria-hidden="true">←</span> Study arcade
          </Link>
          <p className={styles.kicker}>Occlusion lab · Future module</p>
          <h1>MICP Occlusion Trainer</h1>
          <p className={styles.heroCopy}>{moduleState.heroCopy}</p>
        </div>
        <div
          className={styles.progressCluster}
          aria-label="MICP progress unavailable in this placeholder"
        >
          <span><small>Score</small><strong>—</strong></span>
          <span><small>Streak</small><strong>—</strong></span>
          <span><small>Attempts</small><strong>—</strong></span>
          <span><small>Accuracy</small><strong>—</strong></span>
        </div>
      </header>

      <section className={styles.gameFrame} aria-labelledby="module-state-heading">
        <div className={styles.controlRail}>
          <div>
            <p className={styles.controlLabel}>Mode</p>
            <div
              className={styles.modeTabs}
              role="group"
              aria-label="MICP modes unavailable in this placeholder"
            >
              <button type="button" disabled>
                <small>Future data</small>
                <span>Study</span>
              </button>
              <button type="button" disabled>
                <small>Mechanics pending</small>
                <span>Challenge</span>
              </button>
            </div>
          </div>
          <div className={styles.futureControls} aria-label="Future game controls">
            <span>Review screen</span>
            <button type="button" disabled>Unavailable</button>
          </div>
        </div>

        <div className={styles.reviewBanner}>
          <span className={styles.statusDot} aria-hidden="true" />
          <div>
            <p>{moduleState.statusLabel}</p>
            <h2 id="module-state-heading">{moduleState.heading}</h2>
            <span>{moduleState.explanation}</span>
          </div>
        </div>

        <div className={styles.workspace}>
          <div className={styles.archStack}>
            <div className={styles.orientation} aria-hidden="true">
              <span>Patient right</span>
              <span>Patient left</span>
            </div>
            <ArchDiagram
              arch="maxillary"
              focusedCode={focusedCode}
              selectedCode={selectedCode}
              onFocus={(tooth) => setFocusedCode(tooth.code)}
              onSelect={selectTooth}
              onNavigate={navigateFrom}
            />
            <ArchDiagram
              arch="mandibular"
              focusedCode={focusedCode}
              selectedCode={selectedCode}
              onFocus={(tooth) => setFocusedCode(tooth.code)}
              onSelect={selectTooth}
              onNavigate={navigateFrom}
            />
          </div>

          <aside className={styles.selectionPanel}>
            <p className={styles.controlLabel}>Neutral selection</p>
            {selectedTooth ? (
              <>
                <div className={styles.selectionIdentity}>
                  <span>{selectedTooth.code}</span>
                  <div>
                    <small>Selected tooth</small>
                    <h2>{qualifiedName(selectedTooth)}</h2>
                  </div>
                </div>
                <p className={styles.selectionCopy}>
                  {moduleState.selectionCopy}
                </p>
              </>
            ) : (
              <div className={styles.emptySelection}>
                <span aria-hidden="true">+</span>
                <h2>Select a tooth</h2>
                <p>Click a crown, or focus one with the keyboard and press Enter or Space.</p>
              </div>
            )}

            <dl className={styles.pendingFields}>
              <div><dt>Relationship</dt><dd>{moduleState.relationshipState}</dd></div>
              <div><dt>Explanation</dt><dd>{moduleState.explanationState}</dd></div>
              <div><dt>Clinical note</dt><dd>{moduleState.clinicalNoteState}</dd></div>
              <div><dt>Evidence</dt><dd>{moduleState.evidenceState}</dd></div>
            </dl>

            <div className={styles.weakAreas}>
              <span>Weak areas</span>
              <strong>—</strong>
              <p>No scored answers yet.</p>
            </div>
          </aside>
        </div>

        <div className={styles.feedbackBar} aria-live="polite">
          {selectedTooth
            ? `Tooth ${selectedTooth.code} selected. ${moduleState.feedbackSuffix}`
            : "Select any tooth to inspect this review-gated shell."}
        </div>
      </section>

      <footer className={styles.gameFooter}>
        <p>Use ← → within an arch, ↑ ↓ between arches, then Enter or Space to select.</p>
        <p>{moduleState.footer}</p>
      </footer>
    </main>
  );
}
