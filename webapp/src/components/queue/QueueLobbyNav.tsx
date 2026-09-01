"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const views = [
  ["Admin controls", "admin"],
  ["Guest check-in", "join"],
  ["Classroom display", "display"],
  ["Staff join", "staff"],
] as const;

export function QueueLobbyNav({ slug, displayMode = false }: { slug: string; displayMode?: boolean }) {
  const pathname = usePathname();
  if (displayMode) return <nav className="flex flex-wrap items-center gap-2" aria-label="Display controls"><Link href={`/queue/r/${slug}/admin`} className="rounded-lg border border-slate-500 bg-slate-800 px-4 py-2 text-sm font-bold text-white">Exit display</Link><Link href={`/queue/r/${slug}/join`} className="rounded-lg border border-slate-500 px-4 py-2 text-sm text-slate-200">Guest check-in</Link></nav>;
  return <nav className="border-b border-slate-200 bg-white" aria-label="Lobby views"><div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3"><Link href="/queue/dashboard" className="mr-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">← Back to dashboard</Link>{views.map(([label, view]) => { const href = `/queue/r/${slug}/${view}`; const active = pathname === href; return <Link key={view} href={href} aria-current={active ? "page" : undefined} className={`rounded-lg px-3 py-2 text-xs font-bold ${active ? "bg-emerald-100 text-emerald-800" : "text-slate-600 hover:bg-slate-100"}`}>{label}</Link>; })}</div></nav>;
}
