import Link from "next/link";

type BrandMarkProps = {
  className?: string;
  showWordmark?: boolean;
};

export function BrandMark({ className = "", showWordmark = true }: BrandMarkProps) {
  return (
    <Link href="/home" className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        aria-hidden="true"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-brand-navy text-xs font-extrabold tracking-tight text-white"
      >
        D1
      </span>
      {showWordmark && (
        <span className="text-lg font-bold text-brand-navy">Course Library</span>
      )}
    </Link>
  );
}

export function BrandMarkPublic({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        aria-hidden="true"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-brand-navy text-xs font-extrabold tracking-tight text-white"
      >
        D1
      </span>
      <span className="text-lg font-bold text-brand-navy">Course Library</span>
    </Link>
  );
}
