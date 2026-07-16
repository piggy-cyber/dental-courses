"use client";

import { useId, type KeyboardEvent } from "react";
import type { Tooth, ToothCatalog, ToothType } from "@/lib/games/tooth-types";
import type {
  ContactAreaRecord,
  ContactSurface,
  ContactZone,
} from "@/lib/games/contact-area-types";
import styles from "./ContactArea.module.css";

type ContactArchDiagramProps = {
  catalog: ToothCatalog;
  highlightedNumber: string;
};

const TOOTH_PATHS: Record<ToothType, string> = {
  incisor: "M-10 -17 Q0 -21 10 -17 L8 14 Q0 19 -8 14 Z",
  canine: "M0 -23 L12 -9 L8 15 Q0 20 -8 15 L-12 -9 Z",
  premolar: "M-14 -13 Q0 -21 14 -13 Q19 0 13 14 Q0 20 -13 14 Q-19 0 -14 -13 Z",
  molar: "M-18 -14 Q-9 -22 0 -15 Q10 -22 18 -13 Q23 -2 17 9 Q10 21 0 15 Q-11 21 -18 10 Q-23 -2 -18 -14 Z",
};

function archPoint(index: number, arch: "maxillary" | "mandibular") {
  const centerDistance = Math.abs(index - 7.5);
  return {
    x: 60 + index * 42.5,
    y: arch === "maxillary" ? 55 + centerDistance ** 1.55 * 2.2 : 205 - centerDistance ** 1.55 * 2.2,
    rotation: (index - 7.5) * (arch === "maxillary" ? 2.8 : -2.8),
  };
}

function ArchTooth({
  tooth,
  index,
  highlighted,
}: {
  tooth: Tooth;
  index: number;
  highlighted: boolean;
}) {
  const point = archPoint(index, tooth.arch);
  return (
    <g
      className={highlighted ? styles.archToothActive : styles.archTooth}
      transform={`translate(${point.x} ${point.y}) rotate(${point.rotation})`}
    >
      <path d={TOOTH_PATHS[tooth.toothType]} />
      {tooth.toothType === "incisor" ? <path className={styles.toothDetail} d="M-7 -12 Q0 -15 7 -12" /> : null}
      {tooth.toothType === "canine" ? <path className={styles.toothDetail} d="M0 -17 L0 12" /> : null}
      {tooth.toothType === "premolar" ? <path className={styles.toothDetail} d="M0 -13 L0 14 M-8 0 H8" /> : null}
      {tooth.toothType === "molar" ? <path className={styles.toothDetail} d="M-10 -7 L10 7 M9 -8 L-9 8" /> : null}
      {highlighted ? (
        <text className={styles.archToothLabel} x="0" y={tooth.arch === "maxillary" ? -29 : 33}>
          #{tooth.code}
        </text>
      ) : null}
    </g>
  );
}

export function ContactArchDiagram({ catalog, highlightedNumber }: ContactArchDiagramProps) {
  const permanent = catalog.teeth.filter((tooth) => tooth.dentition === "permanent");
  const maxillary = permanent.filter((tooth) => tooth.arch === "maxillary");
  const mandibular = permanent.filter((tooth) => tooth.arch === "mandibular");

  return (
    <svg
      className={styles.archDiagram}
      viewBox="0 0 760 260"
      role="img"
      aria-label={`Permanent arches with tooth ${highlightedNumber} highlighted`}
    >
      <path className={styles.archGuide} d="M45 95 Q380 -16 715 95" />
      <path className={styles.archGuide} d="M45 166 Q380 276 715 166" />
      <line className={styles.archMidline} x1="380" y1="22" x2="380" y2="238" />
      {maxillary.map((tooth, index) => (
        <ArchTooth key={tooth.code} tooth={tooth} index={index} highlighted={tooth.code === highlightedNumber} />
      ))}
      {mandibular.map((tooth, index) => (
        <ArchTooth key={tooth.code} tooth={tooth} index={index} highlighted={tooth.code === highlightedNumber} />
      ))}
      <text className={styles.archCaption} x="18" y="20">Patient right</text>
      <text className={styles.archCaption} x="742" y="20" textAnchor="end">Patient left</text>
      <text className={styles.archCaption} x="18" y="132">Maxillary</text>
      <text className={styles.archCaption} x="742" y="132" textAnchor="end">Mandibular</text>
    </svg>
  );
}
type ContactToothDiagramProps = {
  record: ContactAreaRecord;
  axis: "incisocervical" | "faciolingual";
  surface: ContactSurface;
  selectedZone: ContactZone | null;
  acceptedZones: ContactZone[];
  revealAccepted: boolean;
  disabled?: boolean;
  onSelect?: (zone: ContactZone) => void;
};

function crownFamily(record: ContactAreaRecord) {
  if (/incisor/i.test(record.toothName)) return "incisor";
  if (/canine/i.test(record.toothName)) return "canine";
  if (/premolar/i.test(record.toothName)) return "premolar";
  return "molar";
}

const FACIAL_OUTLINES = {
  incisor: "M150 72 Q260 46 370 72 L350 294 Q260 326 170 294 Z",
  canine: "M154 112 Q206 94 260 48 Q314 94 366 112 L350 294 Q260 326 170 294 Z",
  premolar: "M146 110 Q198 55 258 91 Q320 54 374 111 L352 292 Q260 326 168 292 Z",
  molar: "M128 111 Q170 53 222 92 Q260 48 302 92 Q350 55 392 111 L371 292 Q260 326 149 292 Z",
} as const;

const OCCLUSAL_OUTLINES = {
  incisor: "M128 145 Q260 76 392 145 Q368 260 260 286 Q152 260 128 145 Z",
  canine: "M136 156 Q260 64 384 156 Q366 272 260 294 Q154 272 136 156 Z",
  premolar: "M129 112 Q260 50 391 112 Q425 183 389 258 Q260 322 131 258 Q95 183 129 112 Z",
  molar: "M103 120 Q145 45 220 83 Q260 45 306 82 Q378 48 417 121 Q449 190 407 264 Q342 323 270 291 Q190 328 116 266 Q72 196 103 120 Z",
} as const;

function zoneLabel(zone: ContactZone) {
  if (zone === "facial-third") return "Facial or buccal third";
  if (zone === "facial-aspect-middle-third") return "Facial aspect of the middle third";
  if (zone === "facial-to-central-groove") return "Facial area extending toward the central groove";
  if (zone === "middle-third") return "Middle third";
  if (zone === "lingual-third") return "Lingual third";

  const surface = zone.startsWith("mesial-") ? "Mesial" : "Distal";
  if (zone.endsWith("middle-junction")) {
    return `${surface} incisal or occlusal-middle junction`;
  }
  if (zone.endsWith("incisal-occlusal")) return `${surface} incisal or occlusal third`;
  if (zone.endsWith("middle")) return `${surface} middle third`;
  return `${surface} cervical third`;
}

export function ContactToothDiagram({
  record,
  axis,
  surface,
  selectedZone,
  acceptedZones,
  revealAccepted,
  disabled = false,
  onSelect,
}: ContactToothDiagramProps) {
  const clipId = `contact-zone-${useId().replaceAll(":", "")}`;
  const family = crownFamily(record);
  const outline = axis === "incisocervical" ? FACIAL_OUTLINES[family] : OCCLUSAL_OUTLINES[family];
  let zones: Array<{ id: ContactZone; d: string }>;
  if (axis === "incisocervical") {
    zones = [
      { id: `${surface}-incisal-occlusal`, d: "M70 42 H450 V132 H70 Z" },
      {
        id: `${surface}-incisal-occlusal-middle-junction`,
        d: "M70 132 H450 V154 H70 Z",
      },
      { id: `${surface}-middle`, d: "M70 154 H450 V234 H70 Z" },
      { id: `${surface}-cervical`, d: "M70 234 H450 V338 H70 Z" },
    ];
  } else if (acceptedZones.includes("facial-to-central-groove")) {
    zones = [
      { id: "facial-to-central-groove", d: "M66 38 H454 V190 H66 Z" },
      { id: "middle-third", d: "M66 190 H454 V238 H66 Z" },
      { id: "lingual-third", d: "M66 238 H454 V338 H66 Z" },
    ];
  } else if (acceptedZones.includes("facial-aspect-middle-third")) {
    zones = [
      { id: "facial-third", d: "M66 38 H454 V142 H66 Z" },
      { id: "facial-aspect-middle-third", d: "M66 142 H454 V180 H66 Z" },
      { id: "middle-third", d: "M66 180 H454 V238 H66 Z" },
      { id: "lingual-third", d: "M66 238 H454 V338 H66 Z" },
    ];
  } else {
    zones = [
      { id: "facial-third", d: "M66 38 H454 V142 H66 Z" },
      { id: "middle-third", d: "M66 142 H454 V238 H66 Z" },
      { id: "lingual-third", d: "M66 238 H454 V338 H66 Z" },
    ];
  }

  function activate(zone: ContactZone) {
    if (!disabled) onSelect?.(zone);
  }

  function handleKeyDown(event: KeyboardEvent<SVGPathElement>, zone: ContactZone) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    activate(zone);
  }

  return (
    <svg
      className={styles.zoneDiagram}
      viewBox="0 0 520 370"
      role="group"
      aria-label={`${record.toothName}, ${axis === "incisocervical" ? "facial contact-height" : "occlusal faciolingual"} zones`}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={outline} />
        </clipPath>
      </defs>
      <path className={styles.zoneToothBase} d={outline} />
      <g clipPath={`url(#${clipId})`}>
        {zones.map((zone) => {
          const isSelected = zone.id === selectedZone;
          const isAccepted = revealAccepted && acceptedZones.includes(zone.id);
          const isWrong = revealAccepted && isSelected && !acceptedZones.includes(zone.id);
          const className = [
            styles.zoneTarget,
            isSelected ? styles.zoneSelected : "",
            isAccepted ? styles.zoneAccepted : "",
            isWrong ? styles.zoneWrong : "",
          ].filter(Boolean).join(" ");
          return (
            <path
              key={zone.id}
              className={className}
              d={zone.d}
              role="button"
              tabIndex={disabled ? -1 : 0}
              aria-label={`Select ${zoneLabel(zone.id)}`}
              aria-disabled={disabled}
              onClick={() => activate(zone.id)}
              onKeyDown={(event) => handleKeyDown(event, zone.id)}
            />
          );
        })}
      </g>
      <path className={styles.zoneToothOutline} d={outline} />
      {axis === "incisocervical" ? (
        <>
          <path className={styles.toothMorphologyLine} d={family === "molar" ? "M165 112 Q210 151 260 112 Q312 151 357 112" : family === "premolar" ? "M180 112 Q220 147 260 102 Q303 148 340 112" : family === "canine" ? "M192 123 Q260 87 328 123" : "M184 98 Q260 80 336 98"} />
          <path className={styles.toothMorphologyLine} d="M181 285 Q260 305 339 285" />
          <text className={styles.surfaceAxisLabel} x="104" y="194">M</text>
          <text className={styles.surfaceAxisLabel} x="416" y="194">D</text>
          <text className={styles.zoneAxisLabel} x="260" y="28" textAnchor="middle">Incisal / occlusal</text>
          <text className={styles.zoneAxisLabel} x="260" y="358" textAnchor="middle">Cervical</text>
          <path className={styles.surfaceFocusLine} d={surface === "mesial" ? "M129 105 Q112 200 150 296" : "M391 105 Q408 200 370 296"} />
        </>
      ) : (
        <>
          <path className={styles.toothMorphologyLine} d={family === "molar" ? "M156 126 Q214 164 260 122 Q308 165 364 126 M142 238 Q210 204 260 245 Q310 204 378 238" : family === "premolar" ? "M174 123 Q220 167 260 113 Q302 167 346 123 M176 247 Q220 208 260 255 Q304 208 344 247" : "M164 146 Q260 105 356 146 M174 250 Q260 277 346 250"} />
          <text className={styles.zoneAxisLabel} x="260" y="28" textAnchor="middle">Facial / buccal</text>
          <text className={styles.zoneAxisLabel} x="260" y="358" textAnchor="middle">Lingual</text>
          <text className={styles.surfaceBadge} x="260" y="190" textAnchor="middle">{surface.toUpperCase()} CONTACT</text>
        </>
      )}
    </svg>
  );
}
