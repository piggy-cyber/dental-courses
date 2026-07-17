"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export type SiteMotionMode = "full" | "less" | "off";
type TransitionPhase = "idle" | "closing" | "covered" | "opening";

type PendingNavigation = {
  href: string;
  sourceUrl: string;
};

const MOTION_KEY = "fourth-canal-motion";
const MOTION_EVENT = "fourth-canal:motion-change";

function isGamePath(pathname: string) {
  return pathname === "/games" || pathname.startsWith("/games/");
}

function resolvedMotion(): SiteMotionMode {
  const saved = window.localStorage.getItem(MOTION_KEY);
  if (saved === "full" || saved === "less" || saved === "off") return saved;
  if (saved === "cinematic") {
    window.localStorage.setItem(MOTION_KEY, "full");
    return "full";
  }
  if (saved === "reduced") {
    window.localStorage.setItem(MOTION_KEY, "less");
    return "less";
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "less" : "full";
}

export function SiteRouteEffects() {
  const pathname = usePathname();
  const router = useRouter();
  const [motion, setMotion] = useState<SiteMotionMode>("full");
  const [phase, setPhase] = useState<TransitionPhase>("idle");
  const [destination, setDestination] = useState("Opening page");
  const timers = useRef<number[]>([]);
  const phaseRef = useRef(phase);
  const pathnameRef = useRef(pathname);
  const pendingNavigation = useRef<PendingNavigation | null>(null);

  const changePhase = useCallback((next: TransitionPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const clearTimers = useCallback(() => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  }, []);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const syncMotion = (event?: Event) => {
      const customMode = (event as CustomEvent<SiteMotionMode> | undefined)?.detail;
      const next = customMode === "full" || customMode === "less" || customMode === "off"
        ? customMode
        : resolvedMotion();
      if (next === "off") {
        clearTimers();
        pendingNavigation.current = null;
        changePhase("idle");
      }
      setMotion(next);
      document.documentElement.dataset.fcMotion = next;
    };

    syncMotion();
    window.addEventListener(MOTION_EVENT, syncMotion);
    window.addEventListener("storage", syncMotion);
    return () => {
      window.removeEventListener(MOTION_EVENT, syncMotion);
      window.removeEventListener("storage", syncMotion);
    };
  }, [changePhase, clearTimers]);

  useEffect(() => {
    let frame = 0;
    let resizeObserver: ResizeObserver | null = null;
    const update = () => {
      const travel = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const progress = Math.min(Math.max(window.scrollY / travel, 0), 1);
      document.documentElement.style.setProperty("--fc-scroll-progress", progress.toFixed(4));
      document.documentElement.style.setProperty(
        "--fc-parallax-y",
        motion === "full" ? `${Math.round(progress * -28)}px` : "0px",
      );
    };
    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(document.body);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      resizeObserver?.disconnect();
    };
  }, [motion, pathname]);

  useEffect(() => {
    if (isGamePath(pathname)) return;
    let observer: IntersectionObserver | null = null;
    const frame = window.requestAnimationFrame(() => {
      const items = Array.from(
        document.querySelectorAll<HTMLElement>(
          ".fc-site [data-fc-reveal], .fc-site main > header, .fc-site main > section, .fc-site .app-card, .fc-site .cockpit-panel",
        ),
      );
      items.forEach((item, index) => {
        item.dataset.fcReveal = "true";
        item.style.setProperty("--fc-reveal-index", String(index % 8));
      });

      if (motion === "off") {
        items.forEach((item) => { item.dataset.fcRevealed = "true"; });
        return;
      }

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            (entry.target as HTMLElement).dataset.fcRevealed = "true";
            observer?.unobserve(entry.target);
          });
        },
        { threshold: 0.08, rootMargin: "0px 0px -4%" },
      );
      items.forEach((item) => observer?.observe(item));
    });
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [motion, pathname]);

  useEffect(() => {
    if (motion !== "full" || isGamePath(pathname)) return;
    const move = (event: PointerEvent) => {
      document.documentElement.style.setProperty("--fc-pointer-x", `${event.clientX}px`);
      document.documentElement.style.setProperty("--fc-pointer-y", `${event.clientY}px`);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [motion, pathname]);

  useEffect(() => {
    const click = (event: MouseEvent) => {
      if (motion === "off" || phaseRef.current !== "idle" || isGamePath(pathnameRef.current)) return;
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!target || target.target === "_blank" || target.hasAttribute("download") || target.dataset.fcTransition === "off") return;

      const next = new URL(target.href, window.location.href);
      if (
        next.origin !== window.location.origin ||
        isGamePath(next.pathname) ||
        next.pathname.startsWith("/api/") ||
        next.pathname.startsWith("/auth/")
      ) return;
      const current = new URL(window.location.href);
      if (next.pathname === current.pathname && next.search === current.search) return;

      event.preventDefault();
      clearTimers();
      pendingNavigation.current = {
        href: `${next.pathname}${next.search}${next.hash}`,
        sourceUrl: `${current.pathname}${current.search}${current.hash}`,
      };
      setDestination(target.textContent?.trim().replace(/\s+/g, " ") || "Opening page");
      changePhase("closing");

      const closeDuration = motion === "less" ? 170 : 720;
      const openDuration = motion === "less" ? 200 : 800;
      timers.current.push(window.setTimeout(() => {
        changePhase("covered");
        router.push(pendingNavigation.current?.href ?? `${next.pathname}${next.search}${next.hash}`);

        const revealWhenReady = () => {
          const pending = pendingNavigation.current;
          if (!pending) return;
          const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

          if (currentUrl !== pending.sourceUrl) {
            clearTimers();
            pendingNavigation.current = null;
            window.requestAnimationFrame(() => {
              changePhase("opening");
              timers.current.push(window.setTimeout(() => changePhase("idle"), openDuration));
            });
            return;
          }

          timers.current.push(window.setTimeout(revealWhenReady, 40));
        };

        revealWhenReady();
        timers.current.push(window.setTimeout(() => {
          const pending = pendingNavigation.current;
          if (pending) window.location.assign(pending.href);
        }, 10000));
      }, closeDuration));
    };

    document.addEventListener("click", click, true);
    return () => {
      document.removeEventListener("click", click, true);
      clearTimers();
    };
  }, [changePhase, clearTimers, motion, router]);

  if (isGamePath(pathname) || phase === "idle" || motion === "off") return null;

  return (
    <div className={`fc-route-curtain fc-route-curtain-${phase}`} data-motion={motion} aria-hidden="true">
      <div className="fc-route-curtain-panels">
        {Array.from({ length: 10 }, (_, index) => (
          <span key={index} style={{ "--fc-blind-index": index } as React.CSSProperties} />
        ))}
      </div>
      <div className="fc-route-curtain-mark">
        <Image src="/brand/fourth-canal-horizontal-on-dark-outlined.svg" alt="" width={330} height={72} />
        <small>{destination}</small>
      </div>
    </div>
  );
}
