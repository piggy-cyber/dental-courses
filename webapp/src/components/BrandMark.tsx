import Link from "next/link";
import Image from "next/image";

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
    <Link href="/home" aria-label="Fourth Canal home" className={`fc-brand-link ${className}`}>
      <Image
        src={showWordmark
          ? inverse
            ? "/brand/fourth-canal-horizontal-on-dark-outlined.svg"
            : "/brand/fourth-canal-horizontal-on-light-outlined.svg"
          : inverse
            ? "/brand/fourth-canal-compact-mono-white.svg"
            : "/brand/fourth-canal-compact-color.svg"}
        alt=""
        width={showWordmark ? 220 : 36}
        height={showWordmark ? 48 : 54}
        className={showWordmark ? "fc-brand-horizontal" : "fc-brand-compact"}
        priority
      />
    </Link>
  );
}

export function BrandMarkPublic({ className = "" }: { className?: string }) {
  return (
    <Link href="/" aria-label="Fourth Canal home" className={`fc-brand-link ${className}`}>
      <Image
        src="/brand/fourth-canal-horizontal-on-light-outlined.svg"
        alt=""
        width={220}
        height={48}
        className="fc-brand-horizontal"
        priority
      />
    </Link>
  );
}
