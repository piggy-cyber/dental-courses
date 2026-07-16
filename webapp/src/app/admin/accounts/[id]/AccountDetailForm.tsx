"use client";

import { useState, useTransition } from "react";
import {
  linkAccountToRoster,
  saveAdminNote,
  setAccountStatus,
  setResourceCollectionGrants,
  updateAccountProfile,
} from "@/app/admin/actions";
import {
  classLabel,
  cohortStandingLabel,
  collectionVintageLabel,
} from "@/lib/cohorts";
import type { AccountDetail, AdminResourceCollection, RosterMatch } from "./page";

const STATUS_STYLES: Record<AccountDetail["status"], string> = {
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  revoked: "border-rose-200 bg-rose-50 text-rose-700",
};

export function AccountDetailForm({
  account,
  roster,
  rosterOptions,
  isSelf,
  collections,
  automaticCollectionIds,
  manualGrantedCollectionIds,
}: {
  account: AccountDetail;
  roster: RosterMatch | null;
  rosterOptions: RosterMatch[];
  isSelf: boolean;
  collections: AdminResourceCollection[];
  automaticCollectionIds: string[];
  manualGrantedCollectionIds: string[];
}) {
  const [name, setName] = useState(account.name ?? "");
  const [username, setUsername] = useState(account.username ?? "");
  const [bio, setBio] = useState(account.bio ?? "");
  const [selectedRosterId, setSelectedRosterId] = useState(roster?.id ?? "");
  const [collectionIds, setCollectionIds] = useState(manualGrantedCollectionIds);
  const [adminNote, setAdminNote] = useState(account.admin_note ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const hasAllowedRosterLink =
    roster?.access_approved === true &&
    roster.status !== "withdrawn" &&
    roster.email?.toLowerCase() === account.email.toLowerCase();
  const automaticSet = new Set(automaticCollectionIds);
  const automaticCollections = collections.filter((collection) => automaticSet.has(collection.id));
  const additionalCollections = collections.filter((collection) => !automaticSet.has(collection.id));

  function toggleCollection(collectionId: string) {
    setCollectionIds((current) =>
      current.includes(collectionId)
        ? current.filter((item) => item !== collectionId)
        : [...current, collectionId]
    );
  }

  function save() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        await updateAccountProfile(account.id, { name, username, bio });
        await setResourceCollectionGrants(account.id, collectionIds);
        await saveAdminNote(account.id, adminNote);
        setMessage("Saved.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  function linkRoster() {
    if (!selectedRosterId) return;
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        await linkAccountToRoster(account.id, selectedRosterId);
        setMessage("Google account linked and approved.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Roster link failed");
      }
    });
  }

  function updateStatus(status: AccountDetail["status"]) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        await setAccountStatus(account.id, status);
        setMessage(`Status changed to ${status}.`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Status update failed");
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <section className="app-card space-y-5 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-brand-navy">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="app-input mt-1 w-full px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-brand-navy">Username</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="app-input mt-1 w-full px-3 py-2"
            />
          </label>
        </div>

        <label className="block text-sm">
          <span className="font-medium text-brand-navy">Bio</span>
          <textarea
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            rows={3}
            className="app-input mt-1 w-full px-3 py-2"
          />
        </label>

        <fieldset>
          <legend className="text-sm font-semibold text-brand-navy">
            Automatic cumulative access
          </legend>
          <p className="mt-1 text-sm text-brand-muted">
            This follows the linked graduating class and grows from D1 through the student&apos;s
            current standing. It does not depend on a council role.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {automaticCollections.map((collection) => (
              <div
                key={collection.id}
                className="border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm"
              >
                <p className="font-semibold text-brand-navy">{collectionVintageLabel(collection)}</p>
                <p className="mt-0.5 text-xs text-brand-muted">
                  {collection.description ?? collection.short_label}
                </p>
              </div>
            ))}
            {automaticCollections.length === 0 && (
              <p className="border border-brand-line bg-brand-soft px-3 py-3 text-sm text-brand-muted sm:col-span-2">
                No automatic collections yet. Link an allowed roster student, or create the next
                permanent resource vintage.
              </p>
            )}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold text-brand-navy">
            Additional collection access
          </legend>
          <p className="mt-1 text-sm text-brand-muted">
            Use these only as exceptions. They do not change the student&apos;s class or standing.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {additionalCollections.map((collection) => (
              <label
                key={collection.id}
                className="flex items-start gap-3 border border-brand-line bg-brand-panel px-3 py-3 text-sm"
              >
                <input
                  type="checkbox"
                  checked={collectionIds.includes(collection.id)}
                  onChange={() => toggleCollection(collection.id)}
                  className="mt-1"
                />
                <span>
                  <span className="font-semibold text-brand-navy">{collection.label}</span>
                  <span className="mt-0.5 block text-xs text-brand-muted">
                    {collection.description ?? collection.short_label}
                    {!collection.is_active ? " · inactive" : ""}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block text-sm">
          <span className="font-medium text-brand-navy">Private admin note</span>
          <textarea
            value={adminNote}
            onChange={(event) => setAdminNote(event.target.value)}
            rows={5}
            className="app-input mt-1 w-full px-3 py-2"
          />
        </label>

        {account.access_note && (
          <div className="border border-brand-line bg-brand-soft p-3 text-sm">
            <p className="font-medium text-brand-navy">Student access note</p>
            <p className="mt-1 text-brand-ink">{account.access_note}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="portal-button-primary px-5 py-2 text-sm disabled:opacity-60"
          >
            Save changes
          </button>
          {message && <p className="text-sm text-emerald-700">{message}</p>}
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>
      </section>

      <aside className="space-y-4">
        <section className="app-card p-5">
          <p className="text-sm font-semibold text-brand-navy">Roster identity</p>
          {roster ? (
            <div className="mt-3 border border-brand-line bg-brand-soft p-3 text-sm">
              <p className="font-semibold text-brand-navy">{roster.full_name}</p>
              <p className="mt-1 text-brand-ink">
                {cohortStandingLabel(roster.graduation_year)}
              </p>
              <p className="mt-1 text-xs text-brand-muted">
                {roster.access_approved ? "Allowed on roster" : "Roster access not allowed"}
              </p>
            </div>
          ) : (
            <>
              <p className="mt-2 text-sm text-brand-muted">
                Choose the prebuilt student record that owns this Google account. Only roster rows
                already marked Allowed appear here.
              </p>
              <select
                value={selectedRosterId}
                onChange={(event) => setSelectedRosterId(event.target.value)}
                className="app-input mt-3 w-full px-3 py-2 text-sm"
              >
                <option value="">Choose a roster student</option>
                {rosterOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.full_name} · {classLabel(option.graduation_year)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={linkRoster}
                disabled={isPending || !selectedRosterId}
                className="portal-button-primary mt-3 w-full px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                Link Google account
              </button>
            </>
          )}
        </section>

        <section className="app-card p-5">
          <p className="text-sm font-semibold text-brand-navy">Status</p>
          <span
            className={`mt-3 inline-flex border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[account.status]}`}
          >
            {account.status}
          </span>
          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={() => updateStatus("approved")}
              disabled={isPending || account.status === "approved" || !hasAllowedRosterLink}
              title={
                hasAllowedRosterLink
                  ? "Approve student"
                  : "Link an allowed roster student first"
              }
              className="portal-button-primary px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Approve
            </button>
            {!hasAllowedRosterLink && account.status !== "approved" && (
              <p className="border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
                Approval is locked until this Google account is linked to an allowed roster
                student.
              </p>
            )}
            <button
              type="button"
              onClick={() => updateStatus("pending")}
              disabled={isPending || isSelf || account.status === "pending"}
              className="border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700 disabled:opacity-50"
            >
              Set pending
            </button>
            <button
              type="button"
              onClick={() => updateStatus("revoked")}
              disabled={isPending || isSelf || account.status === "revoked"}
              className="border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 disabled:opacity-50"
            >
              Revoke
            </button>
          </div>
        </section>

        <section className="app-card p-5 text-sm">
          <p className="font-semibold text-brand-navy">Account</p>
          <dl className="mt-3 space-y-2 text-brand-muted">
            <div>
              <dt className="text-xs uppercase tracking-wide">Email</dt>
              <dd className="break-all text-brand-ink">{account.email}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide">Council role</dt>
              <dd className="text-brand-ink">
                {account.council_title ??
                  (account.role === "owner" ? "Full administrator" : "Student")}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide">Created</dt>
              <dd>{new Date(account.created_at).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide">Approved</dt>
              <dd>
                {account.approved_at
                  ? new Date(account.approved_at).toLocaleString()
                  : "Not approved"}
              </dd>
            </div>
          </dl>
        </section>
      </aside>
    </div>
  );
}
