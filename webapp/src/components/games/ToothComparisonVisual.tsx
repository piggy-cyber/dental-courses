import { useId, type ReactNode } from "react";
import {
  TOOTH_COMPARISON_VISUALS,
  type ToothComparisonVisualId,
} from "@/data/games/tooth-comparison-visuals";
import styles from "./ToothComparisonDuel.module.css";

type ToothComparisonVisualProps = {
  card: "A" | "B";
  label: string;
  universal: string;
  visualId: string;
  state?: "idle" | "correct" | "wrong";
};

function IncisorCentral({ maxillary }: { maxillary: boolean }) {
  return maxillary ? (
    <>
      <path className={styles.svgRoot} d="M104 108 C103 143 111 181 130 207 C148 179 156 141 154 108 Z" />
      <path className={styles.svgCrown} d="M70 45 Q75 20 102 16 L154 18 Q181 22 188 48 L178 113 Q158 131 108 128 L72 114 Z" />
      <path className={styles.svgRidge} d="M82 49 L178 50 M92 57 Q130 85 166 57" />
      <path className={styles.svgGroove} d="M96 62 Q130 103 166 63" />
      <ellipse className={styles.svgLandmark} cx="148" cy="109" rx="12" ry="7" />
      <path className={styles.svgGuide} d="M77 43 L103 43" />
    </>
  ) : (
    <>
      <path className={styles.svgRoot} d="M111 105 C110 143 116 184 130 207 C144 184 150 143 149 105 Z" />
      <path className={styles.svgCrown} d="M92 43 Q96 22 111 17 L148 17 Q164 22 168 43 L164 114 Q147 127 112 127 Q96 121 93 110 Z" />
      <path className={styles.svgRidge} d="M98 45 L162 45 M105 62 Q130 80 155 62" />
      <path className={styles.svgGroove} d="M111 68 Q130 91 149 68" />
      <ellipse className={styles.svgLandmark} cx="130" cy="111" rx="9" ry="5" />
      <path className={styles.svgGuide} d="M130 18 L130 127" />
    </>
  );
}

function IncisorLateral({ maxillary }: { maxillary: boolean }) {
  return maxillary ? (
    <>
      <path className={styles.svgRoot} d="M112 106 C111 147 118 185 132 207 C147 181 152 143 149 106 Z" />
      <path className={styles.svgCrown} d="M87 48 Q91 25 110 18 Q139 10 159 26 Q174 39 170 60 L162 112 Q148 127 113 128 Q94 121 89 106 Z" />
      <path className={styles.svgRidge} d="M96 54 Q130 36 164 55 M103 65 Q130 91 158 65" />
      <path className={styles.svgGroove} d="M107 66 Q130 110 154 66" />
      <circle className={styles.svgLandmark} cx="132" cy="108" r="9" />
      <circle className={styles.svgLandmark} cx="134" cy="72" r="3" />
    </>
  ) : (
    <>
      <path className={styles.svgRoot} d="M109 105 C111 146 119 184 134 207 C149 183 153 143 149 105 Z" />
      <path className={styles.svgCrown} d="M91 43 Q95 24 112 18 L147 19 Q166 29 171 50 L164 114 Q146 127 113 126 Q97 119 94 108 Z" />
      <path className={styles.svgRidge} d="M98 44 Q130 42 165 52 M105 65 Q133 82 158 64" />
      <path className={styles.svgGroove} d="M111 69 Q133 91 154 68" />
      <ellipse className={styles.svgLandmark} cx="147" cy="109" rx="9" ry="5" />
      <path className={styles.svgGuide} d="M98 43 Q132 47 166 54" />
    </>
  );
}

function Canine({ maxillary }: { maxillary: boolean }) {
  return maxillary ? (
    <>
      <path className={styles.svgRoot} d="M103 109 C101 151 112 190 129 211 C149 184 158 146 154 108 Z" />
      <path className={styles.svgCrown} d="M78 80 Q86 47 113 37 L130 12 L147 40 Q174 52 181 82 L166 119 Q142 133 106 126 Q87 118 79 101 Z" />
      <path className={styles.svgRidge} d="M130 21 L127 113 M94 77 Q129 54 166 78" />
      <path className={styles.svgGroove} d="M105 81 Q112 102 123 111 M154 81 Q147 103 136 112" />
      <ellipse className={styles.svgLandmark} cx="130" cy="112" rx="14" ry="8" />
      <path className={styles.svgGuide} d="M162 52 Q180 76 164 105" />
    </>
  ) : (
    <>
      <path className={styles.svgRoot} d="M111 105 C108 151 118 190 132 211 C147 181 151 145 148 104 Z" />
      <path className={styles.svgCrown} d="M91 75 Q98 45 119 37 L132 18 L145 42 Q163 53 169 79 L160 116 Q145 130 116 125 Q99 118 93 103 Z" />
      <path className={styles.svgRidge} d="M132 27 L132 111 M104 78 Q132 62 160 81" />
      <path className={styles.svgGroove} d="M111 84 Q119 100 126 108 M151 85 Q144 101 138 108" />
      <ellipse className={styles.svgLandmark} cx="143" cy="112" rx="10" ry="6" />
      <path className={styles.svgGuide} d="M132 18 L143 112" />
    </>
  );
}

function MaxPremolar({ first }: { first: boolean }) {
  return first ? (
    <>
      <path className={styles.svgRoot} d="M76 163 C70 179 72 196 84 207 C99 195 107 178 108 160 Z" />
      <path className={styles.svgRoot} d="M151 160 C153 179 162 196 176 207 C187 193 188 177 182 163 Z" />
      <path className={styles.svgCrown} d="M72 59 L100 25 Q130 14 161 27 L188 62 L174 121 Q130 145 85 120 Z" />
      <ellipse className={styles.svgCusp} cx="130" cy="54" rx="31" ry="23" />
      <ellipse className={styles.svgCusp} cx="130" cy="106" rx="27" ry="19" />
      <path className={styles.svgGroove} d="M91 85 Q130 72 171 85 M88 80 L73 67" />
      <path className={styles.svgRidge} d="M101 51 L130 82 L159 51 M106 108 L130 84 L155 107" />
      <circle className={styles.svgLandmark} cx="91" cy="84" r="4" />
      <circle className={styles.svgLandmark} cx="170" cy="84" r="4" />
      <path className={styles.svgGuide} d="M60 151 H198 V214 H60 Z" />
      <text className={styles.svgAnnotation} x="84" y="158" textAnchor="middle">F</text>
      <text className={styles.svgAnnotation} x="176" y="158" textAnchor="middle">L</text>
      <text className={styles.svgAnnotation} x="129" y="216" textAnchor="middle">COMMON TWO-ROOT VARIANT · 61%</text>
    </>
  ) : (
    <>
      <path className={styles.svgRoot} d="M112 121 C109 157 117 188 131 208 C147 185 153 155 149 120 Z" />
      <path className={styles.svgCrown} d="M78 58 Q91 28 126 21 Q162 22 182 55 Q190 88 173 119 Q137 143 96 125 Q72 101 78 58 Z" />
      <ellipse className={styles.svgCusp} cx="130" cy="57" rx="30" ry="21" />
      <ellipse className={styles.svgCusp} cx="130" cy="105" rx="29" ry="21" />
      <path className={styles.svgGroove} d="M107 85 Q130 79 153 85 M103 70 L91 62 M157 71 L170 62 M105 101 L92 111 M155 101 L168 112" />
      <circle className={styles.svgLandmark} cx="105" cy="85" r="4" />
      <circle className={styles.svgLandmark} cx="155" cy="85" r="4" />
    </>
  );
}

function MandPremolar({ first }: { first: boolean }) {
  return first ? (
    <>
      <path className={styles.svgRoot} d="M113 119 C109 156 116 187 130 209 C146 187 152 155 148 119 Z" />
      <path className={styles.svgCrown} d="M130 19 L184 76 L132 139 L76 79 Z" />
      <ellipse className={styles.svgCusp} cx="130" cy="55" rx="34" ry="28" />
      <ellipse className={styles.svgCusp} cx="130" cy="116" rx="15" ry="11" />
      <path className={styles.svgRidge} d="M102 72 L130 91 L159 71 M130 91 L130 111" />
      <path className={styles.svgGroove} d="M96 92 Q107 102 119 108" />
      <circle className={styles.svgLandmark} cx="97" cy="92" r="4" />
      <circle className={styles.svgLandmark} cx="162" cy="92" r="4" />
    </>
  ) : (
    <>
      <path className={styles.svgRoot} d="M111 121 C109 157 116 188 131 209 C149 185 154 154 149 120 Z" />
      <path className={styles.svgCrown} d="M79 57 Q94 28 130 22 Q166 27 183 58 Q190 91 171 121 Q133 143 96 125 Q72 98 79 57 Z" />
      <ellipse className={styles.svgCusp} cx="130" cy="54" rx="34" ry="24" />
      <ellipse className={styles.svgCusp} cx="108" cy="108" rx="20" ry="16" />
      <ellipse className={styles.svgCusp} cx="153" cy="109" rx="18" ry="15" />
      <path className={styles.svgGroove} d="M130 75 L130 91 M130 91 L108 111 M130 91 L153 111" />
      <circle className={styles.svgLandmark} cx="130" cy="91" r="4" />
      <circle className={styles.svgLandmark} cx="91" cy="92" r="3" />
      <circle className={styles.svgLandmark} cx="170" cy="92" r="3" />
    </>
  );
}

function MaxMolar({ first }: { first: boolean }) {
  return first ? (
    <>
      <path className={styles.svgRoot} d="M92 123 C75 151 63 180 66 207 C87 190 105 158 116 123 Z" />
      <path className={styles.svgRoot} d="M122 124 C120 158 126 190 137 211 C150 183 151 152 145 121 Z" />
      <path className={styles.svgRoot} d="M151 119 C166 150 184 180 202 199 C205 172 191 142 174 116 Z" />
      <path className={styles.svgCrown} d="M64 57 L105 22 L181 37 L194 104 L158 139 L83 123 Z" />
      <ellipse className={styles.svgCusp} cx="101" cy="58" rx="29" ry="24" />
      <ellipse className={styles.svgCusp} cx="158" cy="62" rx="28" ry="22" />
      <ellipse className={styles.svgCusp} cx="107" cy="108" rx="31" ry="23" />
      <ellipse className={styles.svgCusp} cx="160" cy="106" rx="22" ry="18" />
      <path className={styles.svgRidge} d="M108 105 L156 63" />
      <path className={styles.svgGroove} d="M84 78 L132 82 L177 91 M132 82 L140 120" />
    </>
  ) : (
    <>
      <path className={styles.svgRoot} d="M105 122 C93 153 91 182 99 205 C115 186 123 155 126 121 Z" />
      <path className={styles.svgRoot} d="M127 123 C128 158 134 188 145 207 C156 183 154 153 149 120 Z" />
      <path className={styles.svgRoot} d="M151 119 C162 149 176 177 190 198 C194 171 184 143 171 116 Z" />
      <path className={styles.svgCrown} d="M70 61 Q91 23 130 26 Q172 22 187 60 Q183 91 160 123 L131 139 L98 119 Q72 100 70 61 Z" />
      <ellipse className={styles.svgCusp} cx="102" cy="61" rx="28" ry="23" />
      <ellipse className={styles.svgCusp} cx="157" cy="62" rx="27" ry="22" />
      <ellipse className={styles.svgCusp} cx="112" cy="108" rx="29" ry="22" />
      <ellipse className={styles.svgCusp} cx="154" cy="103" rx="15" ry="13" />
      <path className={styles.svgRidge} d="M113 106 L155 64" />
      <path className={styles.svgGroove} d="M87 81 L132 82 L171 87 M132 82 L138 116" />
    </>
  );
}

function MandMolar({ first }: { first: boolean }) {
  return first ? (
    <>
      <path className={styles.svgRoot} d="M91 120 C74 150 66 180 72 208 C92 190 108 158 116 121 Z" />
      <path className={styles.svgRoot} d="M150 121 C159 157 173 188 191 207 C197 178 184 147 171 118 Z" />
      <path className={styles.svgCrown} d="M65 67 L92 29 L148 20 L193 55 L184 112 L139 139 L83 119 Z" />
      <ellipse className={styles.svgCusp} cx="91" cy="63" rx="25" ry="22" />
      <ellipse className={styles.svgCusp} cx="132" cy="51" rx="26" ry="22" />
      <ellipse className={styles.svgCusp} cx="169" cy="69" rx="23" ry="20" />
      <ellipse className={styles.svgCusp} cx="103" cy="108" rx="26" ry="20" />
      <ellipse className={styles.svgCusp} cx="151" cy="111" rx="25" ry="19" />
      <path className={styles.svgGroove} d="M130 75 L104 103 M130 75 L154 105 M130 75 L91 63 M130 75 L169 69" />
      <circle className={styles.svgLandmark} cx="130" cy="75" r="4" />
    </>
  ) : (
    <>
      <path className={styles.svgRoot} d="M103 120 C92 153 92 183 102 207 C119 185 127 154 129 119 Z" />
      <path className={styles.svgRoot} d="M139 120 C143 155 152 185 166 206 C178 179 171 149 161 118 Z" />
      <path className={styles.svgCrown} d="M70 55 Q82 28 111 22 L157 25 Q183 36 190 65 L184 111 Q166 137 132 140 L91 123 Q68 100 70 55 Z" />
      <ellipse className={styles.svgCusp} cx="101" cy="61" rx="28" ry="23" />
      <ellipse className={styles.svgCusp} cx="157" cy="63" rx="27" ry="22" />
      <ellipse className={styles.svgCusp} cx="102" cy="108" rx="28" ry="22" />
      <ellipse className={styles.svgCusp} cx="158" cy="108" rx="27" ry="22" />
      <path className={styles.svgGroove} d="M82 84 L178 85 M130 36 L130 130" />
      <circle className={styles.svgLandmark} cx="130" cy="85" r="4" />
    </>
  );
}

function renderMorphology(visualId: ToothComparisonVisualId): ReactNode {
  switch (visualId) {
    case "max-central-incisor":
      return <IncisorCentral maxillary />;
    case "max-lateral-incisor":
      return <IncisorLateral maxillary />;
    case "mand-central-incisor":
      return <IncisorCentral maxillary={false} />;
    case "mand-lateral-incisor":
      return <IncisorLateral maxillary={false} />;
    case "max-canine":
      return <Canine maxillary />;
    case "mand-canine":
      return <Canine maxillary={false} />;
    case "max-first-premolar":
      return <MaxPremolar first />;
    case "max-second-premolar":
      return <MaxPremolar first={false} />;
    case "mand-first-premolar":
      return <MandPremolar first />;
    case "mand-second-premolar":
      return <MandPremolar first={false} />;
    case "max-first-molar":
      return <MaxMolar first />;
    case "max-second-molar":
      return <MaxMolar first={false} />;
    case "mand-first-molar":
      return <MandMolar first />;
    case "mand-second-molar":
      return <MandMolar first={false} />;
  }
}

export function ToothComparisonVisual({
  card,
  label,
  universal,
  visualId,
  state = "idle",
}: ToothComparisonVisualProps) {
  const typedVisualId = visualId as ToothComparisonVisualId;
  const metadata = TOOTH_COMPARISON_VISUALS[typedVisualId];
  const rawId = useId();
  const gradientId = `enamel-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  if (!metadata) return null;

  return (
    <article
      className={`${styles.toothCard} ${state === "correct" ? styles.toothCardCorrect : ""} ${state === "wrong" ? styles.toothCardWrong : ""}`}
      aria-label={`Tooth ${card}: ${label}, ${universal}`}
    >
      <header className={styles.toothCardHeader}>
        <span className={styles.cardLetter}>Tooth {card}</span>
        <span className={styles.evidenceBadge}>Course verified</span>
      </header>
      <div className={styles.toothNameRow}>
        <div>
          <h2>{label}</h2>
          <p>{universal}</p>
        </div>
        <span>{metadata.viewLabel}</span>
      </div>
      <svg
        className={styles.toothSvg}
        viewBox="0 0 260 220"
        role="img"
        aria-labelledby={`${gradientId}-title ${gradientId}-desc`}
      >
        <title id={`${gradientId}-title`}>{label} morphology diagram</title>
        <desc id={`${gradientId}-desc`}>{metadata.landmark}. Original course-evidence diagram.</desc>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fffdf4" />
            <stop offset="0.58" stopColor="#f2e8c9" />
            <stop offset="1" stopColor="#cdbd91" />
          </linearGradient>
        </defs>
        <g style={{ "--tooth-enamel": `url(#${gradientId})` } as React.CSSProperties}>
          {renderMorphology(typedVisualId)}
        </g>
        <text className={styles.svgOrientation} x="14" y="18">M</text>
        <text className={styles.svgOrientation} x="238" y="18">D</text>
      </svg>
      <p className={styles.visualLandmark}>{metadata.landmark}</p>
    </article>
  );
}
