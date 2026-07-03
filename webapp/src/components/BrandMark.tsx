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
        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-xs font-extrabold tracking-tight ${
          inverse ? "bg-brand-gold text-brand-sidebar" : "bg-brand-sidebar text-white"
        }`}
      >
        D1
      </span>
      {showWordmark && (
        <span
          className={`text-lg font-bold ${
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
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-sidebar text-xs font-extrabold tracking-tight text-white"
      >
        D1
      </span>
      <span className="text-lg font-bold text-brand-navy">Course Library</span>
    </Link>
  );
}
