"use client";

import { Download, Expand, Link as LinkIcon, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useRef, useState } from "react";

export function QueueQrCard({ title, description, url, testId }: { title: string; description: string; url: string; testId: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [fullScreen, setFullScreen] = useState(false);

  async function copy() {
    try { await navigator.clipboard.writeText(url); setFeedback("Link copied"); }
    catch { setFeedback("Copy failed — select the link below"); }
  }

  function download() {
    const svg = wrapperRef.current?.querySelector("svg");
    if (!svg) { setFeedback("Download failed"); return; }
    const source = new XMLSerializer().serializeToString(svg);
    const image = new Image();
    const objectUrl = URL.createObjectURL(new Blob([source], { type: "image/svg+xml" }));
    image.onload = () => {
      const canvas = document.createElement("canvas"); canvas.width = 1024; canvas.height = 1024;
      const context = canvas.getContext("2d");
      if (!context) { URL.revokeObjectURL(objectUrl); setFeedback("Download failed"); return; }
      context.fillStyle = "#ffffff"; context.fillRect(0, 0, 1024, 1024); context.drawImage(image, 64, 64, 896, 896);
      canvas.toBlob((blob) => { URL.revokeObjectURL(objectUrl); if (!blob) { setFeedback("Download failed"); return; } const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${testId}.png`; link.click(); URL.revokeObjectURL(link.href); setFeedback("PNG downloaded"); }, "image/png");
    };
    image.onerror = () => { URL.revokeObjectURL(objectUrl); setFeedback("Download failed"); };
    image.src = objectUrl;
  }

  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" data-testid={testId} data-qr-destination={url}><div className="grid gap-5 sm:grid-cols-[180px_1fr] sm:items-center"><div ref={wrapperRef} className="rounded-xl border border-slate-200 bg-white p-3"><QRCodeSVG value={url} size={154} level="M" marginSize={1} title={`${title} QR code`} /></div><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">{title}</p><p className="mt-2 text-sm text-slate-500">{description}</p><code className="mt-3 block break-all text-xs text-slate-500">{url}</code><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => void copy()} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white"><LinkIcon size={14} /> Copy link</button><button onClick={download} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold"><Download size={14} /> Download PNG</button><button onClick={() => setFullScreen(true)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold"><Expand size={14} /> Full screen</button></div>{feedback ? <p className="mt-3 text-xs font-semibold text-emerald-700" role="status">{feedback}</p> : null}</div></div>{fullScreen ? <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/90 p-6" role="dialog" aria-modal="true" aria-label={`${title} full screen`}><button onClick={() => setFullScreen(false)} className="absolute right-6 top-6 rounded-full bg-white p-3 text-slate-900" aria-label="Close full screen QR"><X /></button><div className="max-w-[80vmin] rounded-3xl bg-white p-8 text-center"><QRCodeSVG value={url} size={560} level="M" marginSize={2} className="h-auto max-h-[65vh] w-full" /><p className="mt-5 text-xl font-bold text-slate-900">{title}</p><p className="mt-2 break-all text-sm text-slate-500">{url}</p></div></div> : null}</article>;
}
