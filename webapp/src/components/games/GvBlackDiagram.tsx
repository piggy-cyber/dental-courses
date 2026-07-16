import type { GvBlackDiagramSpec } from "@/lib/games/gv-black-types";
import styles from "./GvBlackSorter.module.css";

type GvBlackDiagramProps = {
  diagram: GvBlackDiagramSpec;
  compact?: boolean;
};

function markerX(side: GvBlackDiagramSpec["markerSide"], left = 128, right = 232) {
  if (side === "left") return left;
  if (side === "right") return right;
  return 180;
}

function renderOcclusal(diagram: GvBlackDiagramSpec) {
  const isMolar = diagram.tooth === "molar";
  const cuspX = markerX(diagram.markerSide, 112, 248);

  return (
    <>
      <path
        className={styles.toothShape}
        d={
          isMolar
            ? "M91 55 C70 71 60 101 66 133 C58 165 73 202 103 213 C132 229 166 215 181 218 C200 219 230 229 258 210 C286 191 294 158 285 132 C292 100 279 69 253 55 C230 40 205 48 181 42 C155 48 120 38 91 55 Z"
            : "M117 61 C91 82 83 119 94 153 C100 190 128 214 164 210 C193 219 229 207 250 177 C272 145 267 104 245 76 C225 49 195 45 178 51 C156 43 135 48 117 61 Z"
        }
      />
      <path
        className={styles.toothHighlight}
        d={
          isMolar
            ? "M105 77 C128 62 151 70 179 60 C205 71 232 61 254 80 M92 123 C123 111 149 127 180 112 C211 126 241 111 268 126 M106 188 C133 197 154 182 181 197 C210 182 233 195 253 184"
            : "M125 81 C147 65 161 77 179 65 C198 79 219 65 240 87 M112 139 C140 124 158 143 180 126 C204 144 225 127 251 143 M129 184 C152 195 164 180 181 194 C202 181 220 194 239 180"
        }
      />
      <path
        className={styles.grooveLine}
        d={
          isMolar
            ? "M102 122 C133 127 147 115 180 124 C208 114 231 128 260 123 M180 68 C168 88 190 101 180 124 C171 146 190 165 181 194"
            : "M116 139 C145 129 159 141 180 130 C205 144 222 132 247 142 M180 73 C169 98 190 108 180 130 C171 151 190 169 181 192"
        }
      />
      {diagram.lesion === "occlusal-pit-fissure" ? (
        <>
          <circle className={styles.lesionHalo} cx="180" cy="124" r="20" />
          <path className={styles.lesionLine} d="M148 124 C162 116 170 130 181 122 C194 113 205 129 218 122" />
          <circle className={styles.lesionCore} cx="180" cy="124" r="6" />
        </>
      ) : null}
      {diagram.lesion === "posterior-cusp-tip" ? (
        <>
          <circle className={styles.lesionHalo} cx={cuspX} cy="62" r="21" />
          <circle className={styles.lesionCore} cx={cuspX} cy="62" r="10" />
        </>
      ) : null}
      <text className={styles.surfaceLabel} x="180" y="246" textAnchor="middle">
        OCCLUSAL
      </text>
    </>
  );
}

function renderPosteriorFace(diagram: GvBlackDiagramSpec) {
  const isMolar = diagram.tooth === "molar";
  const cuspX = markerX(diagram.markerSide, isMolar ? 122 : 145, isMolar ? 238 : 216);

  return (
    <>
      <path
        className={styles.rootShape}
        d={
          isMolar
            ? "M118 153 C118 181 105 217 118 239 C134 226 147 200 160 166 C172 198 170 226 181 242 C194 222 201 194 202 164 C220 195 228 221 247 237 C257 210 241 181 241 151 Z"
            : "M151 150 C153 186 150 220 179 242 C209 218 207 184 211 150 Z"
        }
      />
      <path
        className={styles.toothShape}
        d={
          isMolar
            ? "M100 69 L121 49 L151 66 L181 43 L213 66 L241 50 L263 71 L253 147 C233 163 211 159 181 158 C151 160 128 164 107 147 Z"
            : "M127 74 L148 48 L179 69 L211 47 L235 75 L225 149 C208 162 195 159 180 158 C162 159 145 162 134 148 Z"
        }
      />
      <path className={styles.toothHighlight} d="M119 92 C147 79 163 91 181 82 C204 91 224 78 246 94 M116 132 C143 142 160 132 181 139 C204 132 225 143 249 130" />
      <path className={styles.grooveLine} d="M181 59 C175 81 188 98 181 121" />
      {diagram.lesion === "buccal-pit" || diagram.lesion === "lingual-pit" ? (
        <>
          <circle className={styles.lesionHalo} cx="181" cy="119" r="19" />
          <circle className={styles.lesionCore} cx="181" cy="119" r="8" />
        </>
      ) : null}
      {diagram.lesion === "cervical-third" ? (
        <>
          <ellipse className={styles.lesionHalo} cx="181" cy="146" rx="46" ry="18" />
          <path className={styles.lesionBand} d="M139 146 Q181 132 223 146 Q181 160 139 146 Z" />
        </>
      ) : null}
      {diagram.lesion === "posterior-cusp-tip" ? (
        <>
          <circle className={styles.lesionHalo} cx={cuspX} cy="57" r="20" />
          <circle className={styles.lesionCore} cx={cuspX} cy="57" r="9" />
        </>
      ) : null}
      <text className={styles.surfaceLabel} x="180" y="258" textAnchor="middle">
        {diagram.view === "lingual" ? "LINGUAL" : "FACIAL"}
      </text>
    </>
  );
}

function renderPosteriorProximal(diagram: GvBlackDiagramSpec) {
  const lesionX = diagram.markerSide === "left" ? 174 : 186;

  return (
    <>
      <path className={styles.rootShape} d="M72 151 C75 191 79 222 104 242 C127 218 132 187 135 151 Z M224 151 C227 191 233 222 256 242 C280 218 286 187 288 151 Z" />
      <path className={styles.toothShape} d="M51 77 L76 49 L106 67 L137 49 L163 78 L153 147 C132 164 78 164 60 147 Z M197 77 L224 49 L254 67 L285 49 L310 78 L301 147 C280 164 226 164 207 147 Z" />
      <path className={styles.toothHighlight} d="M65 97 C91 82 118 84 149 99 M211 99 C241 83 268 83 298 98 M66 133 C93 143 122 142 149 132 M211 132 C240 143 270 143 297 132" />
      <path className={styles.contactGuide} d="M180 62 L180 185" />
      <circle className={styles.lesionHalo} cx={lesionX} cy="105" r="22" />
      <ellipse className={styles.lesionCore} cx={lesionX} cy="105" rx="9" ry="17" />
      <text className={styles.surfaceLabel} x="180" y="216" textAnchor="middle">
        PROXIMAL
      </text>
    </>
  );
}

function renderAnterior(diagram: GvBlackDiagramSpec) {
  const left = diagram.markerSide === "left";
  const sideX = left ? 119 : 241;
  const sidePath = left ? "M121 82 C113 99 113 119 120 135" : "M239 82 C247 99 247 119 240 135";
  const incisalPath = left ? "M121 82 L121 52 L160 48" : "M239 82 L239 52 L200 48";

  return (
    <>
      <path className={styles.rootShape} d="M151 154 C152 190 158 226 180 245 C203 226 208 190 210 154 Z" />
      <path className={styles.toothShape} d="M116 53 Q180 35 244 53 L231 151 Q180 166 129 151 Z" />
      <path className={styles.toothHighlight} d="M136 75 Q180 62 225 75 M133 125 Q180 139 228 125" />
      <path className={styles.edgeGuide} d="M121 52 Q180 39 239 52" />
      {diagram.lesion === "anterior-proximal-no-incisal" ? (
        <>
          <circle className={styles.lesionHalo} cx={sideX} cy="108" r="24" />
          <path className={styles.lesionLine} d={sidePath} />
        </>
      ) : null}
      {diagram.lesion === "anterior-proximal-incisal" ? (
        <>
          <circle className={styles.lesionHalo} cx={sideX} cy="65" r="27" />
          <path className={styles.lesionLine} d={incisalPath} />
        </>
      ) : null}
      {diagram.lesion === "cervical-third" ? (
        <>
          <ellipse className={styles.lesionHalo} cx="180" cy="148" rx="45" ry="18" />
          <path className={styles.lesionBand} d="M139 148 Q180 135 221 148 Q180 160 139 148 Z" />
        </>
      ) : null}
      {diagram.lesion === "anterior-incisal-only" ? (
        <>
          <ellipse className={styles.lesionHalo} cx="180" cy="49" rx="34" ry="17" />
          <path className={styles.lesionLine} d="M153 49 Q180 43 207 49" />
        </>
      ) : null}
      <text className={styles.surfaceLabel} x="180" y="24" textAnchor="middle">
        INCISAL EDGE
      </text>
      <text className={styles.surfaceLabel} x="180" y="260" textAnchor="middle">
        {diagram.view === "lingual" ? "LINGUAL" : "FACIAL"}
      </text>
    </>
  );
}

export function GvBlackDiagram({ diagram, compact = false }: GvBlackDiagramProps) {
  return (
    <figure className={`${styles.diagramFrame} ${compact ? styles.compactDiagram : ""}`}>
      <svg
        className={styles.diagram}
        viewBox="0 0 360 270"
        role="img"
        aria-label={`Original lesion-location diagram: ${diagram.label}`}
      >
        <title>{diagram.label}</title>
        <path className={styles.diagramGrid} d="M24 36 H336 M24 90 H336 M24 144 H336 M24 198 H336 M24 252 H336 M72 20 V258 M126 20 V258 M180 20 V258 M234 20 V258 M288 20 V258" />
        {diagram.view === "occlusal"
          ? renderOcclusal(diagram)
          : diagram.lesion === "posterior-proximal"
            ? renderPosteriorProximal(diagram)
            : diagram.tooth === "incisor"
              ? renderAnterior(diagram)
              : renderPosteriorFace(diagram)}
      </svg>
      <figcaption>
        <span>{diagram.label}</span>
        <strong><i aria-hidden="true" /> Marked lesion</strong>
      </figcaption>
    </figure>
  );
}
