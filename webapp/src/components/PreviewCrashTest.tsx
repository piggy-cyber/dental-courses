"use client";

import { useState } from "react";
import {
  previewStrategy,
  previewStrategyLabel,
  type PreviewStrategy,
} from "@/lib/preview-capabilities";
import type { PreviewLabResource } from "@/components/PreviewLabClient";

type CrashRow = {
  id: number;
  name: string;
  ext: string | null;
  course_code: string;
  strategy: PreviewStrategy;
  status: "pending" | "ok" | "fail";
  error?: string;
};

export function PreviewCrashTest({
  resources,
  onPick,
}: {
  resources: PreviewLabResource[];
  onPick: (id: number) => void;
}) {
  const [rows, setRows] = useState<CrashRow[] | null>(null);
  const [running, setRunning] = useState(false);

  async function runCrashTest() {
    setRunning(true);
    const initial: CrashRow[] = resources.map((r) => ({
      id: r.id,
      name: r.name,
      ext: r.ext,
      course_code: r.course_code,
      strategy: previewStrategy(r.ext),
      status: "pending",
    }));
    setRows(initial);

    for (let i = 0; i < initial.length; i++) {
      const row = initial[i];
      try {
        const res = await fetch(`/api/resource/${row.id}/url`);
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
        initial[i] = { ...row, status: "ok" };
      } catch (err) {
        initial[i] = {
          ...row,
          status: "fail",
          error: err instanceof Error ? err.message : "Failed",
        };
      }
      setRows([...initial]);
    }

    setRunning(false);
  }

  const summary = rows
    ? {
        ok: rows.filter((r) => r.status === "ok").length,
        fail: rows.filter((r) => r.status === "fail").length,
        byStrategy: rows.reduce<Record<string, number>>((acc, r) => {
          acc[r.strategy] = (acc[r.strategy] ?? 0) + 1;
          return acc;
        }, {}),
      }
    : null;

  return (
    <section className="border border-brand-line bg-brand-soft p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-brand-navy">Crash test</h2>
          <p className="mt-1 text-sm text-brand-muted">
            Hit every uploaded file&apos;s signed-URL API. Confirms auth + storage links; does not
            fully validate Office/video embeds in the browser.
          </p>
        </div>
        <button
          type="button"
          onClick={runCrashTest}
          disabled={running || resources.length === 0}
          className="portal-button-primary px-4 py-2 text-sm disabled:opacity-50"
        >
          {running ? "Running…" : `Test ${resources.length} files`}
        </button>
      </div>

      {summary && (
        <p className="mt-3 text-sm text-brand-muted">
          {summary.ok} ok · {summary.fail} failed · strategies:{" "}
          {Object.entries(summary.byStrategy)
            .map(([k, n]) => `${k} (${n})`)
            .join(", ")}
        </p>
      )}

      {rows && (
        <div className="mt-4 max-h-64 overflow-auto border border-brand-line bg-brand-panel">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-brand-soft text-brand-muted">
              <tr>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Ext</th>
                <th className="px-3 py-2">Strategy</th>
                <th className="px-3 py-2">File</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-line">
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer hover:bg-brand-soft/80"
                  onClick={() => onPick(row.id)}
                >
                  <td className="px-3 py-2">
                    {row.status === "pending" && "…"}
                    {row.status === "ok" && (
                      <span className="text-green-700">ok</span>
                    )}
                    {row.status === "fail" && (
                      <span className="text-red-700" title={row.error}>
                        fail
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">{row.ext ?? "—"}</td>
                  <td className="px-3 py-2">{previewStrategyLabel(row.strategy)}</td>
                  <td className="max-w-[12rem] truncate px-3 py-2" title={row.name}>
                    {row.course_code} · {row.name}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
