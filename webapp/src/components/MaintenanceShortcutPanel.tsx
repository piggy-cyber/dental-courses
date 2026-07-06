"use client";

import { useState } from "react";
import {
  CBRE_PHONE,
  CBRE_REQUEST_URL,
  HEC_ADDRESS,
  MAINTENANCE_BUILDINGS,
  MAINTENANCE_DEPARTMENTS,
  MAINTENANCE_ISSUES,
  formatMaintenanceRequestText,
} from "@/lib/maintenance";
import { notifyMaintenanceGroupMe } from "@/app/(protected)/home/actions";

type Props = {
  reporterName: string;
  groupMeBotConfigured: boolean;
};

export function MaintenanceShortcutPanel({ reporterName, groupMeBotConfigured }: Props) {
  const [building, setBuilding] = useState<string>(MAINTENANCE_BUILDINGS[0].label);
  const [department, setDepartment] = useState<string>(MAINTENANCE_DEPARTMENTS[0].label);
  const [room, setRoom] = useState("124");
  const [station, setStation] = useState("");
  const [issue, setIssue] = useState<string>(MAINTENANCE_ISSUES[0].label);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function currentRequest() {
    return {
      building,
      department,
      room,
      station,
      issue,
      notes,
      reporterName,
    };
  }

  async function copyDetails() {
    setStatus(null);
    setError(null);
    try {
      await navigator.clipboard.writeText(formatMaintenanceRequestText(currentRequest()));
      setStatus("Copied — paste into the CBRE form after you open it.");
    } catch {
      setError("Could not copy to clipboard.");
    }
  }

  async function notifyGroupMe() {
    setBusy(true);
    setStatus(null);
    setError(null);
    const result = await notifyMaintenanceGroupMe({
      building,
      department,
      room,
      station,
      issue,
      notes,
    });
    setBusy(false);
    if (result.ok) {
      setStatus("Posted to your class GroupMe.");
    } else {
      setError(result.error);
    }
  }

  return (
    <section className="cockpit-panel">
      <div className="cockpit-section-bar">Classroom maintenance</div>
      <div className="space-y-4 p-4">
        <p className="text-sm text-brand-muted">
          Report a classroom issue to CBRE at <strong className="text-brand-navy">{HEC_ADDRESS}</strong>.
          Copy the details, submit on CBRE, then notify the class on GroupMe.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-brand-muted">
            Building
            <select
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              className="app-input mt-1 w-full px-3 py-2 text-sm"
            >
              {MAINTENANCE_BUILDINGS.map((b) => (
                <option key={b.id} value={b.label}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-brand-muted">
            Department
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="app-input mt-1 w-full px-3 py-2 text-sm"
            >
              {MAINTENANCE_DEPARTMENTS.map((d) => (
                <option key={d.id} value={d.label}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-brand-muted">
            Room number
            <input
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="124"
              className="app-input mt-1 w-full px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-brand-muted">
            Sim Lab station (0–82)
            <input
              value={station}
              onChange={(e) => setStation(e.target.value)}
              placeholder="Optional"
              className="app-input mt-1 w-full px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-brand-muted sm:col-span-2">
            Issue type
            <select
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              className="app-input mt-1 w-full px-3 py-2 text-sm"
            >
              {MAINTENANCE_ISSUES.map((item) => (
                <option key={item.id} value={item.label}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-brand-muted sm:col-span-2">
            Notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="What is broken? Any urgency?"
              className="app-input mt-1 w-full px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={CBRE_REQUEST_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="cockpit-switch"
          >
            <span className="cockpit-switch-indicator cockpit-switch-indicator-amber" />
            Open CBRE
          </a>
          <button type="button" onClick={copyDetails} className="cockpit-switch">
            <span className="cockpit-switch-indicator cockpit-switch-indicator-blue" />
            Copy details
          </button>
          {groupMeBotConfigured && (
            <button
              type="button"
              onClick={notifyGroupMe}
              disabled={busy}
              className="cockpit-switch disabled:opacity-50"
            >
              <span className="cockpit-switch-indicator" />
              {busy ? "Posting..." : "Notify GroupMe"}
            </button>
          )}
        </div>

        <p className="text-xs text-brand-muted">
          CBRE 24-hour line:{" "}
          <a href={`tel:${CBRE_PHONE.replace(/-/g, "")}`} className="text-brand-blue hover:underline">
            {CBRE_PHONE}
          </a>
          {!groupMeBotConfigured && (
            <> · GroupMe bot not configured yet — create a bot and add GROUPME_BOT_ID in Vercel.</>
          )}
        </p>

        {status && (
          <p className="border border-brand-teal/30 bg-brand-soft px-3 py-2 text-sm text-brand-navy">
            {status}
          </p>
        )}
        {error && (
          <p className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
        )}
      </div>
    </section>
  );
}
