"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function ActiveNavLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const targetPath = href.split("?")[0];
  const active = pathname === targetPath || (
    targetPath !== "/home" && targetPath !== "/admin" && pathname.startsWith(`${targetPath}/`)
  );

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onClick={(event) => {
        const details = event.currentTarget.closest<HTMLDetailsElement>("details");
        if (details) details.open = false;
      }}
      className={`fc-nav-link ${active ? "fc-nav-link-active" : ""} ${className}`}
    >
      {children}
      <span aria-hidden="true">→</span>
    </Link>
  );
}

export function LivingCanalIndicator({ label = "Page progress" }: { label?: string }) {
  return (
    <div className="fc-living-canals" aria-label={label}>
      <span><i /></span>
      <span><i /></span>
      <span><i /></span>
      <span><i /></span>
      <small>{label}</small>
    </div>
  );
}
