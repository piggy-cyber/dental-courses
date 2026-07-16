"use client";

import { useState, useTransition } from "react";
import { setCouncilAccess } from "@/app/admin/actions";
import {
  ADMIN_PERMISSION_DEFINITIONS,
  COUNCIL_PRESETS,
  type AdminPermission,
  type CouncilPresetId,
} from "@/lib/admin-permissions";
import type { TeamMember } from "./page";

function samePermissions(left: string[], right: readonly string[]) {
  return left.length === right.length && right.every((permission) => left.includes(permission));
}

function initialPreset(member: TeamMember): CouncilPresetId {
  if (member.role === "owner") {
    return member.council_title?.toLowerCase() === "vice president"
      ? "vice-president"
      : "president";
  }

  if (!member.council_title && member.admin_permissions.length === 0) return "none";

  const namedPreset = COUNCIL_PRESETS.find(
    (preset) =>
      !preset.fullAccess &&
      preset.id !== "custom" &&
      preset.id !== "none" &&
      preset.title === member.council_title &&
      samePermissions(member.admin_permissions, preset.permissions)
  );
  return namedPreset?.id ?? "custom";
}

export function TeamRow({
  member,
  isSelf,
}: {
  member: TeamMember;
  isSelf: boolean;
}) {
  const startingPreset = initialPreset(member);
  const [presetId, setPresetId] = useState<CouncilPresetId>(startingPreset);
  const [title, setTitle] = useState(member.council_title ?? (member.role === "owner" ? "President" : ""));
  const [permissions, setPermissions] = useState<AdminPermission[]>(
    member.role === "owner" ? COUNCIL_PRESETS[0].permissions : member.admin_permissions
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedPreset =
    COUNCIL_PRESETS.find((preset) => preset.id === presetId) ?? COUNCIL_PRESETS[0];
  const fullAccess = selectedPreset.fullAccess;
  const isLockedForRoster = !member.roster_match && member.role !== "owner";

  function choosePreset(nextId: CouncilPresetId) {
    const preset = COUNCIL_PRESETS.find((item) => item.id === nextId);
    if (!preset) return;
    setPresetId(nextId);
    setTitle(preset.title);
    setPermissions([...preset.permissions]);
    setMessage(null);
    setError(null);
  }

  function togglePermission(permission: AdminPermission) {
    setPresetId("custom");
    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission]
    );
  }

  function save() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        await setCouncilAccess({
          userId: member.id,
          title: presetId === "none" ? null : title,
          fullAccess,
          permissions: fullAccess || presetId === "none" ? [] : permissions,
        });
        setMessage(presetId === "none" ? "Council access removed." : "Council access saved.");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Update failed");
      }
    });
  }

  return (
    <article className="app-card overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-brand-line bg-brand-soft px-5 py-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-brand-navy">{member.name ?? member.email}</h2>
            {isSelf && <span className="text-xs text-brand-muted">(you)</span>}
            {member.role === "owner" && (
              <span className="border border-brand-gold bg-brand-panel px-2 py-0.5 text-xs font-semibold text-brand-navy">
                Full access
              </span>
            )}
            <span
              className={`border px-2 py-0.5 text-xs font-semibold ${
                member.roster_match
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              {member.roster_match ? "Roster verified" : "No exact roster email"}
            </span>
          </div>
          <p className="mt-1 text-sm text-brand-muted">{member.email}</p>
        </div>
        {member.delegated_at && (
          <p className="text-xs text-brand-muted">
            Last changed {new Date(member.delegated_at).toLocaleDateString()}
          </p>
        )}
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="font-semibold text-brand-navy">Council role</span>
            <select
              value={presetId}
              onChange={(event) => choosePreset(event.target.value as CouncilPresetId)}
              disabled={isPending || isLockedForRoster}
              className="app-input mt-1 w-full px-3 py-2"
            >
              {COUNCIL_PRESETS.map((preset) => (
                <option
                  key={preset.id}
                  value={preset.id}
                  disabled={isSelf && member.role === "owner" && !preset.fullAccess}
                >
                  {preset.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="font-semibold text-brand-navy">Displayed title</span>
            <input
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                if (!fullAccess && presetId !== "none") setPresetId("custom");
              }}
              disabled={isPending || isLockedForRoster || fullAccess || presetId === "none"}
              maxLength={80}
              className="app-input mt-1 w-full px-3 py-2"
              placeholder="Example: Academic Chair"
            />
          </label>

          <p className="text-xs leading-relaxed text-brand-muted">{selectedPreset.description}</p>
        </div>

        <fieldset disabled={isPending || isLockedForRoster || fullAccess || presetId === "none"}>
          <legend className="text-sm font-semibold text-brand-navy">Responsibilities</legend>
          <p className="mt-1 text-xs text-brand-muted">
            Check only the work this council member should be able to view and change.
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {ADMIN_PERMISSION_DEFINITIONS.map((permission) => (
              <label
                key={permission.id}
                className="flex items-start gap-3 border border-brand-line bg-brand-panel px-3 py-3 text-sm"
              >
                <input
                  type="checkbox"
                  checked={fullAccess || permissions.includes(permission.id)}
                  onChange={() => togglePermission(permission.id)}
                  className="mt-1"
                />
                <span>
                  <span className="font-semibold text-brand-navy">{permission.label}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-brand-muted">
                    {permission.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
          {fullAccess && (
            <p className="mt-3 border border-brand-gold bg-brand-soft px-3 py-2 text-sm text-brand-navy">
              President and Vice President automatically receive every responsibility, including
              permission to delegate council access.
            </p>
          )}
        </fieldset>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-brand-line px-5 py-4">
        <button
          type="button"
          onClick={save}
          disabled={isPending || isLockedForRoster}
          className="portal-button-primary px-5 py-2 text-sm disabled:opacity-50"
        >
          Save council access
        </button>
        {isLockedForRoster && (
          <p className="text-sm text-amber-800">
            Add this exact Google email to the roster before assigning any council role.
          </p>
        )}
        {message && <p className="text-sm text-emerald-700">{message}</p>}
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
    </article>
  );
}
