"use client";

import { useRef, useState } from "react";
import {
  calculateGradeSummary,
  type GradeCalculatorPreset,
  type GradeEntry,
} from "@/lib/grade-calculator";

type CalculatorRow = {
  id: string;
  label: string;
  score: string;
  weight: string;
};

type GradeCalculatorProps = {
  preset: GradeCalculatorPreset | null;
  requestedCourseCode?: string;
};

const GENERIC_ROW_COUNT = 3;

function createInitialRows(preset: GradeCalculatorPreset | null): CalculatorRow[] {
  if (preset?.rows.length) {
    return preset.rows.map((row, index) => ({
      id: `preset-row-${index + 1}`,
      label: row.label,
      score: "",
      weight: String(row.weight),
    }));
  }

  return Array.from({ length: GENERIC_ROW_COUNT }, (_, index) => ({
    id: `generic-row-${index + 1}`,
    label: "",
    score: "",
    weight: "",
  }));
}

function parseOptionalNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatPercent(value: number | null, digits = 1): string {
  return value === null ? "—" : `${value.toFixed(digits)}%`;
}

export function GradeCalculator({
  preset,
  requestedCourseCode,
}: GradeCalculatorProps) {
  const [rows, setRows] = useState<CalculatorRow[]>(() => createInitialRows(preset));
  const [targetGrade, setTargetGrade] = useState("90");
  const nextRowNumber = useRef((preset?.rows.length ?? GENERIC_ROW_COUNT) + 1);

  const entries: GradeEntry[] = rows.map((row) => ({
    label: row.label,
    score: parseOptionalNumber(row.score),
    weight: parseOptionalNumber(row.weight),
  }));
  const parsedTarget = parseOptionalNumber(targetGrade);
  const targetIsValid =
    parsedTarget !== null && parsedTarget >= 0 && parsedTarget <= 100;
  const summary = calculateGradeSummary(entries, targetIsValid ? parsedTarget : 0);
  const invalidRowCount = rows.filter((row) => {
    const score = parseOptionalNumber(row.score);
    const weight = parseOptionalNumber(row.weight);
    const scoreIsInvalid = row.score.trim() !== "" && (score === null || score < 0);
    const weightIsInvalid =
      row.weight.trim() !== "" && (weight === null || weight <= 0);
    return scoreIsInvalid || weightIsInvalid;
  }).length;

  function updateRow(id: string, field: keyof Omit<CalculatorRow, "id">, value: string) {
    setRows((currentRows) =>
      currentRows.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  }

  function addRow() {
    const rowNumber = nextRowNumber.current;
    nextRowNumber.current += 1;
    setRows((currentRows) => [
      ...currentRows,
      {
        id: `added-row-${rowNumber}`,
        label: "",
        score: "",
        weight: "",
      },
    ]);
  }

  function removeRow(id: string) {
    setRows((currentRows) => currentRows.filter((row) => row.id !== id));
  }

  function clearScores() {
    setRows((currentRows) => currentRows.map((row) => ({ ...row, score: "" })));
  }

  function startOver() {
    setRows(createInitialRows(preset));
    setTargetGrade("90");
    nextRowNumber.current = (preset?.rows.length ?? GENERIC_ROW_COUNT) + 1;
  }

  function goalMessage() {
    if (!targetIsValid) {
      return {
        title: "Enter a target from 0 to 100",
        detail: "The goal planner will update as soon as the target is valid.",
      };
    }

    switch (summary.goalStatus) {
      case "empty":
        return {
          title: "Add your first score",
          detail: "Enter a score and its course weight to start the calculation.",
        };
      case "secured":
        return {
          title: `${parsedTarget.toFixed(1)}% is already secured`,
          detail: `You have banked ${summary.bankedPoints.toFixed(1)} course points before the remaining work.`,
        };
      case "reachable":
        return {
          title: `Need ${summary.requiredAverage?.toFixed(1)}% on the remaining work`,
          detail: `${summary.remainingWeight.toFixed(1)}% of the course remains to reach a ${parsedTarget.toFixed(1)}% final grade.`,
        };
      case "unreachable":
        return {
          title: "This target needs extra credit",
          detail: `A 100% average on the remaining work would finish at ${summary.maximumFinalGrade.toFixed(1)}%.`,
        };
      case "complete":
        return summary.bankedPoints >= parsedTarget
          ? {
              title: "Target reached",
              detail: `The entered work produces a ${summary.bankedPoints.toFixed(1)}% final grade.`,
            }
          : {
              title: "All course weight is accounted for",
              detail: `The entered work produces ${summary.bankedPoints.toFixed(1)}%, below the ${parsedTarget.toFixed(1)}% target.`,
            };
    }
  }

  const plan = goalMessage();
  const calculatorLabel = preset
    ? `${preset.courseCode} · ${preset.courseTitle}`
    : requestedCourseCode
      ? `${requestedCourseCode} · Generic setup`
      : "Generic course setup";

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.75fr)]">
      <section className="cockpit-panel overflow-hidden" aria-labelledby="grade-entries-heading">
        <div className="cockpit-section-bar flex items-center justify-between gap-3">
          <span id="grade-entries-heading">Grades and weights</span>
          <span className="normal-case tracking-normal text-brand-muted">
            {calculatorLabel}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="portal-table min-w-[760px] table-fixed">
            <thead>
              <tr>
                <th className="w-[34%]">Assignment or exam</th>
                <th className="w-[19%]">Score</th>
                <th className="w-[19%]">Weight</th>
                <th className="w-[16%]">Course points</th>
                <th className="w-[12%]"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const score = parseOptionalNumber(row.score);
                const weight = parseOptionalNumber(row.weight);
                const contribution =
                  score !== null && score >= 0 && weight !== null && weight > 0
                    ? (score * weight) / 100
                    : null;

                return (
                  <tr key={row.id}>
                    <td>
                      <label className="sr-only" htmlFor={`${row.id}-label`}>
                        Assignment or exam {index + 1}
                      </label>
                      <input
                        id={`${row.id}-label`}
                        className="app-input w-full px-3 py-2"
                        value={row.label}
                        placeholder={`Assignment ${index + 1}`}
                        onChange={(event) => updateRow(row.id, "label", event.target.value)}
                      />
                    </td>
                    <td>
                      <label className="sr-only" htmlFor={`${row.id}-score`}>
                        Score for {row.label || `assignment ${index + 1}`}
                      </label>
                      <div className="flex items-center">
                        <input
                          id={`${row.id}-score`}
                          className="app-input min-w-0 flex-1 px-3 py-2 text-right tabular-nums"
                          type="number"
                          min="0"
                          step="0.1"
                          inputMode="decimal"
                          value={row.score}
                          placeholder="0"
                          onChange={(event) => updateRow(row.id, "score", event.target.value)}
                        />
                        <span className="border-y border-r border-brand-line bg-brand-soft px-2 py-2 text-brand-muted">%</span>
                      </div>
                    </td>
                    <td>
                      <label className="sr-only" htmlFor={`${row.id}-weight`}>
                        Course weight for {row.label || `assignment ${index + 1}`}
                      </label>
                      <div className="flex items-center">
                        <input
                          id={`${row.id}-weight`}
                          className="app-input min-w-0 flex-1 px-3 py-2 text-right tabular-nums"
                          type="number"
                          min="0.1"
                          step="0.1"
                          inputMode="decimal"
                          value={row.weight}
                          placeholder="0"
                          onChange={(event) => updateRow(row.id, "weight", event.target.value)}
                        />
                        <span className="border-y border-r border-brand-line bg-brand-soft px-2 py-2 text-brand-muted">%</span>
                      </div>
                    </td>
                    <td className="cockpit-gauge text-right font-semibold text-brand-navy">
                      {formatPercent(contribution)}
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="portal-button px-2.5 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                        onClick={() => removeRow(row.id)}
                        disabled={rows.length === 1}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-line bg-brand-soft p-3">
          <button type="button" className="portal-button-primary px-4 py-2" onClick={addRow}>
            Add row
          </button>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="portal-button px-3 py-2" onClick={clearScores}>
              Clear scores
            </button>
            <button type="button" className="portal-button px-3 py-2" onClick={startOver}>
              Start over
            </button>
          </div>
        </div>

        {(invalidRowCount > 0 || summary.plannedWeight > 100) && (
          <div className="border-t border-brand-line bg-brand-panel p-3 text-sm text-brand-muted" role="status">
            {invalidRowCount > 0 && (
              <p>Use a score of 0 or higher and a weight greater than 0.</p>
            )}
            {summary.plannedWeight > 100 && (
              <p>
                The listed weights total {summary.plannedWeight.toFixed(1)}%. Check the course breakdown before relying on the result.
              </p>
            )}
          </div>
        )}
      </section>

      <aside className="space-y-4 xl:sticky xl:top-20" aria-label="Grade results">
        <section className="cockpit-panel overflow-hidden">
          <div className="cockpit-section-bar">Current calculation</div>
          <div className="grid grid-cols-2 gap-px bg-brand-line">
            <ResultMetric
              label="Current grade"
              value={formatPercent(summary.currentGrade)}
              detail="Average on completed work"
            />
            <ResultMetric
              label="Course points"
              value={formatPercent(summary.bankedPoints)}
              detail="Already banked toward 100"
            />
            <ResultMetric
              label="Completed weight"
              value={formatPercent(summary.completedWeight)}
              detail="Rows with scores"
            />
            <ResultMetric
              label="Remaining weight"
              value={formatPercent(summary.remainingWeight)}
              detail="Still available"
            />
          </div>
        </section>

        <section className="cockpit-panel overflow-hidden">
          <div className="cockpit-section-bar">Final grade goal</div>
          <div className="space-y-4 p-4">
            <label className="block" htmlFor="target-grade">
              <span className="mb-1 block text-xs font-bold uppercase text-brand-navy">
                Target final grade
              </span>
              <div className="flex max-w-44 items-center">
                <input
                  id="target-grade"
                  className="app-input min-w-0 flex-1 px-3 py-2 text-right text-lg font-bold tabular-nums"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  inputMode="decimal"
                  value={targetGrade}
                  onChange={(event) => setTargetGrade(event.target.value)}
                />
                <span className="border-y border-r border-brand-line bg-brand-soft px-3 py-2 text-lg text-brand-muted">%</span>
              </div>
            </label>

            <div className="border-l-4 border-brand-blue bg-brand-soft p-3" aria-live="polite">
              <p className="font-bold text-brand-navy">{plan.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-brand-muted">{plan.detail}</p>
            </div>

            <p className="text-xs leading-relaxed text-brand-muted">
              The calculator updates as you type. Blank-score rows count as future work once their weight is entered.
            </p>
          </div>
        </section>
      </aside>
    </div>
  );
}

function ResultMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="bg-brand-panel p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-brand-muted">{label}</p>
      <p className="cockpit-gauge-value mt-1 text-2xl">{value}</p>
      <p className="mt-1 text-[11px] text-brand-muted">{detail}</p>
    </div>
  );
}
