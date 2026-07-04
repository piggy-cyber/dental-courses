"use client";

import { useState, useTransition } from "react";
import { createResourceCollection } from "@/app/admin/actions";

export function CollectionCreateForm() {
  const [id, setId] = useState("");
  const [label, setLabel] = useState("");
  const [shortLabel, setShortLabel] = useState("");
  const [sourceTier, setSourceTier] = useState("");
  const [sourceCohort, setSourceCohort] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        await createResourceCollection({
          id,
          label,
          shortLabel,
          sourceTier,
          sourceCohort,
          description,
          defaultForTier: false,
        });
        setId("");
        setLabel("");
        setShortLabel("");
        setSourceTier("");
        setSourceCohort("");
        setDescription("");
        setMessage("Collection created.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not create collection.");
      }
    });
  }

  return (
    <section className="app-card p-5">
      <div>
        <p className="eyebrow">New collection</p>
        <h2 className="mt-1 font-semibold text-brand-navy">Create a resource set</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Use this for separate bundles like your D1 year, prior D2 resources, or a clinical set.
        </p>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-brand-navy">Collection ID</span>
          <input
            value={id}
            onChange={(event) => setId(event.target.value.toLowerCase())}
            placeholder="d2-2024-2025"
            className="app-input mt-1 w-full px-3 py-2"
          />
          <span className="mt-1 block text-xs text-brand-muted">
            Lowercase letters, numbers, and hyphens. Leave blank to generate from the name.
          </span>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-brand-navy">Collection name</span>
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="D2 2024-2025 Resources"
            className="app-input mt-1 w-full px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-brand-navy">Short label</span>
          <input
            value={shortLabel}
            onChange={(event) => setShortLabel(event.target.value)}
            placeholder="Prior D2 Resources"
            className="app-input mt-1 w-full px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-brand-navy">Source tier</span>
          <select
            value={sourceTier}
            onChange={(event) => setSourceTier(event.target.value)}
            className="app-input mt-1 w-full px-3 py-2"
          >
            <option value="">No tier</option>
            <option value="d1">D1</option>
            <option value="d2">D2</option>
            <option value="d3">D3</option>
            <option value="d4">D4</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-brand-navy">Source cohort</span>
          <input
            value={sourceCohort}
            onChange={(event) => setSourceCohort(event.target.value)}
            placeholder="d2-2024"
            className="app-input mt-1 w-full px-3 py-2"
          />
        </label>
      </div>

      <label className="mt-4 block text-sm">
        <span className="font-medium text-brand-navy">Description</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder="Resource bundle imported from last year's D2 class."
          className="app-input mt-1 w-full px-3 py-2"
        />
      </label>

      <p className="portal-notice mt-4 p-3 text-sm">
        New collections are manual-grant by default. Assign them from an account detail page after
        import.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="portal-button-primary px-5 py-2 text-sm disabled:opacity-60"
        >
          {isPending ? "Creating..." : "Create collection"}
        </button>
        {message && <p className="text-sm text-emerald-700">{message}</p>}
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
    </section>
  );
}
