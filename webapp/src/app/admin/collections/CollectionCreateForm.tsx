"use client";

import { useState, useTransition } from "react";
import { createResourceCollection } from "@/app/admin/actions";
import { academicYearLabel, classLabel } from "@/lib/cohorts";

export function CollectionCreateForm() {
  const [id, setId] = useState("");
  const [label, setLabel] = useState("");
  const [shortLabel, setShortLabel] = useState("");
  const [graduationYear, setGraduationYear] = useState(2029);
  const [curriculumYear, setCurriculumYear] = useState(2);
  const [academicYearStart, setAcademicYearStart] = useState(2026);
  const [cumulativeAccess, setCumulativeAccess] = useState(true);
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const suggestedLabel = `${classLabel(graduationYear)} · D${curriculumYear} · ${academicYearLabel(academicYearStart)}`;

  function submit() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        await createResourceCollection({
          id,
          label: label || suggestedLabel,
          shortLabel: shortLabel || `${classLabel(graduationYear)} · D${curriculumYear}`,
          graduationYear,
          curriculumYear,
          academicYearStart,
          cumulativeAccess,
          description,
        });
        setId("");
        setLabel("");
        setShortLabel("");
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
        <h2 className="mt-1 font-semibold text-brand-navy">Create a permanent resource vintage</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Example: Class of 2029 · D2 · 2026–27. The label never changes even when the students
          become D3 or D4.
        </p>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="font-medium text-brand-navy">Graduating class</span>
          <input
            type="number"
            min={2000}
            max={2200}
            value={graduationYear}
            onChange={(event) => setGraduationYear(Number(event.target.value))}
            className="app-input mt-1 w-full px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-brand-navy">Resource D-year</span>
          <select
            value={curriculumYear}
            onChange={(event) => setCurriculumYear(Number(event.target.value))}
            className="app-input mt-1 w-full px-3 py-2"
          >
            {[1, 2, 3, 4].map((year) => (
              <option key={year} value={year}>
                D{year}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-brand-navy">Academic year starts</span>
          <input
            type="number"
            min={2000}
            max={2200}
            value={academicYearStart}
            onChange={(event) => setAcademicYearStart(Number(event.target.value))}
            className="app-input mt-1 w-full px-3 py-2"
          />
          <span className="mt-1 block text-xs text-brand-muted">
            {academicYearLabel(academicYearStart)}
          </span>
        </label>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-brand-navy">Collection ID</span>
          <input
            value={id}
            onChange={(event) => setId(event.target.value.toLowerCase())}
            placeholder="class-2029-d2-2026-2027"
            className="app-input mt-1 w-full px-3 py-2"
          />
          <span className="mt-1 block text-xs text-brand-muted">
            Leave blank to generate it from the permanent label.
          </span>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-brand-navy">Collection name</span>
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder={suggestedLabel}
            className="app-input mt-1 w-full px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-brand-navy">Short label</span>
          <input
            value={shortLabel}
            onChange={(event) => setShortLabel(event.target.value)}
            placeholder={`${classLabel(graduationYear)} · D${curriculumYear}`}
            className="app-input mt-1 w-full px-3 py-2"
          />
        </label>
        <label className="flex items-start gap-3 border border-brand-line bg-brand-soft px-3 py-3 text-sm">
          <input
            type="checkbox"
            checked={cumulativeAccess}
            onChange={(event) => setCumulativeAccess(event.target.checked)}
            className="mt-1"
          />
          <span>
            <span className="font-semibold text-brand-navy">Cumulative class access</span>
            <span className="mt-0.5 block text-xs text-brand-muted">
              Automatically available to this class once they reach this D-year.
            </span>
          </span>
        </label>
      </div>

      <label className="mt-4 block text-sm">
        <span className="font-medium text-brand-navy">Description</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder="Second-year resources for the Class of 2029."
          className="app-input mt-1 w-full px-3 py-2"
        />
      </label>

      <p className="portal-notice mt-4 p-3 text-sm">
        Cumulative access adds this set without removing D1 or other earlier resources. Turn it off
        only for admin previews or special manual collections.
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
