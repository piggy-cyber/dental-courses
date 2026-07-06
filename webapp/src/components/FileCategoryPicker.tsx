"use client";

import type { AssignTarget } from "@/lib/resource-kinds";
import {
  ESSENTIAL_SLOT_LABELS,
  SUPPLEMENTAL_LABELS,
  type EssentialSlot,
  type SupplementalCategory,
} from "@/lib/resource-kinds";

type LectureOption = { id: string; title: string };

type Props = {
  value: string;
  onChange: (target: AssignTarget) => void;
  lectures: LectureOption[];
  disabled?: boolean;
};

export function FileCategoryPicker({ value, onChange, lectures, disabled }: Props) {
  function parseValue(raw: string): void {
    if (!raw) return;
    if (raw.startsWith("essential:")) {
      onChange({ type: "essential", slot: raw.replace("essential:", "") as EssentialSlot });
      return;
    }
    if (raw.startsWith("lecture:")) {
      const [, lectureId, role] = raw.split(":");
      onChange({
        type: "lecture",
        lectureId,
        role: role as "slides" | "transcript_file" | "other",
      });
      return;
    }
    if (raw.startsWith("supplemental:")) {
      onChange({
        type: "supplemental",
        category: raw.replace("supplemental:", "") as SupplementalCategory,
      });
    }
  }

  return (
    <select
      className="app-input text-sm"
      value={value}
      disabled={disabled}
      onChange={(e) => parseValue(e.target.value)}
    >
      <option value="">Assign to…</option>
      <optgroup label="Essentials">
        {(Object.keys(ESSENTIAL_SLOT_LABELS) as EssentialSlot[]).map((slot) => (
          <option key={slot} value={`essential:${slot}`}>
            {ESSENTIAL_SLOT_LABELS[slot]}
          </option>
        ))}
      </optgroup>
      <optgroup label="Lectures">
        {lectures.flatMap((lecture) => [
          <option key={`${lecture.id}-slides`} value={`lecture:${lecture.id}:slides`}>
            {lecture.title} · Slides
          </option>,
          <option key={`${lecture.id}-transcript`} value={`lecture:${lecture.id}:transcript_file`}>
            {lecture.title} · Transcript file
          </option>,
          <option key={`${lecture.id}-other`} value={`lecture:${lecture.id}:other`}>
            {lecture.title} · Other file
          </option>,
        ])}
      </optgroup>
      <optgroup label="Labs and extras">
        {(Object.keys(SUPPLEMENTAL_LABELS) as SupplementalCategory[]).map((cat) => (
          <option key={cat} value={`supplemental:${cat}`}>
            {SUPPLEMENTAL_LABELS[cat]}
          </option>
        ))}
      </optgroup>
    </select>
  );
}
