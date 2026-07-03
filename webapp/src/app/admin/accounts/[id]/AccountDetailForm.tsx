"use client";

import { useState, useTransition } from "react";
import {
  saveAdminNote,
  setResourceCollectionGrants,
  setAccessTiers,
  setAccountStatus,
  updateAccountProfile,
} from "@/app/admin/actions";
import { ACCESS_TIERS, tierLabel } from "@/lib/tiers";
import type { AccountDetail, AdminResourceCollection, RosterMatch } from "./page";

const STATUS_STYLES: Record<AccountDetail["status"], string> = {
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  revoked: "border-rose-200 bg-rose-50 text-rose-700",
};

export function AccountDetailForm({
  account,
  roster,
  isSelf,
  collections,
  grantedCollectionIds,
}: {
  account: AccountDetail;
  roster: RosterMatch | null;
  isSelf: boolean;
  collections: AdminResourceCollection[];
  grantedCollectionIds: string[];
}) {
  const [name, setName] = useState(account.name ?? "");
  const [username, setUsername] = useState(account.username ?? "");
  const [bio, setBio] = useState(account.bio ?? "");
  const [tiers, setTiers] = useState(account.access_tiers);
  const [collectionIds, setCollectionIds] = useState(grantedCollectionIds);
  const [adminNote, setAdminNote] = useState(account.admin_note ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleTier(tier: string) {
    setTiers((current) =>
      current.includes(tier) ? current.filter((item) => item !== tier) : [...current, tier]
    );
  }

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
        await setAccessTiers(account.id, tiers);
        await setResourceCollectionGrants(account.id, collectionIds);
        await saveAdminNote(account.id, adminNote);
        setMessage("Saved.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
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
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="space-y-5 rounded-xl border border-brand-line bg-brand-panel p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-brand-navy">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-lg border border-brand-line px-3 py-2 text-brand-ink"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-brand-navy">Username</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-1 w-full rounded-lg border border-brand-line px-3 py-2 text-brand-ink"
            />
          </label>
        </div>

        <label className="block text-sm">
          <span className="font-medium text-brand-navy">Bio</span>
          <textarea
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-brand-line px-3 py-2 text-brand-ink"
          />
        </label>

        <fieldset>
          <legend className="text-sm font-medium text-brand-navy">Resource collection access</legend>
          <p className="mt-1 text-sm text-brand-muted">
            These grants control what appears on the student&apos;s homepage and library.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {collections.map((collection) => (
              <label
                key={collection.id}
                className="flex items-start gap-3 rounded-lg border border-brand-line px-3 py-3 text-sm"
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
          {collections.length === 0 && (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              No resource collections exist yet. Run the resource collection migration.
            </p>
          )}
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium text-brand-navy">Year tags</legend>
          <p className="mt-1 text-sm text-brand-muted">
            These labels help with roster defaults. Resource collections above control course access.
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-4">
            {ACCESS_TIERS.map((tier) => (
              <label
                key={tier}
                className="flex items-center gap-2 rounded-lg border border-brand-line px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={tiers.includes(tier)}
                  onChange={() => toggleTier(tier)}
                />
                <span>{tierLabel(tier)}</span>
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
            className="mt-1 w-full rounded-lg border border-brand-line px-3 py-2 text-brand-ink"
          />
        </label>

        {account.access_note && (
          <div className="rounded-lg border border-brand-line bg-brand-soft p-3 text-sm">
            <p className="font-medium text-brand-navy">Student access note</p>
            <p className="mt-1 text-brand-ink">{account.access_note}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="rounded-full bg-brand-navy px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Save changes
          </button>
          {message && <p className="text-sm text-emerald-700">{message}</p>}
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>
      </section>

      <aside className="space-y-4">
        <section className="rounded-xl border border-brand-line bg-brand-panel p-5">
          <p className="text-sm font-semibold text-brand-navy">Status</p>
          <span
            className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[account.status]}`}
          >
            {account.status}
          </span>
          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={() => updateStatus("approved")}
              disabled={isPending || account.status === "approved"}
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => updateStatus("pending")}
              disabled={isPending || isSelf || account.status === "pending"}
              className="rounded-full border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700 disabled:opacity-50"
            >
              Set pending
            </button>
            <button
              type="button"
              onClick={() => updateStatus("revoked")}
              disabled={isPending || isSelf || account.status === "revoked"}
              className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 disabled:opacity-50"
            >
              Revoke
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-brand-line bg-brand-panel p-5 text-sm">
          <p className="font-semibold text-brand-navy">Account</p>
          <dl className="mt-3 space-y-2 text-brand-muted">
            <div>
              <dt className="text-xs uppercase tracking-wide">Email</dt>
              <dd className="text-brand-ink">{account.email}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide">Created</dt>
              <dd>{new Date(account.created_at).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide">Approved</dt>
              <dd>{account.approved_at ? new Date(account.approved_at).toLocaleString() : "Not approved"}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-brand-line bg-brand-panel p-5 text-sm">
          <p className="font-semibold text-brand-navy">Roster match</p>
          {roster ? (
            <dl className="mt-3 space-y-2 text-brand-muted">
              <div>
                <dt className="text-xs uppercase tracking-wide">Name</dt>
                <dd className="text-brand-ink">{roster.full_name}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide">Cohort</dt>
                <dd>{roster.cohort.toUpperCase()}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide">Roster status</dt>
                <dd>{roster.status}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-2 text-brand-muted">No roster match.</p>
          )}
        </section>
      </aside>
    </div>
  );
}
