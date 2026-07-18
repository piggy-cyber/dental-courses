"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { useSyncExternalStore } from "react";

const PRIVATE_PATH_PREFIXES = [
  "/admin",
  "/api",
  "/auth",
  "/contacts",
  "/course",
  "/d1",
  "/home",
  "/library",
  "/owner",
  "/preview-lab",
  "/profile",
  "/resource",
  "/workspace-settings",
] as const;

function shouldExclude(pathname: string) {
  return PRIVATE_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function beforeSend<T extends { url: string }>(event: T): T | null {
  try {
    if (window.localStorage.getItem("fourth-canal-analytics-opt-out") === "true") return null;
    const url = new URL(event.url);
    if (shouldExclude(url.pathname)) return null;
    url.search = "";
    return { ...event, url: url.toString() };
  } catch {
    return null;
  }
}

function subscribeToHost() {
  return () => undefined;
}

function isVercelHost() {
  if (typeof window === "undefined") return false;
  const { hostname } = window.location;
  return (
    hostname === "fourthcanal.com" ||
    hostname === "www.fourthcanal.com" ||
    hostname.endsWith(".vercel.app")
  );
}

export function PublicTelemetry() {
  const shouldTrack = useSyncExternalStore(subscribeToHost, isVercelHost, () => false);

  if (!shouldTrack) return null;

  return (
    <>
      <Analytics beforeSend={beforeSend} />
      <SpeedInsights beforeSend={beforeSend} />
    </>
  );
}
