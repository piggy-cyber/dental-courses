import Link from "next/link";

type BrandMarkProps = {
  className?: string;
  showWordmark?: boolean;
  inverse?: boolean;
};

export function BrandMark({
  className = "",
  showWordmark = true,
  inverse = false,
}: BrandMarkProps) {
  return (
    <Link href="/home" className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        aria-hidden="true"
        className={`inline-flex h-8 w-8 items-center justify-center border border-brand-line text-xs font-extrabold tracking-tight ${
          inverse ? "bg-brand-gold text-brand-sidebar" : "brand-tile"
        }`}
      >
        D1
      </span>
      {showWordmark && (
        <span
          className={`text-base font-bold ${
            inverse ? "text-white" : "text-brand-navy"
          }`}
        >
          Course Library
        </span>
      )}
    </Link>
  );
}

export function BrandMarkPublic({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        aria-hidden="true"
        className="brand-tile inline-flex h-8 w-8 items-center justify-center border border-brand-line text-xs font-extrabold tracking-tight"
      >
        D1
      </span>
      <span className="text-base font-bold text-brand-navy">Course Library</span>
    </Link>
  );
}
