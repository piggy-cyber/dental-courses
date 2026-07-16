import type { RootCanalMatchRecord } from "@/lib/games/root-canal-match-types";
import styles from "./RootCanalMatch.module.css";

type RootCanalToothProps = {
  record: RootCanalMatchRecord;
};

export function RootCanalTooth({ record }: RootCanalToothProps) {
  const source = record.sourceRefs[0];
  const titleId = `${record.id}-tooth-title`;
  const descriptionId = `${record.id}-tooth-description`;
  const isPremolar = record.toothName.includes("premolar");
  const isMaxillaryMolar = record.toothName === "Maxillary first molar";
  const isSecondMolar = record.toothName === "Mandibular second molar";

  return (
    <svg
      className={styles.toothSvg}
      viewBox="0 0 260 340"
      role="img"
      aria-labelledby={`${titleId} ${descriptionId}`}
      data-highlight={record.difficulty}
      data-source-name={source?.sourceName}
      data-source-locator={source?.locator}
    >
      <title id={titleId}>{`${record.toothName} root and canal study silhouette`}</title>
      <desc id={descriptionId}>
        Original morphology study diagram showing the course-described common relationship between
        root count and canal count. Variation remains possible.
      </desc>
      <defs>
        <linearGradient id={`${record.id}-enamel`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fffef6" />
          <stop offset="0.58" stopColor="#f0ead5" />
          <stop offset="1" stopColor="#c8dfda" />
        </linearGradient>
        <linearGradient id={`${record.id}-root`} x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#ede7d2" />
          <stop offset="1" stopColor="#bfd7d1" />
        </linearGradient>
      </defs>

      <g className={styles.diagramGuide} aria-hidden="true">
        <path d="M28 154 H232" />
        <path d="M130 26 V320" />
      </g>

      {isPremolar ? (
        <g>
          <path
            className={styles.rootShape}
            fill={`url(#${record.id}-root)`}
            d="M107 142 C105 169 95 201 84 237 C76 263 76 295 92 317 C105 289 116 252 123 210 C127 184 126 159 123 142 Z"
          />
          <path
            className={styles.rootShape}
            fill={`url(#${record.id}-root)`}
            d="M137 142 C136 172 143 206 153 244 C161 273 166 301 164 319 C184 292 183 263 175 231 C166 193 157 163 153 141 Z"
          />
          <path
            className={styles.crownShape}
            fill={`url(#${record.id}-enamel)`}
            d="M78 75 C88 52 105 40 125 50 C139 35 163 45 178 69 C191 90 184 122 166 151 C148 165 109 165 91 151 C76 124 68 98 78 75 Z"
          />
          <path className={styles.pulpChamber} d="M104 91 C115 78 144 78 156 94 L151 137 C142 145 117 145 108 137 Z" />
          <path className={styles.canalLine} d="M119 132 C116 173 104 226 94 297" />
          <path className={styles.canalLine} d="M143 132 C148 175 160 232 166 299" />
          <path className={styles.morphologyLine} d="M83 86 C105 102 151 104 177 82" />
          <circle className={styles.canalOrifice} cx="118" cy="132" r="4" />
          <circle className={styles.canalOrifice} cx="143" cy="132" r="4" />
        </g>
      ) : isMaxillaryMolar ? (
        <g>
          <path
            className={styles.rootShape}
            fill={`url(#${record.id}-root)`}
            d="M75 143 C74 179 60 216 45 260 C37 286 42 308 54 321 C71 287 89 248 103 206 C111 181 112 158 106 142 Z"
          />
          <path
            className={styles.rootShape}
            fill={`url(#${record.id}-root)`}
            d="M112 143 C110 180 112 235 123 303 C127 324 136 329 142 306 C151 240 150 186 146 143 Z"
          />
          <path
            className={styles.rootShape}
            fill={`url(#${record.id}-root)`}
            d="M154 143 C156 177 171 213 190 252 C202 276 207 302 200 319 C178 289 160 249 149 207 C143 181 143 157 148 142 Z"
          />
          <path
            className={styles.crownShape}
            fill={`url(#${record.id}-enamel)`}
            d="M52 68 C64 39 89 33 113 49 C126 30 151 31 165 50 C188 40 211 58 216 85 C222 115 207 142 185 157 C153 169 103 169 70 155 C51 135 42 98 52 68 Z"
          />
          <path className={styles.pulpChamber} d="M83 89 C104 74 163 74 187 94 L174 138 C153 148 108 148 88 137 Z" />
          <path className={styles.canalLine} d="M99 131 C91 177 74 230 54 300" />
          <path className={`${styles.canalLine} ${styles.secondaryCanal}`} d="M112 132 C105 178 90 231 68 294" />
          <path className={styles.canalLine} d="M137 133 C136 182 135 242 136 307" />
          <path className={styles.canalLine} d="M169 132 C175 174 187 226 199 300" />
          <path className={styles.morphologyLine} d="M63 88 C92 105 176 107 210 82" />
          <path className={styles.morphologyLine} d="M102 52 L172 142" />
          <circle className={styles.canalOrifice} cx="99" cy="131" r="4" />
          <circle className={`${styles.canalOrifice} ${styles.secondaryCanal}`} cx="112" cy="132" r="4" />
          <circle className={styles.canalOrifice} cx="137" cy="133" r="4" />
          <circle className={styles.canalOrifice} cx="169" cy="132" r="4" />
        </g>
      ) : (
        <g>
          <path
            className={styles.rootShape}
            fill={`url(#${record.id}-root)`}
            d={
              isSecondMolar
                ? "M82 145 C84 185 78 231 75 280 C73 303 80 319 91 325 C103 291 111 238 118 188 C121 165 118 151 112 143 Z"
                : "M79 145 C78 181 65 222 55 267 C49 292 55 315 68 326 C87 291 103 244 116 194 C122 169 118 151 111 143 Z"
            }
          />
          <path
            className={styles.rootShape}
            fill={`url(#${record.id}-root)`}
            d={
              isSecondMolar
                ? "M145 143 C143 173 150 220 161 276 C166 302 176 318 188 322 C190 292 181 244 171 195 C166 169 162 151 156 142 Z"
                : "M147 143 C148 174 161 216 181 263 C192 289 194 312 184 326 C163 294 148 249 138 199 C133 172 137 152 143 142 Z"
            }
          />
          <path
            className={styles.crownShape}
            fill={`url(#${record.id}-enamel)`}
            d={
              isSecondMolar
                ? "M52 70 C68 42 94 40 118 53 C138 36 167 40 184 57 C207 52 222 76 218 105 C215 132 200 151 182 160 C151 171 100 170 68 158 C48 139 38 96 52 70 Z"
                : "M43 78 C54 48 80 39 105 51 C122 32 151 36 166 54 C190 43 217 61 221 91 C225 119 210 143 191 157 C156 171 96 171 61 157 C43 137 33 104 43 78 Z"
            }
          />
          <path className={styles.pulpChamber} d="M76 91 C101 76 165 76 190 94 L178 139 C155 150 104 150 82 138 Z" />
          <path className={styles.canalLine} d={isSecondMolar ? "M105 133 C101 178 95 238 88 306" : "M99 133 C92 178 80 235 67 305"} />
          <path className={styles.canalLine} d={isSecondMolar ? "M120 134 C116 181 109 240 101 305" : "M115 134 C108 183 95 241 82 303"} />
          <path className={styles.canalLine} d={isSecondMolar ? "M157 133 C161 181 171 241 185 305" : "M158 133 C164 180 177 238 186 305"} />
          <path className={styles.morphologyLine} d="M53 92 C87 106 181 107 214 88" />
          <path className={styles.morphologyLine} d={isSecondMolar ? "M129 53 V151 M72 106 H194" : "M104 52 L158 151 M68 96 L190 132"} />
          <circle className={styles.canalOrifice} cx="104" cy="133" r="4" />
          <circle className={styles.canalOrifice} cx="119" cy="134" r="4" />
          <circle className={styles.canalOrifice} cx="158" cy="133" r="4" />
        </g>
      )}

      <g className={styles.diagramLabels} aria-hidden="true">
        <text x="18" y="147">CEJ</text>
        <text x="180" y="32">ROOT / CANAL</text>
      </g>
    </svg>
  );
}
