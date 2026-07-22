import type { LivingAtlasCompanionMood } from "@/lib/living-atlas/types";

type WhiteHollandLopProps = {
  mood: LivingAtlasCompanionMood;
  className?: string;
  crowned?: boolean;
  decorative?: boolean;
};

/**
 * A deliberately self-contained temporary portrait. The component is a visual
 * stand-in for the eventual hand-painted companion pack, not a gameplay asset.
 */
export function WhiteHollandLop({ mood, className, crowned = false, decorative = true }: WhiteHollandLopProps) {
  const eyes = mood === "celebrating" ? "^ ^" : mood === "concerned" ? "• •" : "•ᴗ•";
  const label = mood === "celebrating" ? "White Holland Lop celebrating" : mood === "concerned" ? "White Holland Lop looking concerned" : "White Holland Lop companion";

  return (
    <svg
      className={className}
      viewBox="0 0 220 220"
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : label}
      focusable="false"
    >
      <defs>
        <linearGradient id="lop-shadow" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e8eef0" />
        </linearGradient>
        <linearGradient id="lop-collar" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#70d1c7" />
          <stop offset="1" stopColor="#278b83" />
        </linearGradient>
      </defs>
      <ellipse cx="110" cy="195" rx="68" ry="12" fill="#17375f" opacity=".12" />
      {crowned ? <path d="M76 44 88 22l22 19 22-19 12 22-12 19H88z" fill="#f4c85f" stroke="#ad7923" strokeLinejoin="round" strokeWidth="5" /> : null}
      <g stroke="#17375f" strokeLinecap="round" strokeLinejoin="round" strokeWidth="6">
        <path d="M68 89C38 73 29 41 45 26c20-17 48 5 49 43" fill="url(#lop-shadow)" />
        <path d="M152 89c30-16 39-48 23-63-20-17-48 5-49 43" fill="url(#lop-shadow)" />
        <path d="M55 33c12-5 24 12 28 36" fill="none" opacity=".35" />
        <path d="M165 33c-12-5-24 12-28 36" fill="none" opacity=".35" />
        <path d="M57 126c0-47 28-76 53-76s53 29 53 76c0 43-23 69-53 69s-53-26-53-69Z" fill="url(#lop-shadow)" />
        <path d="M74 148c-17 7-27 21-27 35 25 7 49 0 63-13" fill="#f8fbfc" />
        <path d="M146 148c17 7 27 21 27 35-25 7-49 0-63-13" fill="#f8fbfc" />
        <path d="M69 151c24 12 58 12 82 0l-8 20c-19 10-47 10-66 0Z" fill="url(#lop-collar)" />
      </g>
      <circle cx="110" cy="165" r="7" fill="#f4c85f" stroke="#ad7923" strokeWidth="3" />
      <g fill="#17375f" fontFamily="Arial, sans-serif" fontSize="23" fontWeight="700" textAnchor="middle">
        <text x="110" y="113">{eyes}</text>
      </g>
      <path d={mood === "concerned" ? "M99 132q11-9 22 0" : "M99 128q11 12 22 0"} fill="none" stroke="#17375f" strokeLinecap="round" strokeWidth="4" />
      <path d="M81 122c-11 1-19 4-27 9M139 122c11 1 19 4 27 9" fill="none" stroke="#17375f" strokeWidth="3" />
      <circle cx="87" cy="121" r="4" fill="#f6c4ca" opacity=".8" />
      <circle cx="133" cy="121" r="4" fill="#f6c4ca" opacity=".8" />
      <title>{label}</title>
    </svg>
  );
}
