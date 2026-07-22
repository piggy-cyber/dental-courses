"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export const SITE_LINKS = [
  { href: "/", label: "Home" },
  { href: "/guides", label: "Study guides" },
  { href: "/games", label: "Games" },
  { href: "/grade-calculator", label: "Grade calculator" },
  { href: "/about", label: "About" },
  { href: "/support", label: "Support" },
] as const;

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SitePrimaryLinks({ className = "" }: { className?: string }) {
  const pathname = usePathname();

  return (
    <>
      {SITE_LINKS.map((link) => {
        const active = isActivePath(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`fc-site-primary-link ${active ? "fc-site-primary-link-active" : ""} ${className}`}
            onClick={(event) => {
              const details = event.currentTarget.closest<HTMLDetailsElement>("details");
              if (details) details.open = false;
            }}
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}

export function SitePrimaryNavigation({
  className = "",
  ariaLabel = "Main navigation",
}: {
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <nav className={className} aria-label={ariaLabel}>
      <SitePrimaryLinks />
    </nav>
  );
}

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
